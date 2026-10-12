# 0001. InkMath Local-First Full-Stack Architecture

* **Status:** Accepted
* **Date:** 2026-10-12

## Context
We need to build a 24-hour prototype of InkMath: a student-focused AI math tutoring platform with an interactive handwritten scratchpad, asynchronous grading, and question-by-question feedback. The application must run locally with zero onboarding friction, operate without complex external infrastructure, and be modular and maintainable.

## Decision
1. **Frontend:** React + Vite + TypeScript + HTML5 Canvas API. We use native HTML5 Canvas event handling to deliver zero-latency drawing with stroke smoothing, without relying on heavy third-party whiteboard packages that obscure internal mechanics.
2. **Backend:** Python (FastAPI) + SQLite. FastAPI provides high-performance async endpoint routing, automatic Pydantic request validation, and clean background task dispatching. SQLite provides zero-configuration local persistence for question banks, attempts, and evaluation scores.
3. **Async Evaluation Pipeline:** In-memory queue processed by an asynchronous worker task in FastAPI. Submissions immediately return while the worker executes the vision model call, preventing UI blocking.
4. **Grading Strategy:** Dual-mode evaluator supporting live Multimodal Vision LLMs (via Gemini/OpenAI/OpenRouter) when an API key is provided, paired with a deterministic intelligent heuristic fallback when offline or running without keys, guaranteeing zero-failure local demos.

## Consequences
* **Positive:**
  * Complete local autonomy: Runs out-of-the-box on any laptop with Python 3 and Node.js.
  * Instant UI responsiveness: Submitting Question 1 immediately advances to Question 2 while grading runs in the background.
  * Reliable demo execution: Evaluator functions seamlessly even without external network access or paid API keys.
* **Negative:**
  * In-memory async worker queue is single-process and does not persist across backend restarts (acceptable for local prototyping).
  * Canvas snapshots are stored on the local filesystem or in SQLite rather than object storage (S3).

