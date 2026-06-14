// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILendingAdapter} from "../adapters/ILendingAdapter.sol";

/// @notice Test adapter simulating a cooldown vault like Brix wiTRY (unstake → silo → claim after
///         cooldown). Wraps a MockERC4626 for yield mechanics; startRedeem moves assets into an
///         internal "silo" claimable only after the cooldown elapses.
contract MockCooldownAdapter is ILendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC4626 public immutable vault;
    IERC20 public immutable underlying;
    uint256 public immutable cooldownPeriod;

    uint256 public nextTicket = 1;
    mapping(uint256 => uint256) public ticketAssets;
    mapping(uint256 => uint256) public ticketClaimableAt;

    constructor(address vault_, address registry, uint256 cooldown_) Ownable(registry) {
        vault = IERC4626(vault_);
        underlying = IERC20(IERC4626(vault_).asset());
        cooldownPeriod = cooldown_;
    }

    function asset() external view returns (address) {
        return address(underlying);
    }

    function cooldown() external view returns (uint256) {
        return cooldownPeriod;
    }

    function deposit(uint256 assets) external onlyOwner returns (uint256 shares) {
        underlying.forceApprove(address(vault), assets);
        shares = vault.deposit(assets, address(this));
    }

    function currentAssets(uint256 shares) external view returns (uint256) {
        return vault.convertToAssets(shares);
    }

    function startRedeem(uint256 shares) external onlyOwner returns (uint256 ticketId, uint256 claimableAt) {
        // Burn shares now (redeem into the adapter "silo"), claimable after cooldown.
        uint256 assets = vault.redeem(shares, address(this), address(this));
        ticketId = nextTicket++;
        ticketAssets[ticketId] = assets;
        claimableAt = block.timestamp + cooldownPeriod;
        ticketClaimableAt[ticketId] = claimableAt;
    }

    function completeRedeem(uint256 ticketId, address to) external onlyOwner returns (uint256 assets) {
        require(block.timestamp >= ticketClaimableAt[ticketId], "cooldown not elapsed");
        assets = ticketAssets[ticketId];
        delete ticketAssets[ticketId];
        delete ticketClaimableAt[ticketId];
        underlying.safeTransfer(to, assets);
    }
}
