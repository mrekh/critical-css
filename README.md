# Extracting Critical CSS

This application, written in TypeScript, allows you to emulate website URLs on various devices (or just desktop) and extract their critical CSS.

## Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- [pnpm](https://pnpm.io/installation) (Install globally using `npm install -g pnpm`)

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd critical-css
   ```
2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```

## Configuration

1. Open the `main.xlsx` file.
2. **URLs**: In the first sheet (`Sheet1`), list the URLs you want to analyze in column `A`, starting from cell `A2`.
3. **Desktop Emulation**: In cell `C2`, enter `1` if you want to emulate a standard desktop viewport, or `0` (or leave empty) if not.
4. **Mobile/Tablet Devices**: In column `D`, starting from cell `D2`, list the names of the devices you want to emulate (e.g., 'iPhone 13', 'iPad Mini'). These names must exactly match the identifiers available in Puppeteer's `KnownDevices`. You can find a list in the Puppeteer documentation or source code. If a device name is not found, a warning will be logged, and a default desktop viewport will be used for that entry.
5. **Output Filename**: In cell `G2`, specify the desired base name for the output CSS file (e.g., `critical-styles`). The final file will be saved as `<your-name>.css`.

## Usage

1. **Build the TypeScript code:**
   ```bash
   pnpm build
   ```
2. **Run the application:**
   ```bash
   pnpm start
   ```

   Alternatively, you can build and run in one step:
   ```bash
   pnpm dev
   ```

## Output

The application will process each URL with the specified device emulations (and desktop, if selected). It will then combine the CSS used across all pages and devices, minify it, and save it to the `./new-assets/` directory with the filename configured in `main.xlsx` (e.g., `./new-assets/critical-styles.css`). Progress and any errors will be logged to the console.
