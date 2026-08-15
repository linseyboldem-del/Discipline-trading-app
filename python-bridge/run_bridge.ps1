# Run from the python-bridge/ folder in PowerShell.
# One-time setup:
#   python -m venv venv
#   .\venv\Scripts\Activate.ps1
#   pip install -r requirements.txt
#   copy .env.example .env   # then edit .env with your real values
#
# This script just activates the venv and starts the bridge loop.
# Leave this running in a terminal (or wire it into Task Scheduler /
# NSSM the same way you run your other always-on Aethelgard scripts).

.\venv\Scripts\Activate.ps1
python fetch_and_push.py
