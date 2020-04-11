const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const readline = require('readline');
const cwait = require('cwait');

const MAX_SIMULTANEOUS_DOWNLOADS = 20;
const SCRAPED_DATA_FILE_NAME = 'RAL.csv';

async function colorScrapeBatch() {
    const readStream = fs.createReadStream(SCRAPED_DATA_FILE_NAME);
    let writeStream;

    const rl = readline.createInterface({
        input: readStream
    });

    // Vars to use when creating links to scrape
    let red = 0, green = 0, blue = 0;
    let rgbLinks = [];

    // Check for the content of the last line of the written file
    let lastLine = '';
    for await (const line of rl) {
        if (line == '' || line == require("os").EOL) {
            return;
        }
        lastLine = line;
    }

    if (lastLine != '') {
        console.log(`Last recorded line: ${lastLine}`);
        const csvLineArray = lastLine.split(',');
        // Check if it's a rgb value else it's the title
        if (csvLineArray[0].match(/(\d{1,3})-(\d{1,3})-(\d{1,3})/g)) {
            const rgbVals = csvLineArray[0].split('-');
            // Set to the next rgb color
            
            // Add 1 to blue
            rgbVals[2] = Number(rgbVals[2]) + 1;
            
            // If blue is at 255 add 1 to green
            // and set blue to 0
            if (rgbVals[2] >= 255) {
                rgbVals[1] = Number(rgbVals[1]) + 1;
                rgbVals[2] = 0;
            }

            // If green is at 255 add 1 to red
            // and set green to 0
            if (rgbVals[1] >= 255) {
                rgbVals[0] = Number(rgbVals[0]) + 1;
                rgbVals[1] = 0;
            }

            // Set values for loop continuation
            red = rgbVals[0];
            green = rgbVals[1];
            blue = rgbVals[2];
        }
        console.log(`New set values: ${red}-${green}-${blue}`);
    }

    // If red, green or blue values have changed append to file instead of writing
    if (red == 0 && green == 0 && blue == 0) {
        writeStream = fs.createWriteStream(SCRAPED_DATA_FILE_NAME);
        // Write Headers for file
        writeStream.write(`RGB,HEX,RAL\n`);
    } else {
        writeStream = fs.createWriteStream(SCRAPED_DATA_FILE_NAME, {
            flags: 'a'
        });
    }

    // Loop through every rgb value
    // and request the webpage to scrape
    for (red; red <= 255; red++) {
        for (green; green <= 255; green++) {
            for (blue; blue <= 255; blue++) {
                rgbLinks.push(`https://rgb.to/${red},${green},${blue}`);
            }
            // Try to get request every end of loop
            try {
                // Queue simultaneous requests
                const queue = new cwait.TaskQueue(Promise, MAX_SIMULTANEOUS_DOWNLOADS);
                // Get array of responses
                const responses = await Promise.all(
                    rgbLinks.map(
                        queue.wrap(async rgbLink => await axios.get(rgbLink))
                    )
                );
                // Loop through each response
                responses.forEach(response => {
                    if (response.hasOwnProperty('data')) {
                        // Load html
                        const $ = cheerio.load(response['data']);

                        // Scrape data from the website
                        const RAL = $('#RAL').val();
                        // Replace rgb commas to hyphen's for csv formatting
                        const RGB = $('#RGB').val().replace(/, /g, '-');
                        const HEX = $('#HEX').val();

                        console.log(`${RGB},${HEX},${RAL}`);

                        // Write row to CSV
                        writeStream.write(`${RGB},${HEX},${RAL}\n`);
                    }
                });
            } catch (err) {
                console.error(err);
            }

            // Empty rgbLinks array
            rgbLinks = [];

            // Reset blue counter
            blue = 0;
        }
        // Reset green counter
        green = 0;
    }
}

colorScrapeBatch();