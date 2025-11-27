# E-Office Final Setup Script
# Refresh PATH and continue

Write-Host "========================================"
Write-Host "E-OFFICE - FINAL SETUP"
Write-Host "========================================"
Write-Host ""

# Refresh PATH
Write-Host "Refreshing environment variables..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check Node.js again
Write-Host "Checking Node.js..."
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js still not found!"
    Write-Host ""
    Write-Host "Please:"
    Write-Host "1. Close ALL PowerShell windows"
    Write-Host "2. Open NEW PowerShell"
    Write-Host "3. Run: .\auto-setup.ps1"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "OK: Node.js $nodeVersion"
Write-Host ""

# Check Docker
Write-Host "Checking Docker..."
docker ps >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker not running!"
    Write-Host "Please start Docker Desktop and run this script again."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK: Docker running"
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies (this may take 5-10 minutes)..."

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "  Backend..."
    cd backend
    npm install
    cd ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "  Frontend..."
    cd frontend
    npm install
    cd ..
}

if (-not (Test-Path "license-server/node_modules")) {
    Write-Host "  License Server..."
    cd license-server
    npm install
    cd ..
}

Write-Host "OK: Dependencies installed"
Write-Host ""

# Start database
Write-Host "Starting database..."
docker-compose up -d
Write-Host "  Waiting 15 seconds..."
Start-Sleep -Seconds 15
Write-Host "OK: Database started"
Write-Host ""

# Setup database
if (-not (Test-Path "backend/.setup-done")) {
    Write-Host "Setting up database..."
    cd backend
    
    Write-Host "  Migrations..."
    npx prisma generate
    npx prisma db push --accept-data-loss
    
    Write-Host "  Seeding..."
    node scripts/seed.js
    node scripts/seed-rbac.js
    node scripts/seed-workflows.js
    
    "Done" | Out-File ".setup-done"
    cd ..
    Write-Host "OK: Database ready"
}
else {
    Write-Host "OK: Database already setup"
}
Write-Host ""

# Start services
Write-Host "Starting services..."

Write-Host "  License Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\license-server'; npm run dev"
Start-Sleep -Seconds 3

Write-Host "  Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"
Start-Sleep -Seconds 8

Write-Host "  Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
Start-Sleep -Seconds 12

Write-Host ""
Write-Host "========================================"
Write-Host "SUCCESS!"
Write-Host "========================================"
Write-Host ""
Write-Host "Frontend:  http://localhost:3000"
Write-Host "Backend:   http://localhost:4000"
Write-Host ""
Write-Host "Login:"
Write-Host "  admin@acme.local / password123"
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "DONE! Check the 3 terminals."
Write-Host ""
