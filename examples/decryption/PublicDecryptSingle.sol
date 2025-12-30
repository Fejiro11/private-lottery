// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title PublicDecryptSingle
 * @notice Demonstrates public decryption workflow
 * @dev Shows FHE.makePubliclyDecryptable, FHE.toBytes32, FHE.checkSignatures
 * @chapter decryption
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract PublicDecryptSingle is ZamaEthereumConfig {
    /// @notice The encrypted secret value
    euint32 private _encryptedSecret;
    
    /// @notice The revealed plaintext value
    uint32 public revealedValue;
    
    /// @notice Whether the value has been revealed
    bool public isRevealed;

    event SecretSet(address indexed by);
    event DecryptionRequested();
    event SecretRevealed(uint32 value);

    /**
     * @notice Set an encrypted secret value
     */
    function setSecret(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        require(!isRevealed, "Already revealed");
        
        _encryptedSecret = FHE.fromExternal(encryptedValue, inputProof);
        FHE.allowThis(_encryptedSecret);
        
        emit SecretSet(msg.sender);
    }

    /**
     * @notice Request public decryption of the secret
     * @dev Step 1: Mark the ciphertext as publicly decryptable
     */
    function requestDecryption() external {
        require(FHE.isInitialized(_encryptedSecret), "No secret set");
        require(!isRevealed, "Already revealed");
        
        // Make the encrypted value publicly decryptable
        // This allows anyone to request decryption from the KMS
        FHE.makePubliclyDecryptable(_encryptedSecret);
        
        emit DecryptionRequested();
    }

    /**
     * @notice Finalize reveal with decrypted value and proof
     * @dev Step 2: Verify the decryption proof and store the cleartext
     * @param clearValue The decrypted plaintext value
     * @param decryptionProof Proof from the Zama KMS
     */
    function finalizeReveal(uint32 clearValue, bytes calldata decryptionProof) external {
        require(FHE.isInitialized(_encryptedSecret), "No secret set");
        require(!isRevealed, "Already revealed");

        // Build the handles array for verification
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_encryptedSecret);

        // ABI encode the cleartext value
        bytes memory abiEncoded = abi.encode(clearValue);

        // Verify the decryption proof
        // This reverts if:
        // - The proof is invalid
        // - The cleartext doesn't match the ciphertext
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);

        // Store the revealed value
        revealedValue = clearValue;
        isRevealed = true;

        emit SecretRevealed(clearValue);
    }

    /**
     * @notice Get the encrypted secret handle (for off-chain decryption)
     */
    function getEncryptedSecret() external view returns (euint32) {
        return _encryptedSecret;
    }
}
