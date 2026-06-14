// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AutomationCompatibleInterface} from "./interfaces/AutomationCompatibleInterface.sol";
import {ILendingAdapter} from "./adapters/ILendingAdapter.sol";

/// @title CheckRegistry
/// @notice On-chain post-dated cheque ("çek") system. Each cheque is an ERC-721 token whose holder
///         is the payee/creditor. The drawer funds the cheque at creation; the principal is supplied
///         into a whitelisted lending adapter so the deposit cannot bounce. The principal is paid to
///         the holder at maturity and accrued yield goes to the drawer.
/// @dev Adapter abstraction supports both instant ERC-4626 vaults (Aave/Sky) and cooldown staking
///      vaults (Brix wiTRY → 3-day silo). For cooldown vaults the redemption is started ahead of
///      maturity (`prepareRedeem`) so funds are claimable exactly at maturity (`settle`). A Chainlink
///      Automation keeper drives both steps; manual calls also work. Endorsement = ERC-721 transfer.
contract CheckRegistry is ERC721, Ownable2Step, Pausable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    struct Check {
        address drawer; // keşideci — receives the yield
        address stablecoin; // denomination token (iTRY/USDC/USDT)
        address adapter; // ILendingAdapter holding the position
        uint256 principal; // cheque amount guaranteed to the holder
        uint256 shares; // adapter shares held for this cheque
        uint256 redeemTicket; // adapter redemption ticket (0 until redemption started)
        uint64 createdAt;
        uint64 maturity; // vade tarihi
        uint64 claimableAt; // when completeRedeem is allowed (set on prepareRedeem)
        bool redeemStarted;
        bool settled;
    }

    enum Action {
        None,
        Prepare,
        Settle
    }

    struct Listing {
        address seller;
        uint256 price; // in the cheque's stablecoin
    }

    mapping(uint256 => Check) public checks;
    /// @dev stablecoin => adapter => allowed (owner-curated, low-risk adapters only).
    mapping(address => mapping(address => bool)) public approvedAdapter;
    /// @dev checkId => secondary-market listing (early sale / "kırdırma").
    mapping(uint256 => Listing) public listings;

    uint256[] private _activeIds;
    mapping(uint256 => uint256) private _activeIndexPlusOne;

    uint256 public nextId = 1;
    uint256 public constant MAX_BATCH = 20;

    // --- Fees (basis points; principal is never touched) ---
    address public treasury;
    uint16 public perfFeeBps = 1000; // 10% of yield to the protocol
    uint16 public createFeeBps = 10; // 0.1% of principal at creation (paid on top by drawer)
    uint16 public saleFeeBps = 50; // 0.5% of secondary-sale price
    uint16 public constant MAX_PERF_FEE_BPS = 2000; // 20% cap
    uint16 public constant MAX_CREATE_FEE_BPS = 100; // 1% cap
    uint16 public constant MAX_SALE_FEE_BPS = 200; // 2% cap

    event AdapterSet(address indexed stablecoin, address indexed adapter, bool allowed);
    event CheckCreated(
        uint256 indexed checkId,
        address indexed drawer,
        address indexed payee,
        address stablecoin,
        address adapter,
        uint256 principal,
        uint64 maturity
    );
    event Endorsed(uint256 indexed checkId, address indexed from, address indexed to);
    event RedeemStarted(uint256 indexed checkId, uint256 ticket, uint64 claimableAt);
    event Settled(
        uint256 indexed checkId, address indexed payee, uint256 toPayee, address drawer, uint256 toDrawer, uint256 fee
    );
    event Listed(uint256 indexed checkId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed checkId);
    event Sold(uint256 indexed checkId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event FeesUpdated(uint16 perfFeeBps, uint16 createFeeBps, uint16 saleFeeBps, address treasury);

    error ZeroAddress();
    error ZeroAmount();
    error MaturityTooSoon();
    error AdapterNotApproved();
    error AdapterAssetMismatch();
    error UnknownCheck();
    error AlreadySettled();
    error NotMatured();
    error RedeemNotReady();
    error AlreadyStarted();
    error TooEarlyToPrepare();
    error FeeTooHigh();
    error NotHolder();
    error NotListed();

    constructor(address initialOwner) ERC721("OnChain Check", "CHK") Ownable(initialOwner) {
        treasury = initialOwner;
    }

    // --------------------------------------------------------------------- admin
    function setVault(address stablecoin, address adapter, bool allowed) external onlyOwner {
        if (stablecoin == address(0) || adapter == address(0)) revert ZeroAddress();
        if (allowed && ILendingAdapter(adapter).asset() != stablecoin) revert AdapterAssetMismatch();
        approvedAdapter[stablecoin][adapter] = allowed;
        emit AdapterSet(stablecoin, adapter, allowed);
    }

    function setFees(uint16 perfFeeBps_, uint16 createFeeBps_, uint16 saleFeeBps_, address treasury_)
        external
        onlyOwner
    {
        if (perfFeeBps_ > MAX_PERF_FEE_BPS || createFeeBps_ > MAX_CREATE_FEE_BPS || saleFeeBps_ > MAX_SALE_FEE_BPS) {
            revert FeeTooHigh();
        }
        if (treasury_ == address(0)) revert ZeroAddress();
        perfFeeBps = perfFeeBps_;
        createFeeBps = createFeeBps_;
        saleFeeBps = saleFeeBps_;
        treasury = treasury_;
        emit FeesUpdated(perfFeeBps_, createFeeBps_, saleFeeBps_, treasury_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --------------------------------------------------------------------- create
    /// @notice Create a cheque, lock `amount` of `stablecoin` via `adapter`, mint the NFT to `payee`.
    function createCheck(address payee, address stablecoin, address adapter, uint256 amount, uint64 maturity)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 checkId)
    {
        if (payee == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!approvedAdapter[stablecoin][adapter]) revert AdapterNotApproved();
        // Must leave enough time to complete any redemption cooldown before maturity.
        uint256 cd = ILendingAdapter(adapter).cooldown();
        if (maturity <= block.timestamp + cd) revert MaturityTooSoon();

        // Creation fee (0.1%) is paid by the drawer on top of the principal — principal is deposited in full.
        uint256 createFee = (amount * createFeeBps) / 10_000;
        if (createFee > 0) IERC20(stablecoin).safeTransferFrom(msg.sender, treasury, createFee);

        // Move the full principal to the adapter and deposit.
        IERC20(stablecoin).safeTransferFrom(msg.sender, adapter, amount);
        uint256 shares = ILendingAdapter(adapter).deposit(amount);

        checkId = nextId++;
        checks[checkId] = Check({
            drawer: msg.sender,
            stablecoin: stablecoin,
            adapter: adapter,
            principal: amount,
            shares: shares,
            redeemTicket: 0,
            createdAt: uint64(block.timestamp),
            maturity: maturity,
            claimableAt: 0,
            redeemStarted: false,
            settled: false
        });
        _addActive(checkId);
        _safeMint(payee, checkId);

        emit CheckCreated(checkId, msg.sender, payee, stablecoin, adapter, amount, maturity);
    }

    // --------------------------------------------------------------------- redemption
    /// @notice Start the redemption (unstake) ahead of maturity so funds are ready on time.
    ///         Only meaningful for cooldown adapters; callable from `maturity - cooldown` onward.
    function prepareRedeem(uint256 checkId) public nonReentrant {
        Check storage c = checks[checkId];
        if (c.drawer == address(0)) revert UnknownCheck();
        if (c.settled) revert AlreadySettled();
        if (c.redeemStarted) revert AlreadyStarted();
        uint256 cd = ILendingAdapter(c.adapter).cooldown();
        // Don't start too early: only within the cooldown window before maturity.
        if (block.timestamp + cd < c.maturity) revert TooEarlyToPrepare();

        (uint256 ticket, uint256 claimableAt) = ILendingAdapter(c.adapter).startRedeem(c.shares);
        c.redeemStarted = true;
        c.redeemTicket = ticket;
        c.claimableAt = uint64(claimableAt);
        emit RedeemStarted(checkId, ticket, uint64(claimableAt));
    }

    /// @notice Settle a matured cheque: principal to the holder, remaining yield to the drawer.
    ///         Anyone may call. For cooldown adapters, `prepareRedeem` must have run and the cooldown
    ///         must have elapsed; for instant adapters this redeems in-line.
    function settle(uint256 checkId) public nonReentrant {
        _settle(checkId);
    }

    function _settle(uint256 checkId) internal {
        Check storage c = checks[checkId];
        if (c.drawer == address(0)) revert UnknownCheck();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.maturity) revert NotMatured();

        uint256 cd = ILendingAdapter(c.adapter).cooldown();
        if (!c.redeemStarted) {
            if (cd != 0) revert RedeemNotReady(); // cooldown vaults must be prepared first
            (uint256 ticket, uint256 claimableAt) = ILendingAdapter(c.adapter).startRedeem(c.shares);
            c.redeemStarted = true;
            c.redeemTicket = ticket;
            c.claimableAt = uint64(claimableAt);
        }
        if (block.timestamp < c.claimableAt) revert RedeemNotReady();

        // Effects before payout.
        c.settled = true;
        _removeActive(checkId);
        address payee = ownerOf(checkId);
        _burn(checkId);

        uint256 redeemed = ILendingAdapter(c.adapter).completeRedeem(c.redeemTicket, address(this));
        // Holder is always made whole on principal first; only the yield is fee-bearing.
        uint256 toPayee = redeemed >= c.principal ? c.principal : redeemed;
        uint256 yieldAmt = redeemed - toPayee;
        uint256 fee = (yieldAmt * perfFeeBps) / 10_000;
        uint256 toDrawer = yieldAmt - fee;

        IERC20(c.stablecoin).safeTransfer(payee, toPayee);
        if (toDrawer > 0) IERC20(c.stablecoin).safeTransfer(c.drawer, toDrawer);
        if (fee > 0) IERC20(c.stablecoin).safeTransfer(treasury, fee);

        emit Settled(checkId, payee, toPayee, c.drawer, toDrawer, fee);
    }

    // --------------------------------------------------------------------- automation
    function _actionFor(uint256 id) internal view returns (Action) {
        Check storage c = checks[id];
        if (c.drawer == address(0) || c.settled) return Action.None;
        uint256 cd = ILendingAdapter(c.adapter).cooldown();
        // Ready to settle?
        if (block.timestamp >= c.maturity) {
            if (cd == 0) return Action.Settle;
            if (c.redeemStarted && block.timestamp >= c.claimableAt) return Action.Settle;
        }
        // Ready to start cooldown redemption?
        if (cd != 0 && !c.redeemStarted && block.timestamp + cd >= c.maturity) return Action.Prepare;
        return Action.None;
    }

    /// @inheritdoc AutomationCompatibleInterface
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 len = _activeIds.length;
        uint256[] memory due = new uint256[](len < MAX_BATCH ? len : MAX_BATCH);
        uint256 count;
        for (uint256 i; i < len && count < MAX_BATCH; ++i) {
            if (_actionFor(_activeIds[i]) != Action.None) due[count++] = _activeIds[i];
        }
        if (count == 0) return (false, bytes(""));
        uint256[] memory ids = new uint256[](count);
        for (uint256 i; i < count; ++i) ids[i] = due[i];
        return (true, abi.encode(ids));
    }

    /// @inheritdoc AutomationCompatibleInterface
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory ids = abi.decode(performData, (uint256[]));
        for (uint256 i; i < ids.length; ++i) {
            Action a = _actionFor(ids[i]);
            if (a == Action.Prepare) prepareRedeem(ids[i]);
            else if (a == Action.Settle) _settle(ids[i]);
        }
    }

    // --------------------------------------------------------------------- views
    function accruedYield(uint256 checkId) external view returns (uint256) {
        Check storage c = checks[checkId];
        if (c.drawer == address(0) || c.settled || c.redeemStarted) return 0;
        uint256 value = ILendingAdapter(c.adapter).currentAssets(c.shares);
        return value > c.principal ? value - c.principal : 0;
    }

    function currentValue(uint256 checkId) external view returns (uint256) {
        Check storage c = checks[checkId];
        if (c.drawer == address(0) || c.settled || c.redeemStarted) return c.settled ? 0 : c.principal;
        return ILendingAdapter(c.adapter).currentAssets(c.shares);
    }

    function getCheck(uint256 checkId) external view returns (Check memory) {
        return checks[checkId];
    }

    function activeCheckIds() external view returns (uint256[] memory) {
        return _activeIds;
    }

    // --------------------------------------------------------------- secondary market (kırdırma)
    /// @notice List a cheque for early sale (factoring alternative). Holder only.
    function listForSale(uint256 checkId, uint256 price) external {
        if (ownerOf(checkId) != msg.sender) revert NotHolder();
        if (checks[checkId].settled) revert AlreadySettled();
        if (price == 0) revert ZeroAmount();
        listings[checkId] = Listing({seller: msg.sender, price: price});
        emit Listed(checkId, msg.sender, price);
    }

    function cancelListing(uint256 checkId) external {
        if (listings[checkId].seller != msg.sender) revert NotHolder();
        delete listings[checkId];
        emit ListingCancelled(checkId);
    }

    /// @notice Buy a listed cheque: buyer pays `price` in the cheque's stablecoin; a sale fee goes to
    ///         the treasury, the rest to the seller, and the cheque NFT transfers to the buyer.
    function buy(uint256 checkId) external nonReentrant {
        Listing memory l = listings[checkId];
        if (l.price == 0) revert NotListed();
        Check storage c = checks[checkId];
        if (c.settled) revert AlreadySettled();
        if (ownerOf(checkId) != l.seller) revert NotListed(); // stale listing

        uint256 fee = (l.price * saleFeeBps) / 10_000;
        uint256 toSeller = l.price - fee;
        delete listings[checkId];

        IERC20(c.stablecoin).safeTransferFrom(msg.sender, l.seller, toSeller);
        if (fee > 0) IERC20(c.stablecoin).safeTransferFrom(msg.sender, treasury, fee);
        _transfer(l.seller, msg.sender, checkId);

        emit Sold(checkId, l.seller, msg.sender, l.price, fee);
    }

    // --------------------------------------------------------------------- endorsement
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0)) {
            if (listings[tokenId].price != 0) delete listings[tokenId]; // clear stale listing on move/burn
            if (to != address(0)) emit Endorsed(tokenId, from, to);
        }
        return from;
    }

    // --------------------------------------------------------------------- active set
    function _addActive(uint256 checkId) private {
        _activeIds.push(checkId);
        _activeIndexPlusOne[checkId] = _activeIds.length;
    }

    function _removeActive(uint256 checkId) private {
        uint256 idxPlusOne = _activeIndexPlusOne[checkId];
        if (idxPlusOne == 0) return;
        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = _activeIds.length - 1;
        if (idx != lastIdx) {
            uint256 lastId = _activeIds[lastIdx];
            _activeIds[idx] = lastId;
            _activeIndexPlusOne[lastId] = idx + 1;
        }
        _activeIds.pop();
        delete _activeIndexPlusOne[checkId];
    }
}
