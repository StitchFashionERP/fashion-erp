import {
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const candidates = [
  "src/components/layout/app-shell.tsx",
  "src/app/layout.tsx",
];

const assistantPatterns = [
  /import\s+\{?\s*StitchAssistant\s*\}?\s+from\s+["'][^"']+["'];?\n?/g,
  /import\s+\{?\s*Assistant\s*\}?\s+from\s+["'][^"']*assistant[^"']*["'];?\n?/gi,
  /<StitchAssistant\s*\/>\s*/g,
  /<Assistant\s*\/>\s*/g,
];

for (const relativePath of candidates) {
  const fullPath = path.join(root, relativePath);

  try {
    const current = await readFile(fullPath, "utf8");

    const cleaned = assistantPatterns.reduce(
      (value, pattern) => value.replace(pattern, ""),
      current,
    );

    if (cleaned !== current) {
      await writeFile(fullPath, cleaned, "utf8");
      console.log(`Assistent verwijderd uit ${relativePath}`);
    }
  } catch {
    // Bestand bestaat niet in deze projectversie.
  }
}
