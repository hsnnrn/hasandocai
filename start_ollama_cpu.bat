@echo off
echo ================================================
echo   Ollama CPU Mode - CUDA Error Fix
echo ================================================
echo.
echo Starting Ollama in CPU-only mode...
echo This prevents CUDA/GPU errors.
echo.

REM Set environment to force CPU mode
set OLLAMA_NUM_GPU=0
set CUDA_VISIBLE_DEVICES=-1

REM Start Ollama
echo Starting Ollama server...
ollama serve

pause

