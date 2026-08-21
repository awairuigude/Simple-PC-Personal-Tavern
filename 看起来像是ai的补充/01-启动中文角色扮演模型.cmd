@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "MODEL=%ROOT%models\qwen2.5-14b-roleplay-zh-q4_k_m.gguf"

if not exist "%MODEL%" (
    echo [错误] 找不到中文角色扮演模型：
    echo %MODEL%
    pause
    exit /b 1
)

echo 正在启动中文角色扮演模型...
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
  --defaultgenamt 2048 ^
  --singleinstance ^
  --skiplauncher

pause

