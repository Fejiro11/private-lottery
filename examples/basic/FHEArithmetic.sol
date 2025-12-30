// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title FHEArithmetic
 * @notice Demonstrates FHE arithmetic operations
 * @dev Shows FHE.add, FHE.sub, FHE.mul, FHE.div, FHE.min, FHE.max
 * @chapter operations
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEArithmetic is ZamaEthereumConfig {
    euint32 public result;

    event OperationPerformed(string operation, address indexed by);

    /**
     * @notice Add two encrypted values
     * @param a First encrypted operand
     * @param b Second encrypted operand
     * @param inputProof Zero-knowledge proof
     */
    function add(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        euint32 eB = FHE.fromExternal(b, inputProof);
        
        result = FHE.add(eA, eB);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("add", msg.sender);
    }

    /**
     * @notice Subtract two encrypted values
     * @dev Note: FHE subtraction is unchecked (wraps on underflow)
     */
    function sub(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        euint32 eB = FHE.fromExternal(b, inputProof);
        
        result = FHE.sub(eA, eB);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("sub", msg.sender);
    }

    /**
     * @notice Multiply two encrypted values
     */
    function mul(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        euint32 eB = FHE.fromExternal(b, inputProof);
        
        result = FHE.mul(eA, eB);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("mul", msg.sender);
    }

    /**
     * @notice Divide encrypted value by plaintext divisor
     * @dev div only works with plaintext divisor (not encrypted)
     */
    function divByPlaintext(
        externalEuint32 a,
        uint32 divisor,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        
        result = FHE.div(eA, divisor);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("div", msg.sender);
    }

    /**
     * @notice Get minimum of two encrypted values
     */
    function min(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        euint32 eB = FHE.fromExternal(b, inputProof);
        
        result = FHE.min(eA, eB);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("min", msg.sender);
    }

    /**
     * @notice Get maximum of two encrypted values
     */
    function max(
        externalEuint32 a,
        externalEuint32 b,
        bytes calldata inputProof
    ) external {
        euint32 eA = FHE.fromExternal(a, inputProof);
        euint32 eB = FHE.fromExternal(b, inputProof);
        
        result = FHE.max(eA, eB);
        
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        emit OperationPerformed("max", msg.sender);
    }

    /**
     * @notice Get the result
     */
    function getResult() external view returns (euint32) {
        return result;
    }
}
