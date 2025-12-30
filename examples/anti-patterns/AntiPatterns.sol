// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title AntiPatterns
 * @notice Common mistakes and anti-patterns in FHEVM development
 * @dev This file shows what NOT to do - each function demonstrates a mistake
 * @chapter anti-patterns
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract AntiPatterns is ZamaEthereumConfig {
    euint32 private _encryptedValue;
    
    // ============================================================
    // ANTI-PATTERN #1: View functions returning encrypted values
    // ============================================================
    
    /**
     * @notice WRONG: View function with encrypted return
     * @dev This compiles but the caller cannot decrypt without permissions
     * 
     * The Problem:
     * - View functions don't modify state
     * - But encrypted values require ACL permissions to decrypt
     * - If you don't grant permissions in a transaction, nobody can decrypt
     * 
     * The Solution:
     * - Grant permissions when setting the value (see setValue below)
     * - Or use a transaction to grant view access
     */
    function getValueWrong() external view returns (euint32) {
        // This returns a handle, but without ACL permissions,
        // the caller cannot actually decrypt it!
        return _encryptedValue;
    }

    // ============================================================
    // ANTI-PATTERN #2: Missing FHE.allowThis()
    // ============================================================

    /**
     * @notice WRONG: Not granting contract permission
     * @dev Subsequent operations on this value will fail
     * 
     * The Problem:
     * - After computing a new encrypted value, the contract needs permission
     * - Without FHE.allowThis(), the contract can't use it in future operations
     * 
     * The Solution:
     * - Always call FHE.allowThis() after computing new encrypted values
     */
    function setValueWrong(externalEuint32 encryptedInput, bytes calldata inputProof) external {
        euint32 value = FHE.fromExternal(encryptedInput, inputProof);
        
        // WRONG: Not calling FHE.allowThis()
        _encryptedValue = value;
        
        // Any future operation on _encryptedValue will fail because
        // the contract doesn't have permission to use it!
    }

    /**
     * @notice CORRECT: Granting proper permissions
     */
    function setValueCorrect(externalEuint32 encryptedInput, bytes calldata inputProof) external {
        euint32 value = FHE.fromExternal(encryptedInput, inputProof);
        
        _encryptedValue = value;
        
        // CORRECT: Grant contract permission
        FHE.allowThis(_encryptedValue);
        
        // CORRECT: Grant caller permission to decrypt
        FHE.allow(_encryptedValue, msg.sender);
    }

    // ============================================================
    // ANTI-PATTERN #3: Using encrypted values in require()
    // ============================================================

    /**
     * @notice WRONG: Trying to use encrypted bool in require
     * @dev This won't compile - ebool is not a regular bool
     * 
     * The Problem:
     * - Encrypted booleans (ebool) cannot be used in if/require statements
     * - The value is encrypted, so the EVM can't evaluate it
     * 
     * The Solution:
     * - Use FHE.select() for conditional logic
     * - Or decrypt first (async process) then check
     */
    // function checkValueWrong(externalEuint32 input, bytes calldata proof) external {
    //     euint32 value = FHE.fromExternal(input, proof);
    //     ebool isGreater = FHE.gt(value, _encryptedValue);
    //     
    //     // THIS WON'T COMPILE:
    //     // require(isGreater, "Value must be greater");
    //     
    //     // ebool cannot be used as a regular boolean!
    // }

    /**
     * @notice CORRECT: Using FHE.select() for conditional logic
     */
    function checkValueCorrect(externalEuint32 input, bytes calldata proof) external {
        euint32 value = FHE.fromExternal(input, proof);
        ebool isGreater = FHE.gt(value, _encryptedValue);
        
        // CORRECT: Use select for conditional assignment
        _encryptedValue = FHE.select(isGreater, value, _encryptedValue);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }

    // ============================================================
    // ANTI-PATTERN #4: Breaking loops with encrypted conditions
    // ============================================================

    /**
     * @notice WRONG: Trying to break loop on encrypted condition
     * @dev Can't use encrypted values to control loop flow
     * 
     * The Problem:
     * - Loop control (break, continue) requires evaluating a condition
     * - Encrypted conditions cannot be evaluated
     * 
     * The Solution:
     * - Use fixed iteration count
     * - Use FHE.select() inside the loop to conditionally update values
     */
    // function loopWrong(externalEuint32 max, bytes calldata proof) external {
    //     euint32 eMax = FHE.fromExternal(max, proof);
    //     euint32 counter = FHE.asEuint32(0);
    //     
    //     // THIS WON'T WORK:
    //     // while (FHE.lt(counter, eMax)) {  // Can't evaluate ebool!
    //     //     counter = FHE.add(counter, FHE.asEuint32(1));
    //     // }
    // }

    /**
     * @notice CORRECT: Fixed iteration with conditional updates
     */
    function loopCorrect(externalEuint32 max, bytes calldata proof) external {
        euint32 eMax = FHE.fromExternal(max, proof);
        euint32 counter = FHE.asEuint32(0);
        
        // CORRECT: Fixed number of iterations
        for (uint256 i = 0; i < 10; i++) {
            ebool shouldIncrement = FHE.lt(counter, eMax);
            euint32 increment = FHE.select(shouldIncrement, FHE.asEuint32(1), FHE.asEuint32(0));
            counter = FHE.add(counter, increment);
        }
        
        _encryptedValue = counter;
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }

    // ============================================================
    // ANTI-PATTERN #5: Forgetting to grant user permissions
    // ============================================================

    /**
     * @notice WRONG: Only granting contract permission
     * @dev User won't be able to decrypt the result
     */
    function computeWrong(externalEuint32 a, externalEuint32 b, bytes calldata proof) external {
        euint32 eA = FHE.fromExternal(a, proof);
        euint32 eB = FHE.fromExternal(b, proof);
        
        _encryptedValue = FHE.add(eA, eB);
        
        // Grants contract permission...
        FHE.allowThis(_encryptedValue);
        
        // WRONG: Forgot to grant user permission!
        // The caller cannot decrypt the result
    }

    /**
     * @notice CORRECT: Granting both contract and user permissions
     */
    function computeCorrect(externalEuint32 a, externalEuint32 b, bytes calldata proof) external {
        euint32 eA = FHE.fromExternal(a, proof);
        euint32 eB = FHE.fromExternal(b, proof);
        
        _encryptedValue = FHE.add(eA, eB);
        
        // CORRECT: Grant both permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
}
