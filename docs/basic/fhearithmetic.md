# FHEArithmetic

> Demonstrates FHE arithmetic operations

**Chapter:** `operations`

**Source:** `FHEArithmetic.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "operations" category.

## Functions

### `add()`

Demonstrates FHE arithmetic operations

> Shows FHE.add, FHE.sub, FHE.mul, FHE.div, FHE.min, FHE.max

**Parameters:**

- `a`: First encrypted operand
- `b`: Second encrypted operand
- `inputProof`: Zero-knowledge proof

### `sub()`

Subtract two encrypted values

> Note: FHE subtraction is unchecked (wraps on underflow)

### `mul()`

Multiply two encrypted values

### `divByPlaintext()`

Divide encrypted value by plaintext divisor

> div only works with plaintext divisor (not encrypted)

### `min()`

Get minimum of two encrypted values

### `max()`

Get maximum of two encrypted values

### `getResult()`

Get the result

## Events

- `OperationPerformed`

## Key Concepts

- **Arithmetic**: `FHE.add()`, `FHE.sub()`, `FHE.mul()`, `FHE.div()`
- **Comparison**: `FHE.eq()`, `FHE.lt()`, `FHE.gt()`, `FHE.le()`, `FHE.ge()`
- **Selection**: `FHE.select()` for conditional logic

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
