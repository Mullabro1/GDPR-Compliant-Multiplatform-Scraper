import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to name_count.json
const nameCountPath = path.join(__dirname, "collections", "name_count.json");

// Read and parse the JSON
const rawData = fs.readFileSync(nameCountPath, "utf-8");
const nameCounts = JSON.parse(rawData);

// Sort by no_count (ascending)
nameCounts.sort((a, b) => a.no_count - b.no_count);

// Save the sorted data back
fs.writeFileSync(nameCountPath, JSON.stringify(nameCounts, null, 4), "utf-8");

console.log(`✅ Sorted by count and saved to: ${nameCountPath}`);
