@echo off
echo ========================================
echo  Ollama GPU Accelerated Startup
echo ========================================
echo.

REM GPU kontrolü
echo Checking for NVIDIA GPU...
nvidia-smi >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] GPU not detected or NVIDIA drivers not installed
    echo [INFO] Starting Ollama in CPU mode...
    echo.
    set OLLAMA_NUM_GPU=0
) else (
    echo.
    echo [SUCCESS] GPU detected!
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo.
    echo [INFO] Starting Ollama with GPU acceleration...
    echo.
    set OLLAMA_NUM_GPU=1
)

echo.
echo Starting Ollama server...
echo Server will be available at: http://127.0.0.1:11434
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Ollama başlat
ollama serve

pause

