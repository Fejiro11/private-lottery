#!/usr/bin/env ts-node
/**
 * @title generate-docs
 * @description Auto-generate GitBook-compatible documentation from annotated contracts
 * @chapter automation
 */

import * as fs from "fs";
import * as path from "path";

interface ContractDoc {
  title: string;
  description: string;
  chapter: string;
  functions: FunctionDoc[];
  events: string[];
  filePath: string;
}

interface FunctionDoc {
  name: string;
  notice: string;
  dev: string;
  params: { name: string; description: string }[];
  returns: string;
}

/**
 * Parse NatSpec comments from Solidity file
 */
function parseContractDocs(filePath: string): ContractDoc | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  let title = "";
  let description = "";
  let chapter = "";
  const functions: FunctionDoc[] = [];
  const events: string[] = [];

  // Parse contract-level docs
  const titleMatch = content.match(/@title\s+(.+)/);
  const noticeMatch = content.match(/@notice\s+(.+)/);
  const chapterMatch = content.match(/@chapter\s+(.+)/);

  if (titleMatch) title = titleMatch[1].trim();
  if (noticeMatch) description = noticeMatch[1].trim();
  if (chapterMatch) chapter = chapterMatch[1].trim();

  // Parse function docs
  const functionRegex = /\/\*\*[\s\S]*?\*\/\s*function\s+(\w+)/g;
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1];
    const docBlock = match[0];

    const funcNotice = docBlock.match(/@notice\s+(.+)/)?.[1] || "";
    const funcDev = docBlock.match(/@dev\s+(.+)/)?.[1] || "";
    const paramMatches = docBlock.matchAll(/@param\s+(\w+)\s+(.+)/g);
    const returnsMatch = docBlock.match(/@return\s+(.+)/)?.[1] || "";

    const params: { name: string; description: string }[] = [];
    for (const pm of paramMatches) {
      params.push({ name: pm[1], description: pm[2] });
    }

    functions.push({
      name: funcName,
      notice: funcNotice,
      dev: funcDev,
      params,
      returns: returnsMatch,
    });
  }

  // Parse events
  const eventRegex = /event\s+(\w+)/g;
  while ((match = eventRegex.exec(content)) !== null) {
    events.push(match[1]);
  }

  if (!title) return null;

  return { title, description, chapter, functions, events, filePath };
}

/**
 * Generate markdown documentation for a contract
 */
function generateMarkdown(doc: ContractDoc): string {
  let md = `# ${doc.title}\n\n`;
  md += `> ${doc.description}\n\n`;
  md += `**Chapter:** \`${doc.chapter}\`\n\n`;
  md += `**Source:** \`${path.basename(doc.filePath)}\`\n\n`;

  md += `## Overview\n\n`;
  md += `This contract demonstrates key FHEVM concepts for the "${doc.chapter}" category.\n\n`;

  if (doc.functions.length > 0) {
    md += `## Functions\n\n`;

    for (const func of doc.functions) {
      md += `### \`${func.name}()\`\n\n`;
      if (func.notice) md += `${func.notice}\n\n`;
      if (func.dev) md += `> ${func.dev}\n\n`;

      if (func.params.length > 0) {
        md += `**Parameters:**\n\n`;
        for (const param of func.params) {
          md += `- \`${param.name}\`: ${param.description}\n`;
        }
        md += `\n`;
      }

      if (func.returns) {
        md += `**Returns:** ${func.returns}\n\n`;
      }
    }
  }

  if (doc.events.length > 0) {
    md += `## Events\n\n`;
    for (const event of doc.events) {
      md += `- \`${event}\`\n`;
    }
    md += `\n`;
  }

  md += `## Key Concepts\n\n`;
  md += getKeyConceptsForChapter(doc.chapter);

  md += `\n## Related Documentation\n\n`;
  md += `- [Zama FHEVM Documentation](https://docs.zama.org/protocol)\n`;
  md += `- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm-solidity)\n`;

  return md;
}

