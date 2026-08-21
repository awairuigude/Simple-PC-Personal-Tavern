@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"

start "本地中文角色扮演模型" cmd /k ""%ROOT%01-启动中文角色扮演模型.cmd""
echo 正在等待本地模型完成加载...

powershell -NoProfile -Command "$deadline=(Get-Date).AddMinutes(8); while((Get-Date)-lt $deadline){try{$r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:5001/api/v1/model; if($r.StatusCode -eq 200){exit 0}}catch{}; Start-Sleep -Seconds 3}; exit 1"
if errorlevel 1 (
    echo [错误] 模型在 8 分钟内没有就绪，请查看模型窗口。
    pause
    exit /b 1
)

start "Simple PC Personal Tavern" cmd /k ""%ROOT%03-启动酒馆.cmd""
exit /b 0

