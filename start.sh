#!/bin/bash
set -e

echo "🚀 Starting WOODEX SaaS Platform..."

# 1. Activate the Python environment
source venv/bin/activate

# 2. Start FastAPI Backend on port 8000
echo "⚡ Starting FastAPI REST Backend on http://localhost:8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 3. Start Next.js Frontend on port 3000
echo "🎨 Starting Next.js Frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "========================================================="
echo "  WOODEX SaaS Platform is LIVE!"
echo "  Frontend URL : http://localhost:3000"
echo "  Backend API  : http://localhost:8000"
echo "  Swagger Docs : http://localhost:8000/docs"
echo "========================================================="

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
