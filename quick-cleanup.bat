@echo off
echo 🧹 Moving files to backup-archive...

move build-resources backup-archive\ 2>nul
move components backup-archive\ 2>nul
move desktop backup-archive\ 2>nul
move dist backup-archive\ 2>nul
move docs backup-archive\ 2>nul
move emma-automation-service backup-archive\ 2>nul
move Emma-Desktop-Portable backup-archive\ 2>nul
move emma-dxt-extension backup-archive\ 2>nul
move emma-orb-system backup-archive\ 2>nul
move Emma-Simple backup-archive\ 2>nul
move hlm backup-archive\ 2>nul
move icons backup-archive\ 2>nul
move legacy backup-archive\ 2>nul
move lib backup-archive\ 2>nul
move mcp backup-archive\ 2>nul
move models backup-archive\ 2>nul
move node_modules backup-archive\ 2>nul
move scripts backup-archive\ 2>nul
move server backup-archive\ 2>nul
move test backup-archive\ 2>nul
move ui backup-archive\ 2>nul
move vault-revolution backup-archive\ 2>nul
move web-app backup-archive\ 2>nul
move web-demo backup-archive\ 2>nul
move web-emma backup-archive\ 2>nul

echo 📁 Moving individual files...
move *.bat backup-archive\ 2>nul
move *.ps1 backup-archive\ 2>nul
move *.js backup-archive\ 2>nul
move *.cjs backup-archive\ 2>nul
move *.zip backup-archive\ 2>nul
move *.dxt backup-archive\ 2>nul

REM Move specific files
move audit.json backup-archive\ 2>nul
move docker-compose.yml backup-archive\ 2>nul
move jest.config.cjs backup-archive\ 2>nul
move manifest.json backup-archive\ 2>nul

REM Move HTML files except the ones we want to keep
move emma-chat.html backup-archive\ 2>nul
move emma-cloud.html backup-archive\ 2>nul
move auto-generate-icons.html backup-archive\ 2>nul
move check-local-storage.html backup-archive\ 2>nul
move generate-icons.html backup-archive\ 2>nul
move icon-generator.html backup-archive\ 2>nul
move INSTALL.html backup-archive\ 2>nul
move mcp-test-interface.html backup-archive\ 2>nul
move memories-clean.html backup-archive\ 2>nul
move memories-gallery.html backup-archive\ 2>nul
move memories-old.html backup-archive\ 2>nul
move popup-clean.html backup-archive\ 2>nul
move popup-debug-external.html backup-archive\ 2>nul
move popup-debug.html backup-archive\ 2>nul
move popup-minimal.html backup-archive\ 2>nul
move popup-ultra-minimal-fixed.html backup-archive\ 2>nul
move popup-ultra-minimal.html backup-archive\ 2>nul
move simple-vault-test.html backup-archive\ 2>nul
move test-emma-css.html backup-archive\ 2>nul
move test.html backup-archive\ 2>nul
move websocket-client-example.html backup-archive\ 2>nul

REM Move all .md files except README.md
for %%f in (*.md) do (
    if not "%%f"=="README.md" move "%%f" backup-archive\ 2>nul
)

REM Move JSON config files except package files
move claude_desktop_config_fixed.json backup-archive\ 2>nul
move claude_desktop_config.json backup-archive\ 2>nul

echo ✅ Cleanup complete!
echo 📁 Main folder now clean!
