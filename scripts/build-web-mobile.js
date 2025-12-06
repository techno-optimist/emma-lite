#!/usr/bin/env node
/**
 * Build static web bundle for mobile WebView.
 * Copies the current web assets into mobile/www so Capacitor can serve them.
 * Non-destructive to the existing web app; only writes inside mobile/www.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const destinationRoot = path.join(projectRoot, 'mobile', 'www');

// Root-level files to include in the mobile bundle.
const rootFiles = [
  'index.html',
  'dashboard.html',
  'add-person.html',
  'emma-cloud.html',
  'favicon.svg',
  '_headers',
  'emma-agent.js'
];

// Directories to include recursively.
const directories = [
  'css',
  'js',
  'themes',
  'pages',
  'data',
  'apps',
  'lib',
  'legacy',
  'emma-vault-extension-fixed'
];

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function copyEntry(source, destination) {
  const stats = await fs.promises.stat(source);
  if (stats.isDirectory()) {
    await fs.promises.cp(source, destination, { recursive: true });
  } else if (stats.isFile()) {
    await ensureDir(path.dirname(destination));
    await fs.promises.copyFile(source, destination);
  }
}

async function main() {
  try {
    await fs.promises.rm(destinationRoot, { recursive: true, force: true });
    await ensureDir(destinationRoot);

    // Copy root files if they exist.
    for (const file of rootFiles) {
      const source = path.join(projectRoot, file);
      if (fs.existsSync(source)) {
        const dest = path.join(destinationRoot, file);
        await copyEntry(source, dest);
        console.log(`Copied file: ${file}`);
      }
    }

    // Copy directories if they exist.
    for (const dir of directories) {
      const source = path.join(projectRoot, dir);
      if (fs.existsSync(source)) {
        const dest = path.join(destinationRoot, dir);
        await copyEntry(source, dest);
        console.log(`Copied directory: ${dir}`);
      }
    }

    console.log(`\nMobile web bundle prepared at: ${destinationRoot}`);
  } catch (err) {
    console.error('Failed to build mobile web bundle:', err);
    process.exit(1);
  }
}

main();
