const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const writeStream = fs.createWriteStream('RAL.csv');

writeStream.write(`RAL,RGB,HEX\n`)

async function colorScrape() {
    // Loop through every rgb value
    // and request the webpage to scrape
    let red, green, blue;

    for (red = 0; red <= 255; red++) {
        for (green = 0; green <= 255; green++) {
            for (blue = 0; blue <= 255; blue++) {

                // Construct the URL with the loop variables
                const res = await axios.get(`https://rgb.to/${red},${green},${blue}`);
                const $ = await cheerio.load(res.data);

                // Scrape data from the website
                const RAL = $('#RAL').val();
                // Replace rgb commas to hyphen's for csv formatting
                const RGB = $('#RGB').val().replace(/, /g, '-');
                const HEX = $('#HEX').val();

                console.log(`${RAL}, ${RGB}, ${HEX}`);

                // Write row to CSV
                writeStream.write(`${RAL},${RGB},${HEX}\n`);
            }
        }
    }
}

colorScrape();