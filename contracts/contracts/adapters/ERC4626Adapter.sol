// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILendingAdapter} from "./ILendingAdapter.sol";

/// @notice Adapter for instant (no-cooldown) ERC-4626 vaults: Aave aToken vault, Sky sUSDS, Morpho.
/// @dev Owned by the CheckRegistry; only the registry may move funds. Redemptions are instant —
///      startRedeem redeems immediately and escrows the assets under a ticket.
contract ERC4626Adapter is ILendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC4626 public immutable vault;
    IERC20 public immutable underlying;

    uint256 public nextTicket = 1;
    mapping(uint256 => uint256) public ticketAssets;

    constructor(address vault_, address registry) Ownable(registry) {
        vault = IERC4626(vault_);
        underlying = IERC20(IERC4626(vault_).asset());
    }

    function asset() external view returns (address) {
        return address(underlying);
    }

    function cooldown() external pure returns (uint256) {
        return 0;
    }

    function deposit(uint256 assets) external onlyOwner returns (uint256 shares) {
        underlying.forceApprove(address(vault), assets);
        shares = vault.deposit(assets, address(this));
    }

    function currentAssets(uint256 shares) external view returns (uint256) {
        return vault.convertToAssets(shares);
    }

    function startRedeem(uint256 shares) external onlyOwner returns (uint256 ticketId, uint256 claimableAt) {
        uint256 assets = vault.redeem(shares, address(this), address(this));
        ticketId = nextTicket++;
        ticketAssets[ticketId] = assets;
        claimableAt = block.timestamp;
    }

    function completeRedeem(uint256 ticketId, address to) external onlyOwner returns (uint256 assets) {
        assets = ticketAssets[ticketId];
        delete ticketAssets[ticketId];
        underlying.safeTransfer(to, assets);
    }
}
