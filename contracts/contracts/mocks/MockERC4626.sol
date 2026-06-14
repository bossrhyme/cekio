// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Test-only ERC-4626 vault. Yield is simulated by transferring extra underlying into the
///         vault (raising share price); loss is simulated via `simulateLoss`.
contract MockERC4626 is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Mock Vault", "mVLT") {}

    /// @notice Simulate yield by minting/transferring `amount` of the underlying into the vault.
    /// @dev The caller must have approved this vault for `amount`.
    function simulateYield(uint256 amount) external {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
    }

    /// @notice Simulate a loss by moving `amount` of underlying out of the vault.
    function simulateLoss(uint256 amount, address to) external {
        IERC20(asset()).transfer(to, amount);
    }
}
