import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const [major, minor, patch] = packageJson.version.split(".").map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;

packageJson.version = nextVersion;

writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

console.log(`Versão atualizada para ${nextVersion}`);
