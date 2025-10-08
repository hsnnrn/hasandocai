@echo off
echo Starting BGE-M3 Model Server...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found! Please install Python 3.8+ and add it to PATH
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Install dependencies if needed
echo Installing dependencies...
pip install -r requirements.txt
pip install FlagEmbedding

REM Start the server
echo.
echo Starting BGE-M3 server on http://127.0.0.1:7860
echo Press Ctrl+C to stop the server
echo.
python app.py

pause
