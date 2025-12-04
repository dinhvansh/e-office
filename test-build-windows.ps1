# E-Office Windows Build Test Script
# Test if Docker Compose can build the images

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   E-Office Windows Build Test          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/5] Checking Docker..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker not found or not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Check Docker Compose
Write-Host ""
Write-Host "[2/5] Checking Docker Compose..." -ForegroundColor Blue

$DOCKER_COMPOSE = $null

# Try plugin first
try {
    $null = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $DOCKER_COMPOSE = "docker compose"
        $version = docker compose version
        Write-Host "✓ Found: docker compose (plugin)" -ForegroundColor Green
        Write-Host "  Version: $version" -ForegroundColor Gray
    }
} catch {}

# Try standalone if plugin not found
if (-not $DOCKER_COMPOSE) {
    try {
        $null = docker-compose --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $DOCKER_COMPOSE = "docker-compose"
            $version = docker-compose --version
            Write-Host "✓ Found: docker-compose (standalone)" -ForegroundColor Green
            Write-Host "  Version: $version" -ForegroundColor Gray
        }
    } catch {}
}

if (-not $DOCKER_COMPOSE) {
    Write-Host "✗ Docker Compose not found" -ForegroundColor Red
    exit 1
}

# Check docker-compose.yml exists
Write-Host ""
Write-Host "[3/5] Checking docker-compose.yml..." -ForegroundColor Blue
if (Test-Path "docker-compose.yml") {
    Write-Host "✓ docker-compose.yml found" -ForegroundColor Green
} else {
    Write-Host "✗ docker-compose.yml not found" -ForegroundColor Red
    exit 1
}

# Check environment files
Write-Host ""
Write-Host "[4/5] Checking environment files..." -ForegroundColor Blue

$envIssues = @()

if (-not (Test-Path "backend/.env")) {
    $envIssues += "backend/.env missing"
}

if (-not (Test-Path "frontend/.env.local")) {
    $envIssues += "frontend/.env.local missing (optional)"
}

if ($envIssues.Count -gt 0) {
    Write-Host "⚠ Environment file issues:" -ForegroundColor Yellow
    foreach ($issue in $envIssues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Creating minimal environment files..." -ForegroundColor Yellow
    
    # Create minimal backend .env
    if (-not (Test-Path "backend/.env")) {
        Copy-Item "backend/.env.example" "backend/.env" -ErrorAction SilentlyContinue
        Write-Host "✓ Created backend/.env from example" -ForegroundColor Green
    }
} else {
    Write-Host "✓ Environment files OK" -ForegroundColor Green
}

# Test build
Write-Host ""
Write-Host "[5/5] Testing Docker Compose build..." -ForegroundColor Blue
Write-Host "Command: $DOCKER_COMPOSE build --no-cache" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠ This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel, or wait 5 seconds to continue..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting build..." -ForegroundColor Cyan

try {
    if ($DOCKER_COMPOSE -eq "docker compose") {
        docker compose build --no-cache
    } else {
        docker-compose build --no-cache
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║     ✓ BUILD SUCCESSFUL!                ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Start services: $DOCKER_COMPOSE up -d" -ForegroundColor White
        Write-Host "  2. Check logs: $DOCKER_COMPOSE logs -f" -ForegroundColor White
        Write-Host "  3. Access frontend: http://localhost:3000" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "✗ Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check Docker Desktop is running" -ForegroundColor White
        Write-Host "  2. Check error messages above" -ForegroundColor White
        Write-Host "  3. Try: $DOCKER_COMPOSE logs" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "✗ Build failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
