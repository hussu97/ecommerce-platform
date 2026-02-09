const fs = require("fs");
const path = require("path");

const tokensPath = path.join(__dirname, "..", "tokens.json");
const outDir = path.join(__dirname, "..", "dist");
const outPath = path.join(outDir, "theme.css");

const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));

function camelToKebab(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

const lines = ["/* Generated from packages/design-tokens/tokens.json – do not edit by hand */", "@theme {"];

for (const [key, value] of Object.entries(tokens.colors)) {
  const name = camelToKebab(key);
  lines.push(`  --color-${name}: ${value};`);
}

for (const [key, value] of Object.entries(tokens.radius)) {
  lines.push(`  --radius-${key}: ${value};`);
}

lines.push(`  --font-display: "${tokens.typography.fontDisplay.split(",")[0].trim()}", ${tokens.typography.fontDisplay.split(",").slice(1).join(",").trim() || "serif"};`);
lines.push(`  --font-sans: "${tokens.typography.fontSans.split(",")[0].trim()}", ${tokens.typography.fontSans.split(",").slice(1).join(",").trim() || "sans-serif"};`);

lines.push("}");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log("Wrote", outPath);
