@echo off
cd /d "%~dp0"
echo Starting at %DATE% %TIME% with args: %* > "%~dp0start.log"
call "%~dp0node_modules\.bin\electron.cmd" "%~dp0." %* >> "%~dp0start.log" 2>&1
