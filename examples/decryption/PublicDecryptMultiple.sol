// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title PublicDecryptMultiple
 * @notice Demonstrates public decryption of multiple encrypted values
 * @dev Shows batch public decryption with FHE.makePubliclyDecryptable
 * @chapter decryption
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract PublicDecryptMultiple is ZamaEthereumConfig {
    /// @notice First encrypted result
    euint32 private _resultA;
    
    /// @notice Second encrypted result
    euint32 private _resultB;
    
    /// @notice Whether results can be revealed
    bool public canReveal;
    
    /// @notice Revealed clear values
    uint32 public revealedA;
    uint32 public revealedB;
    bool public isRevealed;

    /// @notice Emitted when results are ready for decryption
    event ResultsReadyForReveal();
    
    /// @notice Emitted when results are revealed
    event ResultsRevealed(uint32 valueA, uint32 valueB);

    /**
     * @notice Compute and store encrypted results
     * @dev Simulates a computation that produces multiple results
     */
    function computeResults(
        externalEuint32 inputA,
        externalEuint32 inputB,
        bytes calldata inputProof
    ) external {
        require(!canReveal, "Results already computed");
        
        euint32 a = FHE.fromExternal(inputA, inputProof);
        euint32 b = FHE.fromExternal(inputB, inputProof);
        
        // Perform some encrypted computation
        _resultA = FHE.add(a, b);
        _resultB = FHE.mul(a, FHE.asEuint32(2));
        
        FHE.allowThis(_resultA);
        FHE.allowThis(_resultB);
        
        canReveal = true;
    }

    /**
     * @notice Request public decryption of both results
     * @dev Makes both values publicly decryptable
     */
    function requestReveal() external {
        require(canReveal, "No results to reveal");
        require(!isRevealed, "Already revealed");
        
        // Mark both values as publicly decryptable
        FHE.makePubliclyDecryptable(_resultA);
        FHE.makePubliclyDecryptable(_resultB);
        
        emit ResultsReadyForReveal();
    }

    /**
     * @notice Finalize reveal with decrypted values
     * @dev Verifies decryption proof and stores clear values
     * @param clearA Decrypted value A
     * @param clearB Decrypted value B
     * @param decryptionProof Combined proof for both values
     */
    function finalizeReveal(
        uint32 clearA,
        uint32 clearB,
        bytes calldata decryptionProof
    ) external {
        require(canReveal, "No results to reveal");
        require(!isRevealed, "Already revealed");
        
        // Build handles array - ORDER MATTERS!
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_resultA);
        handles[1] = FHE.toBytes32(_resultB);
        
        // ABI encode clear values in the same order
        bytes memory encoded = abi.encode(clearA, clearB);
        
        // Verify the decryption proof
        FHE.checkSignatures(handles, encoded, decryptionProof);
        
        // Store revealed values
        revealedA = clearA;
        revealedB = clearB;
        isRevealed = true;
        
        emit ResultsRevealed(clearA, clearB);
    }

    /**
     * @notice Get encrypted result handles
     * @return resultA First encrypted result
     * @return resultB Second encrypted result
     */
    function getEncryptedResults() external view returns (euint32 resultA, euint32 resultB) {
        return (_resultA, _resultB);
    }
}
