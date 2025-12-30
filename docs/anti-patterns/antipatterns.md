# AntiPatterns

> Common mistakes and anti-patterns in FHEVM development

**Chapter:** `anti-patterns`

**Source:** `AntiPatterns.sol`

## Overview

This contract demonstrates key FHEVM concepts for the "anti-patterns" category.

## Functions

### `getValueWrong()`

Common mistakes and anti-patterns in FHEVM development

> This file shows what NOT to do - each function demonstrates a mistake

### `setValueWrong()`

WRONG: Not granting contract permission

> Subsequent operations on this value will fail

### `setValueCorrect()`

CORRECT: Granting proper permissions

### `checkValueCorrect()`

WRONG: Trying to use encrypted bool in require

> This won't compile - ebool is not a regular bool

### `loopCorrect()`

WRONG: Trying to break loop on encrypted condition

> Can't use encrypted values to control loop flow

### `computeWrong()`

WRONG: Only granting contract permission

> User won't be able to decrypt the result

### `computeCorrect()`

CORRECT: Granting both contract and user permissions

## Key Concepts

- See contract documentation

## Related Documentation

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
