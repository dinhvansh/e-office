@echo off
echo ========================================
echo E-OFFICE - STARTING SERVICES
echo ========================================
echo.

echo Step 1: Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo Then restart this script.
    pause
    exit /b 1
)

node --version
npm --version
echo OK: Node.js installed
echo.

echo Step 2: Database already running (Docker)
echo.

echo Step 3: Starting Backend...
start "Backend API" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

echo Step 4: Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4000
echo.
echo Login: admin@acme.local / password123
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo DONE! Check the 2 opened windows.
echo.
pause
