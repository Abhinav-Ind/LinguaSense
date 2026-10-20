
@echo off
title LinguaSense Launcher

echo Starting LinguaSense...

start "LinguaSense Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe app.py"

timeout /t 3 /nobreak >nul

start "LinguaSense Frontend" cmd /k "cd /d %~dp0frontend && ..\backend\.venv\Scripts\python.exe -m http.server 5500"

timeout /t 2 /nobreak >nul

start "" http://127.0.0.1:5500/index.html

echo LinguaSense is starting!
