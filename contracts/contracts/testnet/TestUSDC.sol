// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet faucet stablecoin. Anyone can mint a capped amount for testing.
/// @dev NOT for production. Used only on Base Sepolia to exercise the cheque flow.
contract TestUSDC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10_000e6; // 10,000 tokens

    constructor() ERC20("Test USD Coin", "tUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint the faucet amount to the caller.
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Mint an arbitrary amount to `to` (testnet convenience).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
