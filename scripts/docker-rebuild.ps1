$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Test-Path ".env")) {
    throw "Missing .env. Follow INSTALL-DEMO.md or INSTALL-PRODUCTION.md."
}

docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw "Docker Compose configuration is invalid." }

docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "Docker Compose rebuild failed." }

docker compose ps
Write-Host "Rebuild complete. Data volumes were preserved."
