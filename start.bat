@echo off
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

cd /d "%APP_DIR%" 2>nul

if not exist "%APP_DIR%\dist\index.html" (
    echo [NativeLingo] Compiling production bundle...
    call npm run build
)

if exist "%APP_DIR%\node_modules\electron\dist\electron.exe" (
    start "" "%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%" %*
) else (
    call npm start -- %*
)

