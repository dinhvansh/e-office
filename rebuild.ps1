# Quick rebuild script - just run: .\rebuild.ps1

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
& .\scripts\docker-rebuild.ps1
