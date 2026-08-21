@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0app"

if not exist "node_modules" (
    echo 首次安装依赖，请稍候...
    call npm ci --no-audit --no-fund
    if errorlevel 1 (
        echo [错误] 依赖安装失败。
        pause
        exit /b 1
    )
)

echo 酒馆地址：http://127.0.0.1:8000
call npm start
pause

