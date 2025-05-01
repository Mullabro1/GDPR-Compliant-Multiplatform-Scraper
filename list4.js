import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder paths
const collectionsDir = path.join(__dirname, 'collections');
const outputDirs = {
    post: path.join(__dirname, 'posts'),
    reel: path.join(__dirname, 'reels'),
    tv: path.join(__dirname, 'tv')
};

// Ensure output folders exist
Object.values(outputDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

const getTypeFromUrl = (url) => {
    if (url.includes('/reel/')) return 'reel';
    if (url.includes('/p/')) return 'post';
    if (url.includes('/tv/')) return 'tv';
    return null;
};

const categorizeCollections = async () => {
    const files = await fsPromises.readdir(collectionsDir);

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(collectionsDir, file);
        const content = await fsPromises.readFile(filePath, 'utf8');
        const urls = JSON.parse(content);

        const categorized = {
            post: [],
            reel: [],
            tv: []
        };

        for (const item of urls) {
            const type = getTypeFromUrl(item.url);
            if (type) {
                categorized[type].push(item);
            }
        }

        for (const type in categorized) {
            if (categorized[type].length > 0) {
                const outputPath = path.join(outputDirs[type], file);
                await fsPromises.writeFile(outputPath, JSON.stringify(categorized[type], null, 4), 'utf8');
                console.log(`✅ Saved ${categorized[type].length} ${type}s to ${outputPath}`);
            }
        }
    }

    console.log('🎉 Done categorizing all collections!');
};

categorizeCollections();
