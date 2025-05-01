import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CONFIGURATION
const SCRAPED_DIR = path.join(__dirname, 'scraped'); // Root folder with subfolders per post (ID)
const MAX_CONCURRENT_DOWNLOADS = 50; // Maximum concurrent downloads per folder

// Helper: Get file extension from URL; default ".bin" if none can be determined.
function getFileExtension(url) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname);
    return ext ? ext.split('?')[0] : '.bin';
  } catch (err) {
    return '.bin';
  }
}

// Helper: Download a file from URL to a given savePath.
async function downloadFile(url, savePath) {
  try {
    const response = await fetch(url, { timeout: 15000 });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const buffer = await response.buffer();
    await fs.writeFile(savePath, buffer);
    console.log(`✅ Downloaded: ${savePath}`);
  } catch (err) {
    console.error(`❌ Error downloading ${url}: ${err.message}`);
  }
}

// Helper: Run async tasks in batches, limited to batchSize concurrent downloads.
async function runInBatches(tasks, batchSize) {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map(fn => fn());
    await Promise.all(batch);
    // Optionally, pause between batches if needed:
    // await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Extract CDN links from the post data.  
// (You may adjust or add fields if needed.)
function extractCdnLinks(postData) {
  const links = new Set();

  if (Array.isArray(postData.photos)) {
    postData.photos.forEach(url => url && links.add(url));
  }
  if (Array.isArray(postData.videos)) {
    postData.videos.forEach(url => url && links.add(url));
  }
  if (postData.thumbnail) {
    links.add(postData.thumbnail);
  }
  if (typeof postData.video_url === 'string') {
    links.add(postData.video_url);
  }
  if (Array.isArray(postData.post_content)) {
    postData.post_content.forEach(item => {
      if (item.url) links.add(item.url);
    });
  }
  if (Array.isArray(postData.videos_duration)) {
    postData.videos_duration.forEach(item => {
      if (item.url) links.add(item.url);
    });
  }
  // Add other fields if needed.
  return Array.from(links);
}

// Process a single post folder
async function processPostFolder(folderName) {
  const folderPath = path.join(SCRAPED_DIR, folderName);
  const dataJsonPath = path.join(folderPath, 'data.json');

  try {
    const rawData = await fs.readFile(dataJsonPath, 'utf-8');
    const postData = JSON.parse(rawData);
    const cdnLinks = extractCdnLinks(postData);

    console.log(`\n📁 Folder ${folderName}: found ${cdnLinks.length} CDN link(s).`);

    // Prepare download tasks.
    const tasks = [];
    cdnLinks.forEach((url, index) => {
      const ext = getFileExtension(url);
      const fileName = `${folderName}_${index}${ext}`;
      const savePath = path.join(folderPath, fileName);
      tasks.push(async () => {
        try {
          // Check if the file already exists.
          await fs.access(savePath);
          console.log(`🔁 Already exists: ${savePath}`);
        } catch (err) {
          // File does not exist; download it.
          await downloadFile(url, savePath);
        }
      });
    });

    // Download in batches (up to MAX_CONCURRENT_DOWNLOADS at once).
    await runInBatches(tasks, MAX_CONCURRENT_DOWNLOADS);
  } catch (err) {
    console.error(`❌ Failed processing folder ${folderName}: ${err.message}`);
  }
}

// Main: Loop through all subfolders under "scraped/" and process each.
async function main() {
  try {
    const dirEntries = await fs.readdir(SCRAPED_DIR, { withFileTypes: true });
    const folderNames = dirEntries.filter(ent => ent.isDirectory()).map(ent => ent.name);
    
    console.log(`📂 Found ${folderNames.length} folders. Starting CDN downloads...`);

    // Process folders sequentially so that each folder's downloads run concurrently up to MAX_CONCURRENT_DOWNLOADS.
    for (const folder of folderNames) {
      await processPostFolder(folder);
    }
    
    console.log(`\n🎉 Completed CDN downloads across all folders.`);
  } catch (err) {
    console.error(`❌ Error in main: ${err.message}`);
  }
}

main().catch(console.error);
