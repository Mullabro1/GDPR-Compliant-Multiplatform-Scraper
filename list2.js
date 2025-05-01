import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const inputFilePath = path.join(__dirname, "scraped_data.json");
const collectionsDir = path.join(__dirname, "collections");
const allLinksPath = path.join(collectionsDir, "all_links.json");
const nameCountPath = path.join(collectionsDir, "name_count.json");

// Ensure collections folder exists
if (!fs.existsSync(collectionsDir)) {
    fs.mkdirSync(collectionsDir);
}

// Load scraped data
const rawData = fs.readFileSync(inputFilePath, "utf-8");
const jsonData = JSON.parse(rawData);

// 1. Create all_links.json
const allLinks = jsonData.map(item => ({ url: item.link }));
fs.writeFileSync(allLinksPath, JSON.stringify(allLinks, null, 4), "utf-8");
console.log(`✅ Saved: ${allLinksPath}`);

// 2. Count occurrences of names
const nameMap = new Map();

jsonData.forEach(item => {
    const name = item.name;
    if (!nameMap.has(name)) {
        nameMap.set(name, 1);
    } else {
        nameMap.set(name, nameMap.get(name) + 1);
    }
});

// Convert map to array of objects
const nameCountArray = Array.from(nameMap.entries()).map(([name, count]) => ({
    no_count: count,
    name: name
}));

// Save to name_count.json
fs.writeFileSync(nameCountPath, JSON.stringify(nameCountArray, null, 4), "utf-8");
console.log(`✅ Saved: ${nameCountPath}`);
