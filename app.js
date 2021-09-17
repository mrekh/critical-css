"use strict";

const puppeteer = require("puppeteer");
const CleanCSS = require("clean-css");
const xlsx = require("xlsx");
const fs = require("node:fs");

let mainWorkbook = xlsx.readFile("main.xlsx");
let inputSheet = mainWorkbook.Sheets[mainWorkbook.SheetNames[0]];

// Input URLs for ckecing critical CSS for each of them
let urls = [];
for (let i = 2; ; i++) {
  if (inputSheet[`A${i}`] === undefined) break;
  urls.push(inputSheet[`A${i}`].v);
}

// Selected devices for emulating
let devices = [];
if (inputSheet["C2"].v === true) devices.push("");
for (let i = 2; ; i++) {
  if (inputSheet[`D${i}`] === undefined) break;
  devices.push(inputSheet[`D${i}`].v);
}

// The critical CSS output file name
let outputFileName = inputSheet["G2"].v;

// Coverage variable to store data of emulating each URL with different divices
let coverages = [];

// The function to check CSS coverage of each URL with emulating then on different divices
async function urlCoverage(urls, devices) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Get coverage for each URL on input divices
  for (let url of urls) {
    for (let device of devices) {
      if (device !== "") await page.emulate(puppeteer.devices[device]);

      // Enable CSS coverage
      await Promise.all([page.coverage.startCSSCoverage()]);

      // Navigate to page
      await page.goto(url, { waitUntil: "networkidle2" });

      // Disable CSS coverage
      const coverage = await Promise.all([page.coverage.stopCSSCoverage()]);

      coverages.push(coverage);
      if (device === "") console.log(`Emulating ${url} on the desktop done!`);
      if (device !== "") console.log(`Emulating ${url} on the ${device} done!`);
    }
  }
  await browser.close();
}

// Merge all critical CSSs together and cleanup them with clean-css package
function cssCoverage(coverages) {
  let criticalCSS = "";

  coverages.flat(2).forEach((coverage) => {
    coverage.ranges.forEach((range) => {
      criticalCSS += coverage.text.slice(range.start, range.end) + "\n";
    });
  });

  let cleanCSSoption = { level: 2 };
  let cleanCSS = new CleanCSS(cleanCSSoption).minify(criticalCSS);

  console.log(
    `${outputFileName}.css file size: ${cleanCSS.stats.minifiedSize} bytes`
  );

  fs.writeFile(`./new-assets/${outputFileName}.css`, cleanCSS.styles, (err) => {
    if (err) throw err;
  });
}

// Final step!
urlCoverage(urls, devices).then(() => {
  cssCoverage(coverages);
  console.log("\nNow you are one step closer to 100 PSI score 🚀");
});
