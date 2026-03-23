import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PORT = int(os.getenv("AI_BACKEND_PORT", "8000"))

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in .env.local")
