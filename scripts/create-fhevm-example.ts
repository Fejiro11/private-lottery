#!/usr/bin/env ts-node
/**
 * @title create-fhevm-example
 * @description CLI tool to generate FHEVM example projects from templates
 * @chapter automation
 */

import * as fs from "fs";
import * as path from "path";

interface ExampleConfig {
  name: string;
  category: string;
  description: string;
  chapter: string;
  contractTemplate: string;
  testTemplate: string;
}

const EXAMPLES: Record<string, ExampleConfig> = {
  // Basic Examples
  "fhe-counter": {
    name: "FHECounter",
    category: "basic",
    description: "Simple encrypted counter demonstrating FHE.add and FHE.sub",
    chapter: "basic",
    contractTemplate: "FHECounter",
    testTemplate: "FHECounter",
  },
  "fhe-arithmetic": {
    name: "FHEArithmetic", 
    category: "basic",
    description: "Demonstrates FHE.add, FHE.sub, FHE.mul operations",
    chapter: "operations",
    contractTemplate: "FHEArithmetic",
    testTemplate: "FHEArithmetic",
  },
  "fhe-comparison": {
    name: "FHEComparison",
    category: "basic", 
    description: "Demonstrates FHE.eq, FHE.ne, FHE.lt, FHE.le, FHE.gt, FHE.ge",
    chapter: "operations",
    contractTemplate: "FHEComparison",
    testTemplate: "FHEComparison",
  },
  // Encryption Examples
  "encrypt-single": {
    name: "EncryptSingleValue",
    category: "encryption",
    description: "Encrypt a single value using externalEuint32",
    chapter: "encryption",
    contractTemplate: "EncryptSingleValue",
    testTemplate: "EncryptSingleValue",
  },
  "encrypt-multiple": {
    name: "EncryptMultipleValues",
    category: "encryption",
    description: "Encrypt multiple values in a single transaction",
    chapter: "encryption",
    contractTemplate: "EncryptMultipleValues",
    testTemplate: "EncryptMultipleValues",
  },
  // Decryption Examples
  "decrypt-user-single": {
    name: "UserDecryptSingle",
    category: "decryption",
    description: "User decryption of a single encrypted value",
    chapter: "decryption",
    contractTemplate: "UserDecryptSingle",
    testTemplate: "UserDecryptSingle",
  },
  "decrypt-public-single": {
    name: "PublicDecryptSingle",
    category: "decryption",
    description: "Public decryption with FHE.makePubliclyDecryptable",
    chapter: "decryption",
    contractTemplate: "PublicDecryptSingle",
    testTemplate: "PublicDecryptSingle",
  },
  "decrypt-public-multiple": {
    name: "PublicDecryptMultiple",
    category: "decryption",
    description: "Batch public decryption of multiple values",
    chapter: "decryption",
    contractTemplate: "PublicDecryptMultiple",
    testTemplate: "PublicDecryptMultiple",
  },
  // Access Control Examples
  "access-control": {
    name: "AccessControl",
    category: "access-control",
    description: "Demonstrates FHE.allow and FHE.allowThis",
    chapter: "access-control",
    contractTemplate: "AccessControl",
    testTemplate: "AccessControl",
  },
  // Anti-Pattern Examples
  "anti-patterns": {
    name: "AntiPatterns",
    category: "anti-patterns",
    description: "Common FHE mistakes to avoid",
    chapter: "anti-patterns",
    contractTemplate: "AntiPatterns",
    testTemplate: "AntiPatterns",
  },
  // Advanced Examples
  "blind-auction": {
    name: "BlindAuction",
    category: "advanced",
    description: "Confidential blind auction with encrypted bids",
    chapter: "advanced",
    contractTemplate: "BlindAuction",
    testTemplate: "BlindAuction",
  },
  "private-lottery": {
    name: "PrivLottery",
    category: "advanced",
    description: "Privacy-first lottery with encrypted guesses",
    chapter: "advanced",
    contractTemplate: "PrivLottery",
    testTemplate: "PrivLottery",
  },
};

const CATEGORIES = ["basic", "encryption", "decryption", "access-control", "advanced", "anti-patterns"];

/**
 * Copy directory recursively
 */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Generate an example project from the base template
 */
