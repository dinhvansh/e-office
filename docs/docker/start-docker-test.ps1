# Script kiểm tra và start Docker Desktop
# E-Office Docker Startup Helper

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "E-Office - Docker Startup Check" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if Docker is installed
Write-Host "`n[1/3] Checking Docker installation..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Docker not found!" -ForegroundColor Red
    Write-Host "`nPlease install Docker Desktop from:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}
Write-Host "OK Docker installed: $dockerVersion" -ForegroundColor Green

# Check if Docker Desktop is running
Write-Host "`n[2/3] Checking Docker Desktop status..." -ForegroundColor Yellow
docker ps > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Docker Desktop is running!" -ForegroundColor Green
} else {
    Write-Host "! Docker Desktop is not running" -ForegroundColor Yellow
    Write-Host "`nAttempting to start Docker Desktop..." -ForegroundColor Cyan
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Docker Desktop is starting..." -ForegroundColor Cyan
        Write-Host "Waiting for Docker to be ready (this may take 30-60 seconds)..." -ForegroundColor Yellow
        
        # Wait for Docker to be ready
        $maxWait = 120
        $waited = 0
        $ready = $false
        
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 5
            $waited += 5
            Write-Host "." -NoNewline
            
            docker ps > $null 2>&1
            if ($LASTEXITCODE -eq 0) {
                $ready = $true
                break
            }
        }
        Write-Host ""
        
        if ($ready) {
            Write-Host "OK Docker Desktop started successfully!" -ForegroundColor Green
        } else {
            Write-Host "X Docker Desktop failed to start" -ForegroundColor Red
            Write-Host "`nPlease start Docker Desktop manually:" -ForegroundColor Yellow
            Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor White
            Write-Host "2. Wait for it to show 'Docker Desktop is running'" -ForegroundColor White
            Write-Host "3. Run this script again" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "X Docker Desktop not found at default location" -ForegroundColor Red
        Write-Host "`nPlease start Docker Desktop manually:" -ForegroundColor Yellow
        Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor White
        Write-Host "2. Wait for it to show 'Docker Desktop is running'" -ForegroundColor White
        Write-Host "3. Run this script again" -ForegroundColor White
        exit 1
    }
}

# Verify Docker is working
Write-Host "`n[3/3] Verifying Docker functionality..." -ForegroundColor Yellow
docker ps > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Docker is working correctly!" -ForegroundColor Green
} else {
    Write-Host "X Docker is not responding properly" -ForegroundColor Red
    exit 1
}

# Show Docker info
Write-Host "`n===================================" -ForegroundColor Green
Write-Host "OK Docker is ready!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

Write-Host "`nDocker Info:" -ForegroundColor Cyan
docker version --format "  Engine: {{.Server.Version}}"

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "1. Run full test:" -ForegroundColor White
Write-Host "   .\docker-quick-test.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Or start manually:" -ForegroundColor White
Write-Host "   docker-compose build" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor Cyan
Write-Host ""
