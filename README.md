# InkMath
**A Natural, AI-Powered Handwritten Math Scratchpad for Kids**

InkMath is a local-first full-stack educational web application designed for students to solve math problems naturally by hand on a digital whiteboard, with an asynchronous AI multimodal pipeline evaluating handwritten steps and delivering encouraging coaching feedback.

---

## Features
* **Zero Friction Topic Hub:** Pre-populated math curriculum (Geometry, Fractions, Algebra) ready to start immediately with no account or login barrier.
* **Interactive Whiteboard Scratchpad:** Low-latency HTML5 canvas drawing board with Pen, Eraser, color choices, stroke undo history, clear board, and problem hints.
* **Seamless Async Flow:** Submitting Question 1 loads Question 2 immediately with zero wait time; background grading runs concurrently.
* **AI Vision Step-by-Step Marking:** Multimodal evaluation inspecting handwritten steps and angle proofs against rubrics, awarding partial credit.
* **Deep Review & Retakes:** Interactive results breakdown comparing student handwriting against AI step analysis, with one-click retakes.
* **Local-First & Offline Ready:** Includes an intelligent deterministic evaluator that runs offline with zero setup, with optional live LLM keys (Gemini, OpenAI, OpenRouter).

---

## Architecture

```
[ React + Canvas API Client ]  ──(Canvas PNG Snapshot)──>  [ FastAPI Backend ]
               │                                                    │
               ▼                                                    ▼
      [ LocalStorage State ]                               [ Workers & SQLite ]
                                                                    │
                                                                    ▼
                                                         [ Multimodal AI Vision ]
```

* **Frontend:** React 18, TypeScript, Vite, HTML5 Canvas API, CSS Custom Properties.
* **Backend:** Python (FastAPI), Uvicorn, Pydantic, HTTPX.
* **Database:** SQLite with WAL mode (`inkmath.db`).
* **Workers:** Asynchronous `asyncio.Queue` background consumer.

---

## Quickstart

### Option 1: One-Command Startup
From the `inkmath` folder:
```bash
cd inkmath
./run.sh
```
This automatically boots the backend on `http://localhost:8000` and the frontend on `http://localhost:5173`.

### Option 2: Run Separately

#### Backend:
```bash
cd inkmath
source backend/.venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend:
```bash
cd inkmath/frontend
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## (Optional) Live Vision Model Configuration
InkMath runs out-of-the-box in offline mode with realistic rubric-based evaluations. If you want to use live multimodal AI models, create a `.env` file in `inkmath/backend/.env`:
```env
# Choose any one provider:
GEMINI_API_KEY=your_gemini_key_here
# or
OPENAI_API_KEY=your_openai_key_here
# or
OPENROUTER_API_KEY=your_openrouter_key_here
```