function getKeyConceptsForChapter(chapter: string): string {
  const concepts: Record<string, string> = {
    basic: `- **Encrypted Types**: Using \`euint32\`, \`ebool\`, etc.
- **Basic Operations**: \`FHE.add()\`, \`FHE.sub()\`, \`FHE.mul()\`
- **Configuration**: Inheriting from \`ZamaEthereumConfig\`
`,
    operations: `- **Arithmetic**: \`FHE.add()\`, \`FHE.sub()\`, \`FHE.mul()\`, \`FHE.div()\`
- **Comparison**: \`FHE.eq()\`, \`FHE.lt()\`, \`FHE.gt()\`, \`FHE.le()\`, \`FHE.ge()\`
- **Selection**: \`FHE.select()\` for conditional logic
`,
    encryption: `- **External Inputs**: Using \`externalEuint32\` type
- **Proof Validation**: \`FHE.fromExternal()\` with input proof
- **Zero-Knowledge**: Understanding ZK proofs for encrypted inputs
`,
    decryption: `- **Public Decryption**: \`FHE.makePubliclyDecryptable()\`
- **Proof Verification**: \`FHE.checkSignatures()\`
- **Handle Conversion**: \`FHE.toBytes32()\`
`,
    "access-control": `- **Contract Permission**: \`FHE.allowThis()\`
- **User Permission**: \`FHE.allow()\`
- **Transient Permission**: \`FHE.allowTransient()\`
`,
    advanced: `- **Complex State**: Managing multiple encrypted values
- **Multi-Party**: Confidential interactions between users
- **Business Logic**: Implementing real-world use cases
`,
  };
  return concepts[chapter] || "- See contract documentation\n";
}

/**
 * Generate SUMMARY.md for GitBook
 */
function generateSummary(docs: ContractDoc[]): string {
  let summary = `# Summary\n\n`;
  summary += `* [Introduction](README.md)\n\n`;

  const chapters = new Map<string, ContractDoc[]>();

  for (const doc of docs) {
    const chapter = doc.chapter || "misc";
    if (!chapters.has(chapter)) {
      chapters.set(chapter, []);
    }
    chapters.get(chapter)!.push(doc);
  }

  for (const [chapter, chapterDocs] of chapters) {
    summary += `## ${chapter.charAt(0).toUpperCase() + chapter.slice(1)}\n\n`;
    for (const doc of chapterDocs) {
      const fileName = doc.title.toLowerCase().replace(/\s+/g, "-");
      summary += `* [${doc.title}](${chapter}/${fileName}.md)\n`;
    }
    summary += `\n`;
  }

  return summary;
}

/**
 * Main documentation generation function
 */
function generateDocs(examplesDir: string, outputDir: string): void {
  console.log(`\nGenerating documentation...`);
  console.log(`Examples: ${examplesDir}`);
  console.log(`Output: ${outputDir}\n`);

  fs.mkdirSync(outputDir, { recursive: true });

  const allDocs: ContractDoc[] = [];

  // Process each category
  const categories = fs.readdirSync(examplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const category of categories) {
    const categoryPath = path.join(examplesDir, category);
    const categoryOutputPath = path.join(outputDir, category);
    fs.mkdirSync(categoryOutputPath, { recursive: true });

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".sol"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const doc = parseContractDocs(filePath);

      if (doc) {
        allDocs.push(doc);
        const markdown = generateMarkdown(doc);
        const outputFileName = doc.title.toLowerCase().replace(/\s+/g, "-") + ".md";
        const outputPath = path.join(categoryOutputPath, outputFileName);
        fs.writeFileSync(outputPath, markdown);
        console.log(`✅ Generated: ${category}/${outputFileName}`);
      }
    }
  }

  // Generate SUMMARY.md
  const summary = generateSummary(allDocs);
  fs.writeFileSync(path.join(outputDir, "SUMMARY.md"), summary);
  console.log(`\n✅ Generated: SUMMARY.md`);

  // Generate README.md
  const readme = `# FHEVM Examples Documentation

This documentation is auto-generated from the FHEVM example contracts.

## Categories

${categories.map((c) => `- [${c}](${c}/)`).join("\n")}

## Getting Started

Each example demonstrates specific FHEVM concepts:

1. **Basic** - Simple encrypted operations
2. **Encryption** - Handling encrypted inputs
3. **Decryption** - Public and user decryption
4. **Access Control** - Permission management
5. **Advanced** - Complex use cases

## Resources

- [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
`;

  fs.writeFileSync(path.join(outputDir, "README.md"), readme);
  console.log(`✅ Generated: README.md`);

  console.log(`\n📚 Documentation generated successfully!`);
  console.log(`Total contracts documented: ${allDocs.length}`);
}

// CLI Entry Point
const args = process.argv.slice(2);
const examplesDir = args[0] || "./examples";
const outputDir = args[1] || "./docs";

generateDocs(examplesDir, outputDir);
