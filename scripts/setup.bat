@echo off
REM DocAiProduction Setup Script for Windows
REM This script sets up the development environment and builds the application

setlocal enabledelayedexpansion

echo 🚀 Setting up DocAiProduction...

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [SUCCESS] Node.js is installed: %NODE_VERSION%
)

REM Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [SUCCESS] npm is installed: %NPM_VERSION%
)

REM Check environment variables
echo [INFO] Checking environment variables...
if not exist ".env" (
    if exist ".env.example" (
        echo [WARNING] .env file not found. Copying from .env.example...
        copy ".env.example" ".env" >nul
        echo [WARNING] Please update .env file with your actual values
    ) else (
        echo [WARNING] No .env.example file found
    )
) else (
    echo [SUCCESS] .env file exists
)

REM Check for GitHub token
if "%GITHUB_TOKEN%"=="" (
    echo [WARNING] GITHUB_TOKEN not set. Releases will not work without it.
) else (
    echo [SUCCESS] GITHUB_TOKEN is set
)

REM Install dependencies
echo [INFO] Installing dependencies...
if exist "package-lock.json" (
    echo [INFO] Using npm ci for faster, reliable builds...
    npm ci
) else (
    echo [INFO] Using npm install...
    npm install
)

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed successfully

REM Build the application
echo [INFO] Building the application...

echo [INFO] Building renderer...
npm run build:renderer
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build renderer
    pause
    exit /b 1
)

echo [INFO] Building main process...
npm run build:main
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build main process
    pause
    exit /b 1
)

echo [SUCCESS] Application built successfully

REM Run tests
echo [INFO] Running tests...
if exist "jest.config.js" (
    npm test
    if %errorlevel% neq 0 (
        echo [WARNING] Tests failed
    ) else (
        echo [SUCCESS] Tests completed successfully
    )
) else (
    echo [WARNING] No test configuration found. Skipping tests.
)

REM Ask about creating distributions
set /p CREATE_DIST="Do you want to create distribution packages? (y/N): "
if /i "%CREATE_DIST%"=="y" (
    echo [INFO] Creating Windows distribution...
    npm run dist:win
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create distribution packages
        pause
        exit /b 1
    )
    echo [SUCCESS] Distribution packages created successfully
)

echo [SUCCESS] Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Update .env file with your configuration
echo 2. Run 'npm run dev' to start development
echo 3. Run 'npm run dist' to create installers
echo 4. Run 'npm run release:patch' to create a new release
echo.
echo 🔗 Useful commands:
echo - npm run dev          # Start development server
echo - npm run build        # Build for production
echo - npm run dist         # Create installers
echo - npm run release:patch # Create patch release
echo - npm run release:minor # Create minor release
echo - npm run release:major # Create major release
echo.
pause
