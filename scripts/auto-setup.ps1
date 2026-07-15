# E-Office Auto Setup Script
# Tu dong cai Node.js neu chua co

Write-Host "========================================"
Write-Host "E-OFFICE - AUTO SETUP"
Write-Host "========================================"
Write-Host ""

# ============================================
# BUOC 1: KIEM TRA VA CAI NODE.JS
# ============================================
Write-Host "Step 1: Checking Node.js..."

$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $nodeInstalled = $true
        Write-Host "OK: Node.js already installed ($nodeVersion)"
    }
} catch {
    $nodeInstalled = $false
}

if (-not $nodeInstalled) {
    Write-Host "Node.js not found. Installing..."
    Write-Host ""
    
    # Tai Node.js LTS
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    $installerPath = "$env:TEMP\nodejs-installer.msi"
    
    Write-Host "  Downloading Node.js v20.10.0..."
    Write-Host "  This may take 2-5 minutes..."
    
    try {
        # Download
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "  Download complete!"
        
        # Install
        Write-Host "  Installing Node.js..."
        Write-Host "  Please wait and click through the installer..."
        Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /qn /norestart" -Wait
        
        # Cleanup
        Remove-Item $installerPath -Force
        
        Write-Host "  Node.js installed!"
        Write-Host ""
        Write-Host "IMPORTANT: Please close this window and run the script again!"
        Write-Host "Press Enter to exit..."
        Read-Host
        exit 0
        
    } catch {
        Write-Host "ERROR: Failed to install Node.js automatically"
        Write-Host ""
        Write-Host "Please install manually:"
        Write-Host "1. Go to: https://nodejs.org/"
        Write-Host "2. Download LTS version"
        Write-Host "3. Install and restart PowerShell"
        Write-Host "4. Run this script again"
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""

# ============================================
# BUOC 2: KIEM TRA DOCKER
# ============================================
Write-Host "Step 2: Checking Docker..."

docker ps >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker not running!"
    Write-Host ""
    Write-Host "Please:"
    Write-Host "1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    Write-Host "2. Start Docker Desktop"
    Write-Host "3. Wait for green icon in system tray"
    Write-Host "4. Run this script again"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "OK: Docker is running"
Write-Host ""

# ============================================
# BUOC 3: CAI DEPENDENCIES
# ============================================
Write-Host "Step 3: Installing dependencies..."

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "  Installing backend..."
    cd backend
    npm install --silent
    cd ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "  Installing frontend..."
    cd frontend
    npm install --silent
    cd ..
}

if (-not (Test-Path "license-server/node_modules")) {
    Write-Host "  Installing license-server..."
    cd license-server
    npm install --silent
    cd ..
}

Write-Host "OK: Dependencies installed"
Write-Host ""

# ============================================
# BUOC 4: KHOI DONG DATABASE
# ============================================
Write-Host "Step 4: Starting database..."

docker-compose up -d
Write-Host "  Waiting 15 seconds for database to be ready..."
Start-Sleep -Seconds 15

Write-Host "OK: Database started"
Write-Host ""

# ============================================
# BUOC 5: SETUP DATABASE
# ============================================
Write-Host "Step 5: Setting up database..."

if (-not (Test-Path "backend/.setup-done")) {
    cd backend
    
    Write-Host "  Running migrations..."
    npx prisma generate
    npx prisma db push --accept-data-loss
    
    Write-Host "  Seeding data..."
    node scripts/seed.js 2>$null
    node scripts/seed-rbac.js 2>$null
    node scripts/seed-workflows.js 2>$null
    
    "Done" | Out-File ".setup-done"
    cd ..
    Write-Host "OK: Database setup complete"
}
else {
    Write-Host "OK: Database already setup (skip)"
}

Write-Host ""

# ============================================
# BUOC 6: KHOI DONG SERVICES
# ============================================
Write-Host "Step 6: Starting services..."

Write-Host "  Starting License Server (port 3001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\license-server'; npm run dev"
Start-Sleep -Seconds 3

Write-Host "  Starting Backend API (port 4000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"
Start-Sleep -Seconds 8

Write-Host "  Starting Frontend (port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
Start-Sleep -Seconds 12

Write-Host ""
Write-Host "========================================"
Write-Host "SUCCESS! ALL SERVICES STARTED!"
Write-Host "========================================"
Write-Host ""
Write-Host "URLs:"
Write-Host "  Frontend:  http://localhost:3000"
Write-Host "  Backend:   http://localhost:4000"
Write-Host "  License:   http://localhost:3001"
Write-Host ""
Write-Host "Login Credentials:"
Write-Host "  Email:    admin@acme.local"
Write-Host "  Password: set DEMO_ADMIN_PASSWORD before running the seed"
Write-Host ""
Write-Host "Opening browser in 3 seconds..."
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "DONE! Check the 3 opened terminals for logs."
Write-Host "To stop: Run stop-all.ps1"
Write-Host ""
