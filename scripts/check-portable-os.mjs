import { readFile } from "node:fs/promises";

const packageUrl = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));
const errors = [];

for (const [name, command] of Object.entries(packageJson.scripts)) {
  if (/\\/.test(command)) errors.push(`${name}: use URL or path APIs instead of backslashes`);
  if (/[A-Za-z]:[\\/]/.test(command)) errors.push(`${name}: contains an absolute drive path`);
  if (/(^|\s)(rm|cp|mv|del|copy|move)(\s|$)/.test(command)) {
    errors.push(`${name}: contains a platform-specific file command`);
  }
}

const sourceUrls = [
  new URL("./check-i18n-parity.mjs", import.meta.url),
  new URL("./check-browser-quality.mjs", import.meta.url),
  new URL("../playwright.config.ts", import.meta.url),
  new URL("../vite.config.ts", import.meta.url),
];
for (const url of sourceUrls) {
  const source = await readFile(url, "utf8");
  if (/(?:^|["'\s])[A-Za-z]:[\\/]/.test(source)) {
    errors.push(`${url.pathname}: contains an absolute drive path`);
  }
}

if (errors.length) {
  console.error(`Portable OS check failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Portable OS check passed.");
}
