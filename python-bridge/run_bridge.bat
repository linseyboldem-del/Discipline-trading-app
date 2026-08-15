@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
python fetch_and_push.py
pause
