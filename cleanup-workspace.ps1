# Emma Workspace Cleanup Script
# Moves non-essential files to backup-archive folder

Write-Host "🧹 Cleaning up Emma workspace..." -ForegroundColor Green

# Files and folders to KEEP in main directory
$keepItems = @(
    "index.html",
    "working-desktop-dashboard.html", 
    "js",
    "css", 
    "pages",
    "emma-vault-extension",
    "render.yaml",
    "package.json",
    "package-lock.json", 
    "README.md",
    "LICENSE",
    "backup-archive",
    ".cursor",
    "cleanup-workspace.ps1"
)

# Get all items in current directory
$allItems = Get-ChildItem -Name

# Move items not in keep list to backup
foreach ($item in $allItems) {
    if ($item -notin $keepItems) {
        Write-Host "📦 Moving $item to backup-archive\" -ForegroundColor Yellow
        try {
            Move-Item $item "backup-archive\" -Force
        }
        catch {
            Write-Host "⚠️  Could not move $item - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "✅ Workspace cleanup complete!" -ForegroundColor Green
Write-Host "📁 Main folder now contains only web app + extension files" -ForegroundColor Cyan
