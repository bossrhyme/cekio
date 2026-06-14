// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ILendingAdapter
/// @notice Abstraction over a yield venue so CheckRegistry can support both instant ERC-4626 vaults
///         (Aave, Sky, Morpho) and cooldown-based staking vaults (Brix wiTRY → 3-day silo).
/// @dev Custody model: the registry transfers `assets` of the underlying to the adapter and calls
///      `deposit`. The adapter holds the position and tracks redemptions by ticket so cooldowns with
///      per-request timing are handled uniformly. Only the registry (owner) may call mutating fns.
interface ILendingAdapter {
    /// @notice Underlying asset (the stablecoin cheques are denominated in, e.g. iTRY/USDC).
    function asset() external view returns (address);

    /// @notice Redemption delay in seconds (0 = instant). Used by the registry to schedule unstake
    ///         so funds are claimable exactly at the cheque's maturity.
    function cooldown() external view returns (uint256);

    /// @notice Deposit `assets` (already transferred to the adapter) into the venue.
    /// @return shares internal share units credited to this position.
    function deposit(uint256 assets) external returns (uint256 shares);

    /// @notice Current underlying value of `shares` (principal + accrued yield).
    function currentAssets(uint256 shares) external view returns (uint256);

    /// @notice Begin redeeming `shares`. For instant adapters this redeems immediately and escrows
    ///         the assets under the returned ticket; for cooldown adapters it starts the unstake.
    /// @return ticketId handle used to complete the redemption
    /// @return claimableAt unix timestamp when `completeRedeem` becomes available
    function startRedeem(uint256 shares) external returns (uint256 ticketId, uint256 claimableAt);

    /// @notice Complete a redemption started with `startRedeem` and send the assets to `to`.
    /// @return assets amount of underlying transferred to `to`
    function completeRedeem(uint256 ticketId, address to) external returns (uint256 assets);
}
