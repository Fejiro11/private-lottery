# Developer Guide

This guide explains how to add new FHEVM examples, update dependencies, and maintain the project.

## Project Structure

```
├── base-template/          # Clean Hardhat template to clone
│   ├── contracts/          # Empty - contracts added per example
│   ├── test/               # Empty - tests added per example
│   ├── deploy/             # Deployment scripts
│   ├── hardhat.config.ts   # Hardhat configuration
│   └── package.json        # Dependencies
│
├── examples/               # Example contracts by category
│   ├── basic/              # Simple FHE examples
│   ├── encryption/         # Encryption examples
│   ├── decryption/         # Decryption examples
│   ├── access-control/     # ACL examples
│   ├── advanced/           # Complex examples
│   └── anti-patterns/      # Common mistakes
│
├── scripts/                # Automation tools
│   ├── create-fhevm-example.ts   # Generate example projects
│   └── generate-docs.ts          # Auto-generate documentation
│
├── docs/                   # Generated documentation
│
└── frontend/               # (Optional) Demo frontend
```

## Adding a New Example

### Step 1: Create the Contract

Create a new Solidity file in the appropriate category folder:

```bash
examples/<category>/<ContractName>.sol
```

Use NatSpec comments for documentation:

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title MyExample
 * @notice Brief description of what this demonstrates
 * @dev Technical details about the implementation
 * @chapter <category>
 */

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

contract MyExample is ZamaEthereumConfig {
    // Your implementation
}
```

### Step 2: Add to Example Registry

Update `scripts/create-fhevm-example.ts` to include your new example:

```typescript
const EXAMPLES: Record<string, ExampleConfig> = {
  // ... existing examples
  
  "my-example": {
    name: "MyExample",
    category: "basic",
    description: "What this example demonstrates",
    chapter: "basic",
    contractTemplate: "MyExample",
    testTemplate: "MyExample",
  },
};
```

### Step 3: Create Tests (Optional)

Create a test file in the same category folder:

```bash
examples/<category>/<ContractName>.test.ts
```

### Step 4: Generate Documentation

Run the documentation generator:

```bash
npx ts-node scripts/generate-docs.ts
```

### Step 5: Test Generation

Test that your example can be scaffolded:

```bash
npx ts-node scripts/create-fhevm-example.ts create my-example ./output
cd output/my-example
npm install
npm run compile
```

## Updating Dependencies

### Updating @fhevm/solidity

1. Update `base-template/package.json`:
   ```json
   "@fhevm/solidity": "^X.Y.Z"
   ```

2. Update root `package.json` if needed

3. Test all examples compile:
   ```bash
   npm run compile
   ```

4. Check for API changes in the [FHEVM changelog](https://github.com/zama-ai/fhevm-solidity/releases)

### Common API Changes to Watch For

| Old API | New API | Notes |
|---------|---------|-------|
| `TFHE.*` | `FHE.*` | Library renamed in v0.10+ |
| `einput` | `externalEuint32` | External input types |
| `asEuint32(input, proof)` | `fromExternal(input, proof)` | Input conversion |

## Documentation Standards

### NatSpec Tags

Use these tags consistently:

- `@title` - Contract name
- `@notice` - User-facing description
- `@dev` - Developer notes
- `@chapter` - Category for docs generation
- `@param` - Function parameter
- `@return` - Return value

### Code Comments

Document key FHE concepts inline:

```solidity
// Grant contract permission to use this encrypted value
FHE.allowThis(encryptedValue);

// Grant user permission to decrypt
FHE.allow(encryptedValue, msg.sender);
```

## Automation Scripts

### create-fhevm-example.ts

Generate a new example project:

```bash
# List available examples
npx ts-node scripts/create-fhevm-example.ts list

# Create an example
npx ts-node scripts/create-fhevm-example.ts create <example-id> [output-dir]
```

### generate-docs.ts

Generate GitBook-compatible documentation:

```bash
npx ts-node scripts/generate-docs.ts [examples-dir] [output-dir]
```

Output:
- `docs/SUMMARY.md` - GitBook table of contents
- `docs/README.md` - Main documentation page
- `docs/<category>/<contract>.md` - Per-contract docs

## Testing Guidelines

### Test Structure

```typescript
describe("MyExample", function () {
  let contract: MyExample;
  let signers: { deployer: Signer; alice: Signer };

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    const factory = await ethers.getContractFactory("MyExample");
    contract = await factory.deploy();
  });

  it("should demonstrate the concept", async function () {
    // Test implementation
  });
});
```

### Key Testing Patterns

1. **Encryption**: Use `fhevm.createEncryptedInput()`
2. **Decryption**: Use `fhevm.userDecryptEuint()`
3. **Assertions**: Use chai `expect()`

## Deployment

### Local Testing

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Sepolia Testnet

1. Configure `.env`:
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   PRIVATE_KEY=0xYourPrivateKey
   ```

2. Deploy:
   ```bash
   npx hardhat deploy --network sepolia
   ```

## Resources

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
