@echo off
echo 🧹 Cleaning up Emma workspace...

REM Move all non-essential files to backup-archive

move audit.json backup-archive\ >nul 2>&1
move AURORA-IMPLEMENTATION.md backup-archive\ >nul 2>&1
move auto-generate-icons.html backup-archive\ >nul 2>&1
move BETA-TESTING-GUIDE.md backup-archive\ >nul 2>&1
move build backup-archive\ >nul 2>&1
move *.bat backup-archive\ >nul 2>&1
move build-resources backup-archive\ >nul 2>&1
move *.md backup-archive\ >nul 2>&1 && echo README.md > README.md
move *.js backup-archive\ >nul 2>&1
move *.html backup-archive\ >nul 2>&1 && copy backup-archive\index.html . >nul 2>&1 && copy backup-archive\working-desktop-dashboard.html . >nul 2>&1
move adapters backup-archive\ >nul 2>&1
move app backup-archive\ >nul 2>&1
move components backup-archive\ >nul 2>&1
move desktop backup-archive\ >nul 2>&1
move dist backup-archive\ >nul 2>&1
move docs backup-archive\ >nul 2>&1
move Emma-Desktop-Portable backup-archive\ >nul 2>&1
move emma-automation-service backup-archive\ >nul 2>&1
move emma-dxt-extension backup-archive\ >nul 2>&1
move emma-orb-system backup-archive\ >nul 2>&1
move Emma-Simple backup-archive\ >nul 2>&1
move hlm backup-archive\ >nul 2>&1
move icons backup-archive\ >nul 2>&1
move legacy backup-archive\ >nul 2>&1
move lib backup-archive\ >nul 2>&1
move mcp backup-archive\ >nul 2>&1
move models backup-archive\ >nul 2>&1
move node_modules backup-archive\ >nul 2>&1
move scripts backup-archive\ >nul 2>&1
move server backup-archive\ >nul 2>&1
move test backup-archive\ >nul 2>&1
move ui backup-archive\ >nul 2>&1
move vault-revolution backup-archive\ >nul 2>&1
move web-app backup-archive\ >nul 2>&1
move web-demo backup-archive\ >nul 2>&1
move web-emma backup-archive\ >nul 2>&1
move *.zip backup-archive\ >nul 2>&1
move *.dxt backup-archive\ >nul 2>&1
move *.yml backup-archive\ >nul 2>&1 && copy backup-archive\render.yaml . >nul 2>&1
move *.json backup-archive\ >nul 2>&1 && copy backup-archive\package.json . >nul 2>&1 && copy backup-archive\package-lock.json . >nul 2>&1
move manifest.json backup-archive\ >nul 2>&1

echo ✅ Workspace cleanup complete!
echo 📁 Main folder now contains only web app + extension files
