@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "MODEL=%ROOT%models\Qwen3-14B-abliterated-Q4_K_M.gguf"

if not exist "%MODEL%" (
    echo [错误] 找不到低拒答对照模型：
    echo %MODEL%
    pause
    exit /b 1
)

echo 正在启动 Qwen3 14B 低拒答对照模型...
echo API: http://127.0.0.1:5001
echo 关闭此窗口即可停止模型。
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
  --jinjathink false ^
  --reasoningeffort none ^
  --defaultgenamt 2048 ^
  --singleinstance ^
  --skiplauncher

pause

