// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title EncryptSingleValue
 * @notice Demonstrates encrypting a single value using externalEuint32
 * @dev Shows FHE.fromExternal with input proof validation
 * @chapter encryption
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptSingleValue is ZamaEthereumConfig {
    /// @notice The encrypted stored value
    euint32 private _encryptedValue;
    
    /// @notice Address that set the value
    address public lastSetter;

    /// @notice Emitted when a value is stored
    event ValueStored(address indexed setter);

    /**
     * @notice Store an encrypted value
     * @dev The value is encrypted off-chain and validated on-chain
     * @param encryptedInput The encrypted uint32 value (externalEuint32)
     * @param inputProof Zero-knowledge proof validating the encryption
     */
    function storeEncryptedValue(
        externalEuint32 encryptedInput,
        bytes calldata inputProof
    ) external {
        // Convert external encrypted input to internal euint32
        // This validates the ZK proof and binds it to this contract + sender
        euint32 value = FHE.fromExternal(encryptedInput, inputProof);
        
        // Store the encrypted value
        _encryptedValue = value;
        lastSetter = msg.sender;
        
        // Grant permissions for later operations
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);

        emit ValueStored(msg.sender);
    }

    /**
     * @notice Get the encrypted value handle
     * @dev Returns the euint32 handle - must be decrypted off-chain
     * @return The encrypted value
     */
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }

    /**
     * @notice Check if a value has been stored
     * @return True if a value exists
     */
    function hasValue() external view returns (bool) {
        return FHE.isInitialized(_encryptedValue);
    }
}
