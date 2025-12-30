# PublicDecryptSingle

> Demonstrates public decryption workflow

**Chapter:** `decryption`

**Source:** `PublicDecryptSingle.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "decryption" category.

## Functions

### `setSecret()`

Demonstrates public decryption workflow

> Shows FHE.makePubliclyDecryptable, FHE.toBytes32, FHE.checkSignatures

### `requestDecryption()`

Request public decryption of the secret

> Step 1: Mark the ciphertext as publicly decryptable

### `finalizeReveal()`

Finalize reveal with decrypted value and proof

> Step 2: Verify the decryption proof and store the cleartext

**Parameters:**

- `clearValue`: The decrypted plaintext value
- `decryptionProof`: Proof from the Zama KMS

### `getEncryptedSecret()`

Get the encrypted secret handle (for off-chain decryption)

## Events

- `SecretSet`
- `DecryptionRequested`
- `SecretRevealed`

## Key Concepts

- **Public Decryption**: `FHE.makePubliclyDecryptable()`
- **Proof Verification**: `FHE.checkSignatures()`
- **Handle Conversion**: `FHE.toBytes32()`

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
