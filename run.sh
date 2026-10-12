#!/usr/bin/env bash
# InkMath Unified Development Runner
# Starts both the FastAPI backend and Vite frontend concurrently with clean shutdown on SIGINT.

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=============================================="
echo "✏️  Starting InkMath AI Math Tutoring Platform"
echo "=============================================="

# 1. Check Python backend virtualenv
if [ ! -d "backend/.venv" ]; then
    echo "Creating Python virtualenv in backend/.venv..."
    python3 -m venv backend/.venv
    ./backend/.venv/bin/pip install -r backend/requirements.txt
fi

# 2. Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix frontend
fi

# Cleanup function on Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down InkMath services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "Starting FastAPI Backend on http://localhost:8000..."
./backend/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend health check..."
for i in {1..15}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "Backend is ready! ✓"
        break
    fi
    sleep 0.5
done

# Start Frontend
echo "Starting Vite Frontend on http://localhost:5173..."
npm run dev --prefix frontend &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "🚀 InkMath is running locally!"
echo "👉 Open: http://localhost:5173 in your browser"
echo "👉 API Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop both servers"
echo "=========================================================="

wait

