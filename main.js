import axios from 'axios';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const inputFolder = path.join(__dirname, 'fol1');
const outputFolder = path.join(__dirname, 'fol2');
const datasetId = 'gd_lk5ns7kz21pck8jpis';
const apiToken = '369aefb6df29a76952e9a914d020d7368afe5a7ad5dc82bcce8ea840ac0eb295';

const headers = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
};

const baseUrl = 'https://api.brightdata.com/datasets/v3';

if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

// Utils
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const chunkArray = (arr, size) =>
    arr.reduce((acc, _, i) => (i % size === 0 ? [...acc, arr.slice(i, i + size)] : acc), []);

// Snapshot collection
const snapshotTasks = [];

const triggerOnly = async (batch, batchIndex, file) => {
    try {
        console.log(`🚀 Triggering batch ${batchIndex + 1}`);
        const snapshotId = await triggerSnapshot(batch);
        snapshotTasks.push({
            snapshotId,
            outFile: path.join(
                outputFolder,
                `${path.basename(file, '.json')}_batch${batchIndex + 1}.json`
            ),
        });
    } catch (err) {
        console.error(`❌ Batch ${batchIndex + 1} trigger failed: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
    }
};

const triggerSnapshot = async (urls) => {
    const payload = urls.map(u => ({ url: u }));
    const res = await axios.post(
        `${baseUrl}/trigger?dataset_id=${datasetId}&include_errors=true`,
        JSON.stringify(payload),
        { headers }
    );
    return res.data.snapshot_id;
};

const downloadJson = async (snapshotId, outPath) => {
    const res = await axios.get(`${baseUrl}/snapshot/${snapshotId}?format=json`, {
        headers,
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(outPath);
    res.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log(`✅ Saved snapshot to ${outPath}`);
            resolve();
        });
        writer.on('error', reject);
    });
};

const askToContinue = () => {
    return new Promise(resolve => {
        process.stdout.write("Pull data now? (y): ");
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', data => {
            resolve(data.trim().toLowerCase() === 'y');
        });
    });
};

const downloadAllSnapshots = async () => {
    for (const task of snapshotTasks) {
        try {
            let status = 'running';
            while (status === 'running') {
                console.log(`⏳ Snapshot ${task.snapshotId} still running...`);
                await wait(100);
                const res = await axios.get(`${baseUrl}/snapshot/${task.snapshotId}`, { headers });
                status = res.data.status;
            }

            await downloadJson(task.snapshotId, task.outFile);
        } catch (err) {
            console.error(`❌ Failed to download ${task.snapshotId}: ${err.message}`);
        }
    }
};

// Concurrency control
const runWithConcurrency = async (tasks, limit) => {
    const queue = [...tasks];
    const running = [];

    const runNext = async () => {
        if (queue.length === 0) return;
        const nextTask = queue.shift();
        const promise = nextTask().finally(() => {
            running.splice(running.indexOf(promise), 1);
        });
        running.push(promise);

        if (running.length < limit) {
            await runNext();
        } else {
            await Promise.race(running);
            await runNext();
        }
    };

    await Promise.all(Array(limit).fill().map(runNext));
};

// MAIN
const main = async () => {
    console.log(`📂 Reading input from: ${inputFolder}`);
    const files = await fsPromises.readdir(inputFolder);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
        console.log('⚠️ No .json files found in fol1!');
        return;
    }

    for (const file of jsonFiles) {
        const filePath = path.join(inputFolder, file);
        const raw = await fsPromises.readFile(filePath, 'utf8');
        const items = JSON.parse(raw);

        const urls = items.map(item => item.url || item.link).filter(Boolean);
        const chunks = chunkArray(urls, 50);

        console.log(`📄 Processing file "${file}" (${urls.length} links in ${chunks.length} batches)`);

        const triggerTasks = chunks.map((batch, i) => () => triggerOnly(batch, i, file));
        await runWithConcurrency(triggerTasks, 15);

        console.log(`📬 All batches for "${file}" triggered.`);

        const proceed = await askToContinue();
        if (proceed) {
            await downloadAllSnapshots();
            console.log('✅ All batches downloaded.');
        } else {
            console.log('⏹️ Skipping downloads.');
        }

        snapshotTasks.length = 0;
    }

    process.exit();
};

main();
