// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AutomationCompatibleInterface} from "./interfaces/AutomationCompatibleInterface.sol";

/// @title CheckRegistry
/// @notice On-chain post-dated cheque ("çek") system. Each cheque is an ERC-721 token whose
///         current holder is the payee/creditor. The drawer ("keşideci") funds the cheque at
///         creation; the principal is supplied into a whitelisted ERC-4626 yield vault so the
///         deposit cannot bounce. At maturity the principal is paid to the current holder and any
///         accrued yield is paid to the drawer.
/// @dev Endorsement ("ciro") is simply an ERC-721 transfer — the holder can endorse to anyone
///      without asking the drawer. Maturity settlement can be triggered manually (pull) or by a
///      Chainlink Automation keeper (push).
contract CheckRegistry is ERC721, Ownable2Step, Pausable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    struct Check {
        address drawer; // keşideci — receives the yield
        address stablecoin; // ERC-20 the cheque is denominated in
        address vault; // ERC-4626 vault holding the funds
        uint256 principal; // cheque amount guaranteed to the payee
        uint256 shares; // vault shares held for this cheque
        uint64 createdAt;
        uint64 maturity; // vade tarihi
        bool settled;
    }

    /// @dev checkId => cheque data. tokenId == checkId.
    mapping(uint256 => Check) public checks;

    /// @dev stablecoin => vault => allowed. Only owner-curated, low-risk vaults are enabled.
    mapping(address => mapping(address => bool)) public approvedVault;

    /// @dev Unsettled, matured-or-pending cheque ids, used by Automation enumeration.
    uint256[] private _activeIds;
    mapping(uint256 => uint256) private _activeIndexPlusOne;

    uint256 public nextId = 1;

    /// @dev Upper bound on how many active cheques performUpkeep settles in one call.
    uint256 public constant MAX_SETTLE_BATCH = 20;

    event VaultSet(address indexed stablecoin, address indexed vault, bool allowed);
    event CheckCreated(
        uint256 indexed checkId,
        address indexed drawer,
        address indexed payee,
        address stablecoin,
        address vault,
        uint256 principal,
        uint64 maturity
    );
    event Endorsed(uint256 indexed checkId, address indexed from, address indexed to);
    event Settled(uint256 indexed checkId, address indexed payee, uint256 toPayee, address drawer, uint256 toDrawer);

    error ZeroAddress();
    error ZeroAmount();
    error MaturityInPast();
    error VaultNotApproved();
    error VaultAssetMismatch();
    error UnknownCheck();
    error AlreadySettled();
    error NotMatured();

    constructor(address initialOwner) ERC721("OnChain Check", "CHK") Ownable(initialOwner) {}

    // ---------------------------------------------------------------------
    // Admin: vault whitelist (only safe, low-risk ERC-4626 vaults)
    // ---------------------------------------------------------------------

    /// @notice Enable or disable an ERC-4626 vault for a given stablecoin.
    /// @dev When enabling, the vault's underlying asset must equal `stablecoin`.
    function setVault(address stablecoin, address vault, bool allowed) external onlyOwner {
        if (stablecoin == address(0) || vault == address(0)) revert ZeroAddress();
        if (allowed && IERC4626(vault).asset() != stablecoin) revert VaultAssetMismatch();
        approvedVault[stablecoin][vault] = allowed;
        emit VaultSet(stablecoin, vault, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Drawer: create a cheque
    // ---------------------------------------------------------------------

    /// @notice Create a cheque, lock `amount` of `stablecoin` into `vault`, and mint the cheque
    ///         NFT to `payee`. Caller is the drawer and will receive the accrued yield at maturity.
    /// @param payee initial creditor / holder of the cheque
    /// @param stablecoin denomination token (must be approved with `vault`)
    /// @param vault whitelisted ERC-4626 yield vault
    /// @param amount cheque principal (in stablecoin units)
    /// @param maturity unix timestamp when the principal becomes claimable by the holder
    /// @return checkId the id of the newly minted cheque
    function createCheck(address payee, address stablecoin, address vault, uint256 amount, uint64 maturity)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 checkId)
    {
        if (payee == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (maturity <= block.timestamp) revert MaturityInPast();
        if (!approvedVault[stablecoin][vault]) revert VaultNotApproved();

        // Pull funds from the drawer and supply them to the yield vault.
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(stablecoin).forceApprove(vault, amount);
        uint256 shares = IERC4626(vault).deposit(amount, address(this));

        checkId = nextId++;
        checks[checkId] = Check({
            drawer: msg.sender,
            stablecoin: stablecoin,
            vault: vault,
            principal: amount,
            shares: shares,
            createdAt: uint64(block.timestamp),
            maturity: maturity,
            settled: false
        });
        _addActive(checkId);
        _safeMint(payee, checkId);

        emit CheckCreated(checkId, msg.sender, payee, stablecoin, vault, amount, maturity);
    }

    // ---------------------------------------------------------------------
    // Settlement: principal -> holder, yield -> drawer
    // ---------------------------------------------------------------------

    /// @notice Settle a matured cheque. Anyone may call. Redeems the vault position, pays the
    ///         principal to the current holder first, and sends any remaining yield to the drawer.
    function settle(uint256 checkId) public nonReentrant {
        _settle(checkId);
    }

    function _settle(uint256 checkId) internal {
        Check storage c = checks[checkId];
        if (c.drawer == address(0)) revert UnknownCheck();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.maturity) revert NotMatured();

        address payee = ownerOf(checkId);

        // Effects before external interactions.
        c.settled = true;
        _removeActive(checkId);
        uint256 shares = c.shares;
        c.shares = 0;
        _burn(checkId);

        // Redeem the entire position, then split: payee is made whole first (yield acts as a
        // first-loss buffer), the remainder is the drawer's yield.
        uint256 redeemed = IERC4626(c.vault).redeem(shares, address(this), address(this));
        uint256 toPayee = redeemed >= c.principal ? c.principal : redeemed;
        uint256 toDrawer = redeemed - toPayee;

        IERC20(c.stablecoin).safeTransfer(payee, toPayee);
        if (toDrawer > 0) {
            IERC20(c.stablecoin).safeTransfer(c.drawer, toDrawer);
        }

        emit Settled(checkId, payee, toPayee, c.drawer, toDrawer);
    }

    // ---------------------------------------------------------------------
    // Chainlink Automation (keeper) — automatic settlement at maturity
    // ---------------------------------------------------------------------

    /// @inheritdoc AutomationCompatibleInterface
    /// @dev Off-chain view. Scans active cheques and returns the matured ids to settle.
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 len = _activeIds.length;
        uint256 count;
        uint256[] memory due = new uint256[](len < MAX_SETTLE_BATCH ? len : MAX_SETTLE_BATCH);
        for (uint256 i; i < len && count < MAX_SETTLE_BATCH; ++i) {
            uint256 id = _activeIds[i];
            if (block.timestamp >= checks[id].maturity) {
                due[count++] = id;
            }
        }
        if (count == 0) return (false, bytes(""));

        uint256[] memory ids = new uint256[](count);
        for (uint256 i; i < count; ++i) {
            ids[i] = due[i];
        }
        return (true, abi.encode(ids));
    }

    /// @inheritdoc AutomationCompatibleInterface
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory ids = abi.decode(performData, (uint256[]));
        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            // Re-validate each id; skip ones already handled or not yet matured.
            Check storage c = checks[id];
            if (c.drawer == address(0) || c.settled || block.timestamp < c.maturity) continue;
            _settle(id);
        }
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Yield accrued so far for a cheque (claimable by the drawer at settlement).
    function accruedYield(uint256 checkId) external view returns (uint256) {
        Check storage c = checks[checkId];
        if (c.drawer == address(0) || c.settled) return 0;
        uint256 value = IERC4626(c.vault).convertToAssets(c.shares);
        return value > c.principal ? value - c.principal : 0;
    }

    /// @notice Current redeemable value (principal + yield) of a cheque in stablecoin units.
    function currentValue(uint256 checkId) external view returns (uint256) {
        Check storage c = checks[checkId];
        if (c.drawer == address(0) || c.settled) return 0;
        return IERC4626(c.vault).convertToAssets(c.shares);
    }

    function getCheck(uint256 checkId) external view returns (Check memory) {
        return checks[checkId];
    }

    function activeCheckIds() external view returns (uint256[] memory) {
        return _activeIds;
    }

    // ---------------------------------------------------------------------
    // Endorsement ("ciro") — any ERC-721 transfer of a live cheque
    // ---------------------------------------------------------------------

    /// @dev Emit an Endorsed event on holder-to-holder transfers (not mint/burn).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            emit Endorsed(tokenId, from, to);
        }
        return from;
    }

    // ---------------------------------------------------------------------
    // Active-set bookkeeping
    // ---------------------------------------------------------------------

    function _addActive(uint256 checkId) private {
        _activeIds.push(checkId);
        _activeIndexPlusOne[checkId] = _activeIds.length; // index + 1
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
