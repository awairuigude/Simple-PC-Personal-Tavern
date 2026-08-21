@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "ARIA=%ROOT%runtime\aria2\aria2-1.37.0-win-64bit-build1\aria2c.exe"
set "DIR=%ROOT%models"
set "OUT=Qwen3-14B-abliterated-Q4_K_M.gguf"
set "URL=https://hf-mirror.com/bartowski/mlabonne_Qwen3-14B-abliterated-GGUF/resolve/main/mlabonne_Qwen3-14B-abliterated-Q4_K_M.gguf?download=true"

if not exist "%ARIA%" (
  echo [错误] 找不到 aria2c：%ARIA%
  pause
  exit /b 1
)

echo 开始或继续下载 Qwen3 14B 对照模型...
"%ARIA%" --dir="%DIR%" --out="%OUT%" --continue=true --max-connection-per-server=4 --split=4 --min-split-size=16M --file-allocation=none --auto-file-renaming=false --allow-overwrite=true --retry-wait=3 --max-tries=8 --timeout=60 --connect-timeout=20 --console-log-level=notice --summary-interval=20 "%URL%"
if errorlevel 1 (
  echo [提示] 下载尚未完成，可再次运行本脚本继续。
  exit /b 1
)

echo 下载完成。请校验 SHA-256 后再启动模型。
exit /b 0
