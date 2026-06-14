// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Testnet ERC-4626 yield vault. Yield is simulated by donating underlying into the vault,
///         which raises the share price (same accounting as a real lending vault).
/// @dev NOT for production — testnet only.
contract TestYieldVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Test Yield USDC", "tyUSDC") {}

    /// @notice Donate `amount` of underlying into the vault to simulate accrued yield.
    /// @dev Caller must approve this vault for `amount` first.
    function simulateYield(uint256 amount) external {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
    }
}
