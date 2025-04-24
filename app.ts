"use strict";

import CleanCSS from "clean-css";
import * as fs from "node:fs";
import * as path from "node:path"; // Import path for joining paths
import puppeteer, { CoverageEntry, KnownDevices } from "puppeteer";
import * as xlsx from "xlsx";

type DeviceName = string;

interface CoverageData {
  coverage: CoverageEntry[];
  url: string;
  device: DeviceName | "desktop"; // Use 'desktop' for the default case
}

const mainWorkbook = xlsx.readFile("main.xlsx");
const inputSheet = mainWorkbook.Sheets[mainWorkbook.SheetNames[0]];

if (!inputSheet) {
  throw new Error("Could not find the first sheet in main.xlsx");
}

// Input URLs for checking critical CSS
const urls: string[] = [];
for (let i = 2; ; i++) {
  const cellAddress = `A${i}`;
  const cell = inputSheet[cellAddress];
  if (!cell || !cell.v) break; // Stop if cell or value is missing
  urls.push(String(cell.v)); // Ensure value is string
}

// Selected devices for emulating
const devices: DeviceName[] = [];
// Check if Desktop (no specific device) is selected
const desktopCell = inputSheet["C2"];
const useDesktop = desktopCell && desktopCell.v === 1;

// Read device names
for (let i = 2; ; i++) {
  const cellAddress = `D${i}`;
  const cell = inputSheet[cellAddress];
  if (!cell || !cell.v) break;
  devices.push(String(cell.v));
}

// The critical CSS output file name
const outputFileNameCell = inputSheet["G2"];
if (!outputFileNameCell || !outputFileNameCell.v) {
  throw new Error("Output file name not found in cell G2");
}
const outputFileName: string = String(outputFileNameCell.v);

// Ensure the output directory exists
const outputDir = "./new-assets";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

// Coverage variable to store data
const coverages: CoverageData[] = [];

// Function to check CSS coverage
async function urlCoverage(
  urlsToCheck: string[],
  devicesToEmulate: DeviceName[],
  emulateDesktop: boolean
): Promise<void> {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();

    for (const url of urlsToCheck) {
      const devicesForUrl = emulateDesktop
        ? ["desktop", ...devicesToEmulate]
        : devicesToEmulate;

      for (const device of devicesForUrl) {
        try {
          if (device !== "desktop") {
            const deviceDefinition =
              KnownDevices[device as keyof typeof KnownDevices];
            if (!deviceDefinition) {
              console.warn(
                `Warning: Device "${device}" not found in Puppeteer's KnownDevices. Skipping emulation.`
              );
              await page.setViewport({ width: 1920, height: 1080 }); // Default viewport
            } else {
              await page.emulate(deviceDefinition);
            }
          } else {
            // Reset emulation or set a default viewport for desktop
            await page.setViewport({ width: 1920, height: 1080 }); // Example desktop size
          }

          // Enable CSS coverage
          await page.coverage.startCSSCoverage();

          // Navigate to page
          console.log(
            `Navigating to ${url} ${
              device !== "desktop" ? `on ${device}` : "on desktop"
            }...`
          );
          await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 }); // Added timeout

          // Disable CSS coverage
          const cssCoverage = await page.coverage.stopCSSCoverage();

          coverages.push({ coverage: cssCoverage, url, device });
          console.log(`Emulation for ${url} on ${device} done!`);
        } catch (error) {
          console.error(`Error processing ${url} on ${device}:`, error);
          // Optionally collect error information or skip to the next
        }
      }
    }
  } finally {
    await browser.close();
  }
}

// Merge all critical CSSs together and cleanup
function processCssCoverage(coverageData: CoverageData[]): void {
  let criticalCSS = "";

  coverageData.forEach((data) => {
    data.coverage.forEach((entry) => {
      // entry is a CoverageEntry
      entry.ranges.forEach((range) => {
        criticalCSS += entry.text.slice(range.start, range.end) + "\n";
      });
    });
  });

  const cleanCSSOptions: CleanCSS.OptionsOutput = { level: 2 };
  const cleanCSS = new CleanCSS(cleanCSSOptions).minify(criticalCSS);

  if (cleanCSS.errors.length > 0) {
    console.error("CleanCSS Errors:", cleanCSS.errors);
  }
  if (cleanCSS.warnings.length > 0) {
    console.warn("CleanCSS Warnings:", cleanCSS.warnings);
  }

  console.log(
    `Output file size (${outputFileName}.css): ${cleanCSS.stats.minifiedSize} bytes`
  );

  const outputPath = path.join(outputDir, `${outputFileName}.css`); // Use path.join for cross-platform compatibility
  fs.writeFile(outputPath, cleanCSS.styles, (err) => {
    if (err) {
      console.error(`Error writing file ${outputPath}:`, err);
      throw err; // Rethrow after logging
    }
    console.log(`Successfully wrote critical CSS to ${outputPath}`);
  });
}

// Final step!
async function main() {
  try {
    console.log("Starting CSS coverage analysis...");
    await urlCoverage(urls, devices, useDesktop);
    console.log("Processing collected CSS coverage...");
    processCssCoverage(coverages);
    console.log("\nNow you are one step closer to 100 PSI score 🚀");
  } catch (error) {
    console.error("An error occurred during the process:", error);
    process.exit(1); // Exit with error code
  }
}

main();
