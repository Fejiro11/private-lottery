# AccessControl

> Demonstrates FHE access control mechanisms

**Chapter:** `access-control`

**Source:** `AccessControl.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "access-control" category.

## Functions

### `deposit()`

Demonstrates FHE access control mechanisms

> Shows FHE.allow, FHE.allowThis, FHE.allowTransient

**Parameters:**

- `encryptedAmount`: The encrypted deposit amount
- `inputProof`: Zero-knowledge proof

### `getBalance()`

Get your encrypted balance

> Only works if caller has been granted permission

**Returns:** The encrypted balance (euint32 handle)

### `grantViewAccess()`

Grant another address permission to view your balance

> Demonstrates FHE.allow for third-party access

**Parameters:**

- `viewer`: The address to grant access to

### `transferTo()`

Transfer encrypted amount to another contract

> Demonstrates FHE.allowTransient for cross-contract calls

**Parameters:**

- `to`: The target contract address
- `encryptedAmount`: The encrypted transfer amount
- `inputProof`: Zero-knowledge proof

### `hasBalance()`

Check if a balance is initialized

> Uses FHE.isInitialized helper

## Events

- `Deposited`
- `AccessGranted`

## Key Concepts

- **Contract Permission**: `FHE.allowThis()`
- **User Permission**: `FHE.allow()`
- **Transient Permission**: `FHE.allowTransient()`

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
