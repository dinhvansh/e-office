# Quick test to detect Docker Compose command

Write-Host "Testing Docker Compose Detection..." -ForegroundColor Cyan
Write-Host ""

# Test Docker
Write-Host "1. Testing Docker..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Docker: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Docker not available" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ✗ Docker not found: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testing Docker Compose (plugin)..." -ForegroundColor Blue
try {
    $output = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ docker compose (plugin): $output" -ForegroundColor Green
        $DOCKER_COMPOSE = "docker compose"
    } else {
        Write-Host "   ✗ docker compose plugin not available" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ docker compose plugin not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Testing Docker Compose (standalone)..." -ForegroundColor Blue
try {
    $output = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ docker-compose (standalone): $output" -ForegroundColor Green
        if (-not $DOCKER_COMPOSE) {
            $DOCKER_COMPOSE = "docker-compose"
        }
    } else {
        Write-Host "   ✗ docker-compose standalone not available" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ docker-compose standalone not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
if ($DOCKER_COMPOSE) {
    Write-Host "✓ Will use: $DOCKER_COMPOSE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test command:" -ForegroundColor Cyan
    Write-Host "  $DOCKER_COMPOSE --help" -ForegroundColor White
} else {
    Write-Host "✗ No Docker Compose found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop which includes Docker Compose" -ForegroundColor Yellow
    exit 1
}
