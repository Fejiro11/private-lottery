// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title EncryptMultipleValues
 * @notice Demonstrates encrypting multiple values in a single transaction
 * @dev Shows batch encryption with shared input proof
 * @chapter encryption
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptMultipleValues is ZamaEthereumConfig {
    /// @notice First encrypted value
    euint32 private _valueA;
    
    /// @notice Second encrypted value
    euint32 private _valueB;
    
    /// @notice Third encrypted value (optional boolean)
    ebool private _flag;

    /// @notice Emitted when values are stored
    event ValuesStored(address indexed setter, uint256 count);

    /**
     * @notice Store two encrypted uint32 values
     * @dev Both values share the same input proof
     * @param encryptedA First encrypted value
     * @param encryptedB Second encrypted value
     * @param inputProof Shared zero-knowledge proof for both inputs
     */
    function storeTwoValues(
        externalEuint32 encryptedA,
        externalEuint32 encryptedB,
        bytes calldata inputProof
    ) external {
        // Convert both external inputs using the same proof
        // The proof validates all encrypted values in the batch
        euint32 a = FHE.fromExternal(encryptedA, inputProof);
        euint32 b = FHE.fromExternal(encryptedB, inputProof);
        
        // Store values
        _valueA = a;
        _valueB = b;
        
        // Grant permissions for both values
        FHE.allowThis(_valueA);
        FHE.allowThis(_valueB);
        FHE.allow(_valueA, msg.sender);
        FHE.allow(_valueB, msg.sender);

        emit ValuesStored(msg.sender, 2);
    }

    /**
     * @notice Store three values of different types
     * @dev Demonstrates mixing euint32 and ebool in one transaction
     * @param encryptedA First uint32 value
     * @param encryptedB Second uint32 value
     * @param encryptedFlag Boolean flag
     * @param inputProof Shared proof for all inputs
     */
    function storeThreeValues(
        externalEuint32 encryptedA,
        externalEuint32 encryptedB,
        externalEbool encryptedFlag,
        bytes calldata inputProof
    ) external {
        // Convert all inputs
        euint32 a = FHE.fromExternal(encryptedA, inputProof);
        euint32 b = FHE.fromExternal(encryptedB, inputProof);
        ebool flag = FHE.fromExternal(encryptedFlag, inputProof);
        
        // Store values
        _valueA = a;
        _valueB = b;
        _flag = flag;
        
        // Grant permissions
        FHE.allowThis(_valueA);
        FHE.allowThis(_valueB);
        FHE.allowThis(_flag);
        FHE.allow(_valueA, msg.sender);
        FHE.allow(_valueB, msg.sender);
        FHE.allow(_flag, msg.sender);

        emit ValuesStored(msg.sender, 3);
    }

    /**
     * @notice Get encrypted value A
     * @return The first encrypted value
     */
    function getValueA() external view returns (euint32) {
        return _valueA;
    }

    /**
     * @notice Get encrypted value B
     * @return The second encrypted value
     */
    function getValueB() external view returns (euint32) {
        return _valueB;
    }

    /**
     * @notice Get encrypted flag
     * @return The encrypted boolean flag
     */
    function getFlag() external view returns (ebool) {
        return _flag;
    }
}
