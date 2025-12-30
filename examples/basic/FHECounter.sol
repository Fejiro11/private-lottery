// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title FHECounter
 * @notice A simple encrypted counter demonstrating basic FHE operations
 * @dev Shows FHE.add, FHE.sub, FHE.fromExternal, FHE.allowThis, FHE.allow
 * @chapter basic
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract FHECounter is ZamaEthereumConfig {
    /// @notice The encrypted counter value
    euint32 private _count;

    /// @notice Emitted when the counter is incremented
    event Incremented(address indexed by);
    
    /// @notice Emitted when the counter is decremented
    event Decremented(address indexed by);

    /**
     * @notice Get the encrypted counter value
     * @dev Returns the euint32 handle - must be decrypted off-chain
     * @return The encrypted counter value
     */
    function getCount() external view returns (euint32) {
        return _count;
    }

    /**
     * @notice Increment the counter by an encrypted value
     * @dev Demonstrates FHE.fromExternal and FHE.add
     * @param encryptedValue The encrypted increment value
     * @param inputProof Zero-knowledge proof for the encrypted input
     */
    function increment(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        // Convert external encrypted input to internal euint32
        euint32 value = FHE.fromExternal(encryptedValue, inputProof);
        
        // Perform encrypted addition
        _count = FHE.add(_count, value);
        
        // Grant permissions for later decryption
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);

        emit Incremented(msg.sender);
    }

    /**
     * @notice Decrement the counter by an encrypted value
     * @dev Demonstrates FHE.sub - note: no underflow check in FHE
     * @param encryptedValue The encrypted decrement value
     * @param inputProof Zero-knowledge proof for the encrypted input
     */
    function decrement(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        // Convert external encrypted input to internal euint32
        euint32 value = FHE.fromExternal(encryptedValue, inputProof);
        
        // Perform encrypted subtraction
        // Note: FHE operations are unchecked - no underflow protection
        _count = FHE.sub(_count, value);
        
        // Grant permissions for later decryption
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);

        emit Decremented(msg.sender);
    }

    /**
     * @notice Check if the counter is initialized
     * @dev Uses FHE.isInitialized to check if encrypted value exists
     * @return True if counter has been set
     */
    function isInitialized() external view returns (bool) {
        return FHE.isInitialized(_count);
    }
}
