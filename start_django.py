#!/usr/bin/env python
"""
start_django.py  —  Django backend launcher for Methane Watcher.

Usage (from project root):
    python start_django.py

What it does:
  1. Creates a venv inside django_backend/venv/ if missing.
  2. Installs requirements (skips if already installed — fast start).
  3. Runs Django migrations.
  4. Starts the Django server on port 8000.
"""

import subprocess
import sys
import os
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

os.environ["PYTHONIOENCODING"] = "utf-8"

ROOT = Path(__file__).parent
BACKEND_DIR = ROOT / "django_backend"
VENV_DIR = BACKEND_DIR / "venv"
REQ_FILE = BACKEND_DIR / "requirements.txt"


def _python():
    """Return path to the venv Python executable."""
    if sys.platform == "win32":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def run(cmd, **kwargs):
    print(f"\n▶ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if result.returncode not in (0, None):
        print(f"  ⚠  Command exited with code {result.returncode} — continuing…")
    return result


def main():
    py = _python()

    # ── 1. Create venv if missing ──────────────────────────────────────────
    if not VENV_DIR.exists():
        print("🔧 Creating virtual environment…")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
        print("✅ venv created")
    else:
        print("✅ venv already exists — skipping creation")

    # ── 2. Install requirements only when needed ───────────────────────────
    # Check if Django is importable; if yes, skip the slow pip install.
    check = subprocess.run(
        [str(py), "-c", "import django, rest_framework, corsheaders, numpy, scipy, torch, fastapi, uvicorn, dotenv"],
        capture_output=True,
    )
    if check.returncode != 0:
        print("📦 Installing dependencies (first time)…")
        run(
            [str(py), "-m", "pip", "install", "-r", str(REQ_FILE), "--quiet",
             "--no-warn-script-location"],
            cwd=BACKEND_DIR,
        )
    else:
        print("✅ All core packages present — skipping pip install")

    # ── 3. Migrations ─────────────────────────────────────────────────────
    print("\n🗄️  Running migrations…")
    run([str(py), "manage.py", "migrate", "--run-syncdb", "--no-input"], cwd=BACKEND_DIR)

    # ── 4. Launch server ───────────────────────────────────────────────────
    print("\n🚀 Starting FastAPI + Django server → http://localhost:8000")
    print("   Press Ctrl+C to stop.\n")
    try:
        subprocess.run(
            [str(py), "-m", "uvicorn", "methane_watcher.asgi:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            cwd=BACKEND_DIR
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")


if __name__ == "__main__":
    main()
