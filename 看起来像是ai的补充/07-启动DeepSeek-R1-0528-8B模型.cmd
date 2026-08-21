@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "MODEL=%ROOT%models\DeepSeek-R1-0528-Qwen3-8B-Q4_K_M.gguf"

if not exist "%MODEL%" (
    echo [ERROR] Model file not found:
    echo %MODEL%
    pause
    exit /b 1
)

echo Starting DeepSeek-R1-0528-Qwen3-8B...
echo API: http://127.0.0.1:5001
echo Close this window to stop the model.
echo.

"%ROOT%runtime\koboldcpp.exe" ^
  --model "%MODEL%" ^
  --usecuda 0 ^
  --autofit ^
  --autofitpadding 1200 ^
  --contextsize 12288 ^
  --quantkv q8_0 ^
  --host 127.0.0.1 ^
  --port 5001 ^
  --threads 12 ^
  --blasthreads 12 ^
  --batchsize 512 ^
  --jinja ^
  --defaultgenamt 2048 ^
  --singleinstance ^
  --skiplauncher

pause
