// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILendingAdapter} from "./ILendingAdapter.sol";

/// @dev Assumed Brix wiTRY interface (ERC-4626 + Ethena-style cooldown). The cooldown/unstake
///      function names below MUST be confirmed against the verified wiTRY ABI on Etherscan
///      (0xE346C29b5B60Ef870b9724c57ccfbBc631e47DEE) before mainnet use, and exercised on a fork.
interface IBrixWiTRY {
    function asset() external view returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function cooldownDuration() external view returns (uint256);
    /// Starts the cooldown: burns `shares` held by the caller, moves underlying to the silo.
    function cooldownShares(uint256 shares) external returns (uint256 assets);
    /// After the cooldown elapses, withdraws the caller's silo balance to `receiver`.
    function unstake(address receiver) external;
}

/// @notice Per-redemption silo holder. One is deployed per `startRedeem` so each cheque's 3-day
///         cooldown is isolated (Brix's silo is per-account; a shared adapter would commingle
///         overlapping cooldowns). The helper is the "account" for exactly one redemption.
contract BrixSiloHelper {
    address public immutable adapter;
    IBrixWiTRY public immutable witry;

    constructor(IBrixWiTRY witry_) {
        adapter = msg.sender;
        witry = witry_;
    }

    /// @notice Start the cooldown for `shares` already transferred to this helper.
    function start(uint256 shares) external {
        require(msg.sender == adapter, "only adapter");
        witry.cooldownShares(shares);
    }

    /// @notice After the cooldown, withdraw the underlying to `to`.
    function claim(address to) external {
        require(msg.sender == adapter, "only adapter");
        witry.unstake(to);
    }
}

/// @notice Lending adapter for Brix wiTRY (Turkish-Lira money-market yield) with a 3-day unstake
///         cooldown. Deposits iTRY → wiTRY; redemptions start a cooldown via an isolated silo helper
///         and complete after it elapses.
/// @dev NOT YET FORK-TESTED against live Brix — confirm wiTRY's cooldown/unstake ABI first
///      (see contracts/INTEGRATIONS.md).
contract BrixWiTRYAdapter is ILendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    IBrixWiTRY public immutable witry;
    IERC20 public immutable underlying; // iTRY
    IERC20 public immutable shareToken; // wiTRY as ERC-20

    uint256 public nextTicket = 1;
    mapping(uint256 => address) public ticketSilo;
    mapping(uint256 => uint256) public ticketClaimableAt;

    constructor(address witry_, address registry) Ownable(registry) {
        witry = IBrixWiTRY(witry_);
        underlying = IERC20(IBrixWiTRY(witry_).asset());
        shareToken = IERC20(witry_);
    }

    function asset() external view returns (address) {
        return address(underlying);
    }

    function cooldown() external view returns (uint256) {
        return witry.cooldownDuration();
    }

    function deposit(uint256 assets) external onlyOwner returns (uint256 shares) {
        underlying.forceApprove(address(witry), assets);
        shares = witry.deposit(assets, address(this));
    }

    function currentAssets(uint256 shares) external view returns (uint256) {
        return witry.convertToAssets(shares);
    }

    function startRedeem(uint256 shares) external onlyOwner returns (uint256 ticketId, uint256 claimableAt) {
        BrixSiloHelper helper = new BrixSiloHelper(witry);
        shareToken.safeTransfer(address(helper), shares); // move wiTRY into the isolated silo helper
        helper.start(shares); // begin the cooldown
        ticketId = nextTicket++;
        ticketSilo[ticketId] = address(helper);
        claimableAt = block.timestamp + witry.cooldownDuration();
        ticketClaimableAt[ticketId] = claimableAt;
    }

    function completeRedeem(uint256 ticketId, address to) external onlyOwner returns (uint256 assets) {
        require(block.timestamp >= ticketClaimableAt[ticketId], "cooldown not elapsed");
        uint256 before = underlying.balanceOf(to);
        BrixSiloHelper(ticketSilo[ticketId]).claim(to);
        assets = underlying.balanceOf(to) - before;
        delete ticketSilo[ticketId];
        delete ticketClaimableAt[ticketId];
    }
}
