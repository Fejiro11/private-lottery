# BlindAuction

> Confidential blind auction with encrypted bids

**Chapter:** `advanced`

**Source:** `BlindAuction.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "advanced" category.

## Functions

### `bid()`

Confidential blind auction with encrypted bids

> Shows complex FHE state management with encrypted comparisons

**Parameters:**

- `encryptedBid`: The encrypted bid amount
- `inputProof`: Zero-knowledge proof

### `endAuction()`

End the auction and request decryption

### `revealWinner()`

Reveal the winner with decryption proof

**Parameters:**

- `winner`: The decrypted winner address
- `winningBid`: The decrypted winning bid
- `decryptionProof`: Proof from Zama KMS

### `getHighestBid()`

Get the encrypted highest bid (for authorized parties)

## Events

- `BidPlaced`
- `AuctionEnded`
- `WinnerRevealed`

## Key Concepts

- **Complex State**: Managing multiple encrypted values
- **Multi-Party**: Confidential interactions between users
- **Business Logic**: Implementing real-world use cases

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
