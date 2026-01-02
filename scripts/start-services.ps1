# PowerShell script to start all services for Bytemonk Federation

Write-Host "🚀 Starting Bytemonk Federation System..." -ForegroundColor Cyan
Write-Host ""

# Start Users Service
Write-Host "Starting Users Service..." -ForegroundColor Yellow
$usersJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location subgraphs/users
    node index.js
}

# Start Movies Service
Write-Host "Starting Movies Service..." -ForegroundColor Yellow
$moviesJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location subgraphs/movies
    node index.js
}

# Start Reviews Service
Write-Host "Starting Reviews Service..." -ForegroundColor Yellow
$reviewsJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location subgraphs/reviews
    node index.js
}

# Wait for services to start
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Compose supergraph
Write-Host "Composing supergraph..." -ForegroundColor Yellow
try {
    rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
    Write-Host "✅ Supergraph composed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to compose supergraph. Make sure Rover CLI is installed." -ForegroundColor Red
    Write-Host "Install with: npm install -g @apollo/rover" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting Apollo Router..." -ForegroundColor Yellow
Write-Host "Access the web interface at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Access Apollo Router at: http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Start Router (this will block)
try {
    if (Test-Path "router.exe") {
        ./router.exe --config router.yaml --supergraph supergraph.graphql
    } else {
        ./router --config router.yaml --supergraph supergraph.graphql
    }
} catch {
    Write-Host "❌ Failed to start Router. Make sure Apollo Router is downloaded." -ForegroundColor Red
    Write-Host "Download from: https://router.apollo.dev/download" -ForegroundColor Yellow
} finally {
    # Cleanup jobs
    Get-Job | Stop-Job
    Get-Job | Remove-Job
}

