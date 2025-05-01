import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const inputPath = path.join(__dirname, "scraped_collections.json");
const outputDir = path.join(__dirname, "collections");

// Make sure collections folder exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Read and parse input file
const rawData = fs.readFileSync(inputPath, "utf-8");
const jsonData = JSON.parse(rawData);

// Group by collection
const grouped = {};

jsonData.forEach(item => {
    const collection = item.collection || "Uncategorized";
    if (!grouped[collection]) grouped[collection] = [];
    grouped[collection].push({ url: item.link });
});

// Write each group to a file
for (const [collectionName, urls] of Object.entries(grouped)) {
    const safeName = collectionName.replace(/[\/\\?%*:|"<>]/g, "_"); // sanitize for filenames
    const outputFile = path.join(outputDir, `${safeName}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(urls, null, 4), "utf-8");
    console.log(`✅ Saved: ${outputFile}`);
}
