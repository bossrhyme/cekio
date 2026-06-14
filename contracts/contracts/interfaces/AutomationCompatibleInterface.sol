// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @notice Minimal Chainlink Automation interface (keeper-compatible contracts).
/// @dev Mirrors chainlink/contracts AutomationCompatibleInterface to avoid an extra dependency.
interface AutomationCompatibleInterface {
    /// @notice Off-chain simulated check to decide whether upkeep should run.
    /// @return upkeepNeeded whether performUpkeep should be called
    /// @return performData data passed to performUpkeep
    function checkUpkeep(bytes calldata checkData)
        external
        returns (bool upkeepNeeded, bytes memory performData);

    /// @notice Executed on-chain by the Automation network when checkUpkeep returns true.
    function performUpkeep(bytes calldata performData) external;
}
