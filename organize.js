import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder paths
const files2Folder = path.join(__dirname, 'files2');  // mixed URLs folder (cars.json, animals.json, etc.)
const postsFolder = path.join(__dirname, 'posts');      // contains URLs for posts (/p or /post)
const reelsFolder = path.join(__dirname, 'reels');      // contains URLs for reels (/reels)

const fol2Folder = path.join(__dirname, 'fol2');        // scraped data for posts (/p)
const fol3Folder = path.join(__dirname, 'fol3');        // scraped data for reels (/reels)

const outputFolder = path.join(__dirname, 'scraped');   // output base folder

// Utility function: ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Utility function: extract a unique identifier from a URL
// This regex looks for a segment with at least 5 alphanumerical characters including "_" or "-" at the end of the URL.
const extractIdFromUrl = url => {
  const match = url.match(/\/([a-zA-Z0-9_-]{5,})(\/)?$/);
  return match ? match[1] : null;
};

// Loads all scraped data (from a given folder) into a map keyed by unique identifier.
const buildDataMap = (folderPath) => {
  const dataMap = {};
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    try {
      const fileData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      // fileData could be an array of entries or an individual object;
      // here we assume it is an array similar to your example.
      for (const entry of fileData) {
        // Try multiple possible keys for ID
        const id = entry.shortcode || entry.content_id || entry.post_id;
        if (id) dataMap[id] = entry;
      }
    } catch (err) {
      console.warn(`⚠️ Error reading ${file}:`, err.message);
    }
  }
  return dataMap;
};

// Build lookup maps for scraped posts (/p) and reels
const fol2Map = buildDataMap(fol2Folder); // for posts
const fol3Map = buildDataMap(fol3Folder); // for reels

// Helper to update the collectioninfo.json file for a given ID folder.
// The file will have a structure: { "collection": [ "cars", "animals", ... ] }
const updateCollectionInfo = (idDir, collectionName) => {
  const collPath = path.join(idDir, 'collectioninfo.json');
  let collData = { collection: [] };
  if (fs.existsSync(collPath)) {
    try {
      collData = JSON.parse(fs.readFileSync(collPath, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ Could not parse collectioninfo.json in ${idDir}`);
    }
  }
  if (!collData.collection.includes(collectionName)) {
    collData.collection.push(collectionName);
    fs.writeFileSync(collPath, JSON.stringify(collData, null, 2), 'utf-8');
  }
};

// Process a given URL folder (files2, posts, or reels)
// Each file in the folder (e.g., cars.json) represents one collection.
const processUrlFolder = (folderPath) => {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const collectionName = path.basename(file, '.json');
    const fullPath = path.join(folderPath, file);
    let urls;
    try {
      urls = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ Failed to parse ${file}: ${err.message}`);
      continue;
    }
    // Process each URL object in the file
    for (const item of urls) {
      const url = item.url;
      if (!url) continue;

      // Ignore /tv links
      if (url.includes('/tv')) continue;

      // Determine type: Check for reel or post
      let type = null;
      if (url.includes('/reel') || url.includes('/reels')) {
        type = 'reel';
      } else if (url.includes('/p') || url.includes('/post')) {
        type = 'post';
      } else {
        // Unknown type; skip or log
        console.log(`Unknown URL type: ${url}`);
        continue;
      }

      // Extract unique identifier
      const id = extractIdFromUrl(url);
      if (!id) {
        console.warn(`Unable to extract ID from URL: ${url}`);
        continue;
      }

      // Lookup scraped data
      let scrapedData = null;
      if (type === 'post') {
        scrapedData = fol2Map[id];
      } else if (type === 'reel') {
        scrapedData = fol3Map[id];
      }

      // Only process if we have matching scraped data
      if (scrapedData) {
        const idDir = path.join(outputFolder, id);
        ensureDir(idDir);

        // Write scraped data if not already written (or overwrite if desired)
        const dataPath = path.join(idDir, 'data.json');
        if (!fs.existsSync(dataPath)) {
          fs.writeFileSync(dataPath, JSON.stringify(scrapedData, null, 2), 'utf-8');
        }
        // Update (or create) collectioninfo.json and add the current collection name
        updateCollectionInfo(idDir, collectionName);
      } else {
        console.log(`No scraped data found for ID ${id} from URL: ${url}`);
      }
    }
  }
};

const main = () => {
  // Ensure output folder exists
  ensureDir(outputFolder);
  
  // Process all three URL folders
  processUrlFolder(files2Folder);
  processUrlFolder(postsFolder);
  processUrlFolder(reelsFolder);
  
  console.log('✅ Processing complete!');
};

main();
