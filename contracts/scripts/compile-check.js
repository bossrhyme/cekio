/* Standalone solc compile to verify contracts without network egress. */
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.resolve(__dirname, "..");

function readSource(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

const sources = {
  "contracts/CheckRegistry.sol": { content: readSource("contracts/CheckRegistry.sol") },
  "contracts/interfaces/AutomationCompatibleInterface.sol": {
    content: readSource("contracts/interfaces/AutomationCompatibleInterface.sol"),
  },
  "contracts/mocks/MockERC20.sol": { content: readSource("contracts/mocks/MockERC20.sol") },
  "contracts/mocks/MockERC4626.sol": { content: readSource("contracts/mocks/MockERC4626.sol") },
};

function findImport(importPath) {
  try {
    // Resolve OpenZeppelin and other node_modules imports.
    let full;
    if (importPath.startsWith("contracts/")) {
      full = path.join(ROOT, importPath);
    } else {
      full = path.join(ROOT, "node_modules", importPath);
    }
    return { contents: fs.readFileSync(full, "utf8") };
  } catch (e) {
    return { error: "File not found: " + importPath };
  }
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

const errors = (output.errors || []).filter((e) => e.severity === "error");
const warnings = (output.errors || []).filter((e) => e.severity === "warning");

if (warnings.length) {
  console.log(`Warnings: ${warnings.length}`);
  warnings.slice(0, 5).forEach((w) => console.log("  - " + w.formattedMessage.split("\n")[0]));
}

if (errors.length) {
  console.error(`\nCOMPILE FAILED: ${errors.length} error(s)`);
  errors.forEach((e) => console.error("\n" + e.formattedMessage));
  process.exit(1);
}

console.log("\nCOMPILE OK");
for (const file of Object.keys(output.contracts || {})) {
  for (const name of Object.keys(output.contracts[file])) {
    const bytes = output.contracts[file][name].evm.bytecode.object.length / 2;
    if (bytes > 0) console.log(`  ${name}: ${bytes} bytes`);
  }
}
