# FHECounter

> A simple encrypted counter demonstrating basic FHE operations

**Chapter:** `basic`

**Source:** `FHECounter.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "basic" category.

## Functions

### `getCount()`

A simple encrypted counter demonstrating basic FHE operations

> Shows FHE.add, FHE.sub, FHE.fromExternal, FHE.allowThis, FHE.allow

**Returns:** The encrypted counter value

### `increment()`

Increment the counter by an encrypted value

> Demonstrates FHE.fromExternal and FHE.add

**Parameters:**

- `encryptedValue`: The encrypted increment value
- `inputProof`: Zero-knowledge proof for the encrypted input

### `decrement()`

Decrement the counter by an encrypted value

> Demonstrates FHE.sub - note: no underflow check in FHE

**Parameters:**

- `encryptedValue`: The encrypted decrement value
- `inputProof`: Zero-knowledge proof for the encrypted input

### `isInitialized()`

Check if the counter is initialized

> Uses FHE.isInitialized to check if encrypted value exists

**Returns:** True if counter has been set

## Events

- `Incremented`
- `Decremented`

## Key Concepts

- **Encrypted Types**: Using `euint32`, `ebool`, etc.
- **Basic Operations**: `FHE.add()`, `FHE.sub()`, `FHE.mul()`
- **Configuration**: Inheriting from `ZamaEthereumConfig`

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
