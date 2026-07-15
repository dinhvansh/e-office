# E-Office Quick Start Script

Write-Host "========================================"
Write-Host "E-OFFICE - QUICK START"
Write-Host "========================================"
Write-Host ""

# Check Docker
Write-Host "Checking Docker..."
docker ps >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker not running!"
    Write-Host "Please start Docker Desktop first."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK: Docker is running"
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..."

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "  Installing backend..."
    cd backend
    npm install
    cd ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "  Installing frontend..."
    cd frontend
    npm install
    cd ..
}

if (-not (Test-Path "license-server/node_modules")) {
    Write-Host "  Installing license-server..."
    cd license-server
    npm install
    cd ..
}

Write-Host "OK: Dependencies installed"
Write-Host ""

# Start database
Write-Host "Starting database..."
docker-compose up -d postgres redis
Write-Host "  Waiting 10 seconds..."
Start-Sleep -Seconds 10
Write-Host "OK: Database started"
Write-Host ""

# Setup database
if (-not (Test-Path "backend/.setup-done")) {
    Write-Host "Setting up database..."
    cd backend
    
    Write-Host "  Running migrations..."
    npx prisma generate
    npx prisma db push
    
    Write-Host "  Seeding data..."
    node scripts/seed.js
    node scripts/seed-rbac.js
    node scripts/seed-workflows.js
    
    "Done" | Out-File ".setup-done"
    cd ..
    Write-Host "OK: Database setup complete"
}
else {
    Write-Host "OK: Database already setup"
}
Write-Host ""

# Start services
Write-Host "Starting services..."

Write-Host "  Starting License Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd license-server; npm run dev"
Start-Sleep -Seconds 3

Write-Host "  Starting Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Sleep -Seconds 8

Write-Host "  Starting Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================"
Write-Host "ALL SERVICES STARTED!"
Write-Host "========================================"
Write-Host ""
Write-Host "Frontend:  http://localhost:3000"
Write-Host "Backend:   http://localhost:4000"
Write-Host ""
Write-Host "Login:"
Write-Host "  Email:    admin@acme.local"
Write-Host "  Password: set DEMO_ADMIN_PASSWORD before running the seed"
Write-Host ""

Write-Host "Opening browser..."
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "DONE! Check the 3 opened terminals for logs."
Write-Host ""
