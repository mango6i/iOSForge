@echo off
setlocal
where py >nul 2>nul
if not errorlevel 1 (
    py -3 "%~dp0build_ipa.py" %*
) else (
    python "%~dp0build_ipa.py" %*
)
set "iplayer_build_exit=%errorlevel%"
if not "%iplayer_build_exit%"=="0" echo Build failed. Python 3.9 or later is required. Read the error above.
pause
exit /b %iplayer_build_exit%