function createExample(exampleId: string, outputDir: string): void {
  const config = EXAMPLES[exampleId];
  if (!config) {
    console.error(`Unknown example: ${exampleId}`);
    console.log(`Available examples: ${Object.keys(EXAMPLES).join(", ")}`);
    process.exit(1);
  }

  const baseTemplatePath = path.join(__dirname, "..", "base-template");
  const exampleContractsPath = path.join(__dirname, "..", "examples", config.category);
  const targetPath = path.join(outputDir, exampleId);

  console.log(`Creating example: ${config.name}`);
  console.log(`Category: ${config.category}`);
  console.log(`Output: ${targetPath}`);

  // 1. Copy base template
  copyDirSync(baseTemplatePath, targetPath);

  // 2. Copy contract file
  const contractSrc = path.join(exampleContractsPath, `${config.contractTemplate}.sol`);
  const contractDest = path.join(targetPath, "contracts", `${config.contractTemplate}.sol`);
  
  if (fs.existsSync(contractSrc)) {
    fs.copyFileSync(contractSrc, contractDest);
    console.log(`Copied contract: ${config.contractTemplate}.sol`);
  } else {
    console.warn(`Contract not found: ${contractSrc}`);
  }

  // 3. Copy test file
  const testSrc = path.join(exampleContractsPath, `${config.testTemplate}.test.ts`);
  const testDest = path.join(targetPath, "test", `${config.testTemplate}.test.ts`);
  
  if (fs.existsSync(testSrc)) {
    fs.copyFileSync(testSrc, testDest);
    console.log(`Copied test: ${config.testTemplate}.test.ts`);
  } else {
    console.warn(`Test not found: ${testSrc}`);
  }

  // 4. Generate README
  generateReadme(config, targetPath);

  // 5. Update package.json name
  const packageJsonPath = path.join(targetPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  packageJson.name = `fhevm-example-${exampleId}`;
  packageJson.description = config.description;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  console.log(`\n✅ Example created: ${targetPath}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${targetPath}`);
  console.log(`  npm install`);
  console.log(`  npm run compile`);
  console.log(`  npm test`);
}

/**
 * Generate README.md for an example
 */
function generateReadme(config: ExampleConfig, targetPath: string): void {
  const readme = `# ${config.name}

> ${config.description}

## Category
\`${config.category}\`

## Chapter
\`${config.chapter}\`

## Quick Start

\`\`\`bash
npm install
npm run compile
npm test
\`\`\`

## Contract

See \`contracts/${config.contractTemplate}.sol\`

## Test

See \`test/${config.testTemplate}.test.ts\`

## Key Concepts

This example demonstrates:
${getKeyConceptsForCategory(config.category)}

## Documentation

This example is part of the FHEVM Examples collection.
For more information, see [Zama FHEVM Documentation](https://docs.zama.org/protocol).
`;

  fs.writeFileSync(path.join(targetPath, "README.md"), readme);
  console.log("Generated README.md");
}

function getKeyConceptsForCategory(category: string): string {
  const concepts: Record<string, string> = {
    basic: `- Using encrypted types (euint32, ebool)
- Basic FHE operations (add, sub, mul)
- Inheriting from ZamaEthereumConfig`,
    encryption: `- Using externalEuint32 for encrypted inputs
- Converting with FHE.fromExternal()
- Input proofs and zero-knowledge validation`,
    decryption: `- FHE.allowThis() for contract permissions
- FHE.allow() for user permissions
- FHE.makePubliclyDecryptable() for public decryption
- FHE.checkSignatures() for proof verification`,
    "access-control": `- FHE.allow() - granting decryption permissions
- FHE.allowThis() - contract self-permissions
- FHE.allowTransient() - temporary permissions`,
    advanced: `- Complex encrypted state management
- Multi-party interactions with encrypted data
- Confidential business logic`,
    "anti-patterns": `- Common mistakes to avoid
- View functions with encrypted values (not allowed)
- Missing permissions`,
  };
  return concepts[category] || "- See contract documentation";
}

/**
 * List all available examples
 */
function listExamples(): void {
  console.log("\nAvailable FHEVM Examples:\n");
  
  for (const category of CATEGORIES) {
    const categoryExamples = Object.entries(EXAMPLES).filter(([_, c]) => c.category === category);
    if (categoryExamples.length > 0) {
      console.log(`📁 ${category.toUpperCase()}`);
      for (const [id, config] of categoryExamples) {
        console.log(`   - ${id}: ${config.description}`);
      }
      console.log();
    }
  }
}

// CLI Entry Point
const args = process.argv.slice(2);
const command = args[0];

if (command === "list") {
  listExamples();
} else if (command === "create" && args[1]) {
  const exampleId = args[1];
  const outputDir = args[2] || "./output";
  createExample(exampleId, outputDir);
} else {
  console.log(`
FHEVM Example Generator

Usage:
  ts-node create-fhevm-example.ts list                    List all available examples
  ts-node create-fhevm-example.ts create <example> [dir]  Create an example project

Examples:
  ts-node create-fhevm-example.ts create fhe-counter ./my-examples
  ts-node create-fhevm-example.ts create blind-auction
  `);
}
