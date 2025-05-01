import axios from 'axios';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths and API setup
const outputFolder = path.join(__dirname, 'fol_1');
const csvFolder = path.join(__dirname, 'fol_2'); // Folder for the CSV
const baseUrl = "https://api.brightdata.com/datasets/v3";
const apiToken = "Bearer f1b61134-8d48-4249-8e40-985abf38841d";
const headers = {
    "Authorization": apiToken,
    "Content-Type": "application/json"
};

// Ensure the 'csv' folder exists
if (!fs.existsSync(csvFolder)) {
    fs.mkdirSync(csvFolder);
}

// Function to fetch LinkedIn URLs and trigger dataset creation
const fetchDataAndTriggerSnapshot = async (jsonFilePath) => {
    try {
        // Read the JSON file from the 'output' folder
        const data = await fsPromises.readFile(jsonFilePath, 'utf8');
        const urls = JSON.parse(data); // Parse the JSON data

        // Trigger dataset creation
        const triggerUrl = `${baseUrl}/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true`;
        const response = await axios.post(triggerUrl, urls, { headers });

        console.log('Dataset trigger successful:', response.data);
        return response.data;

    } catch (error) {
        console.error('Error triggering the dataset:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Function to fetch CSV data after waiting until the snapshot is ready
const fetchCSVWhenReady = async (snapshotId, outputFilePath) => {
    try {
        const snapshotUrl = `${baseUrl}/snapshot/${snapshotId}?format=csv`;
        let status = 'running';

        // Poll snapshot status every 15 seconds
        while (status === 'running') {
            console.log('Snapshot is still running. Waiting for 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 15 seconds

            // Check snapshot status
            const statusResponse = await axios.get(snapshotUrl, { headers });
            status = statusResponse.data.status;
            console.log(`Current snapshot status: ${status}`);
        }

        // Download CSV if snapshot is ready
        if (status !== 'running') {
            console.log('Snapshot is ready. Fetching CSV...');
            const csvResponse = await axios.get(snapshotUrl, { headers, responseType: 'stream' });
            const writer = fs.createWriteStream(outputFilePath);

            csvResponse.data.pipe(writer);

            writer.on('finish', () => {
                console.log(`CSV file saved to: ${outputFilePath}`);
            });

            writer.on('error', (err) => {
                console.error('Error saving the CSV file:', err);
            });
        }

    } catch (error) {
        console.error('Error fetching snapshot or CSV data:', error.message);
    }
};

// Main function to process multiple files in parallel
const main = async () => {
    try {
        const files = await fsPromises.readdir(outputFolder);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        const tasks = jsonFiles.map(async (file) => {
            const jsonFilePath = path.join(outputFolder, file);
            const outputFilePath = path.join(csvFolder, `${path.basename(file, '.json')}.csv`);

            console.log(`Processing file: ${file}`);
            const responseData = await fetchDataAndTriggerSnapshot(jsonFilePath);

            if (responseData && responseData.snapshot_id) {
                await fetchCSVWhenReady(responseData.snapshot_id, outputFilePath);
            }
        });

        await Promise.all(tasks);
        console.log('All files have been processed.');
    } catch (error) {
        console.error('Error processing files:', error.message);
    }
};

main();
