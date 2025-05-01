import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the URL
const url = "http://127.0.0.1:5500/New%20folder/saved_collections.html";

async function scrapeData() {
    try {
        // Fetch the webpage content
        const response = await fetch(url);
        const html = await response.text();

        // Load HTML into cheerio
        const $ = cheerio.load(html);

        let data = [];
        let serialNo = 1;
        let currentCollection = "";

        // Find all collection divs
        $(".pam._3-95._2ph-._a6-g.uiBoxWhite.noborder").each((index, element) => {
            // Check if this div contains a collection name
            const collectionHeader = $(element).find("div._3-95._2pim._a6-h._a6-i").text().trim();
            if (collectionHeader === "Collection") {
                currentCollection = $(element).find("td._2pin._a6_q div div").text().trim();
            } else {
                const linkElement = $(element).find("a");
                if (linkElement.length) {
                    const name = linkElement.text().trim();
                    const link = linkElement.attr("href");

                    data.push({
                        no: serialNo++,
                        name: name,
                        link: link,
                        collection: currentCollection
                    });
                }
            }
        });

        // Convert data to JSON string
        const jsonOutput = JSON.stringify(data, null, 4);

        // Define the output file path
        const outputFilePath = path.join(__dirname, "scraped_collections.json");

        // Write JSON data to a file
        fs.writeFileSync(outputFilePath, jsonOutput, "utf-8");

        console.log(`✅ Data saved to: ${outputFilePath}`);
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Run the function
scrapeData();