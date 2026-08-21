@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
powershell -NoProfile -Command "$root=[IO.Path]::GetFullPath('%ROOT%'); $items=Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'koboldcpp.exe' -and $_.CommandLine -like ('*' + $root + '*') }; if($items){$items | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; exit 0}else{exit 1}" 
if errorlevel 1 (
    echo 当前没有运行中的 KoboldCpp。
) else (
    echo 本地模型已停止。
)
pause

