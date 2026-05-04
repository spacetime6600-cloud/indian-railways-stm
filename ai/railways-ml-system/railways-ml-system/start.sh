#!/bin/bash
# Start the Railways ML FastAPI service
# Run from: ai/railways-ml-system/railways-ml-system/
set -e

echo "🤖 Starting Railways ML Service on port 8000..."

# Activate venv if it exists
if [ -d "venv" ]; then
  source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
fi

# Install deps if needed
pip install -q -r requirements.txt

# Start FastAPI
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
