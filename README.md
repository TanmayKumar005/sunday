# S.U.N.D.A.Y.

**An adaptive learning platform for Class 6 Mathematics (NCERT *Ganita Prakash*, Chapter 7: Fractions).**

S.U.N.D.A.Y. watches how a learner answers questions (correctness, repeated mistakes, response time) and adjusts the next step: harder questions, easier ones, hints, or a revisit of an earlier concept. An optional webcam module estimates visible facial cues and can suggest short breaks. A friendly AI study buddy, **Soli**, answers fraction doubts in chat.

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy, PostgreSQL, Pydantic |
| Adaptation engine | Transparent, rule-based Python (no black box) |
| Frontend | React + Vite, React Router |
| Optional CV module | OpenCV, PyTorch, EfficientNet-B0 + BiLSTM |
| Chatbot (Soli) | Groq API (OpenAI-compatible client) |

---

## Table of contents

1. [Project structure](#project-structure)
2. [Installation](#installation)
3. [Running the project](#running-the-project)
4. [How it works](#how-it-works)
5. [API overview](#api-overview)
6. [Running the tests](#running-the-tests)
7. [Troubleshooting](#troubleshooting)

---

## Project structure

```
sunday/
├── app/                    # FastAPI backend
│   ├── main.py             # App entry point, CORS, router registration
│   ├── core/               # Settings (.env), DB engine, constants
│   ├── models/             # SQLAlchemy tables (learner, content, question, assessment, progress, profile)
│   ├── schemas/            # Pydantic request/response models
│   ├── routes/             # API endpoints (one file per feature)
│   ├── services/           # Business logic between routes and the database
│   ├── ai/                 # Adaptation brain: struggle index, recommendation rules, scaffolding, progress rules
│   └── seed/               # Fractions content + question bank and the seed script
├── cv/                     # Optional webcam facial-cue pipeline
│   └── checkpoints/        # Put the trained model file here (not included in the repo)
├── frontend/               # React + Vite student-facing app
├── tests/                  # Pytest suite (uses in-memory SQLite)
└── requirements.txt
```

---

## Installation

### Prerequisites

- **Python 3.10+**
- **Node.js 20+** and npm
- **PostgreSQL** (running locally)
- **Git**
- *(Optional)* a webcam and ~2 GB free disk space for the CV libraries
- *(Optional)* a free [Groq API key](https://console.groq.com) for the Soli chatbot

### 1. Clone the repository

```bash
git clone https://github.com/TanmayKumar005/sunday.git
cd sunday
```

### 2. Create the database

Create an empty PostgreSQL database. The tables are created automatically later.

```bash
psql -U postgres -c "CREATE DATABASE sunday_db;"
```

### 3. Set up the Python environment

**Windows (PowerShell)**

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> The requirements include PyTorch, torchvision and OpenCV for the optional CV module, so the first install takes a few minutes.

### 4. Create the backend `.env` file

Create a file named `.env` in the **project root** (next to `requirements.txt`):

```env
APP_NAME=SUNDAY
APP_VERSION=1.0.0
SECRET_KEY=change-this-to-any-long-random-string
ALGORITHM=HS256
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/sunday_db

# Optional: only needed for the Soli chatbot
GROQ_API_KEY=your_groq_api_key_here
```

Replace `YOUR_PASSWORD` with your PostgreSQL password. `.env` is git-ignored, so your secrets stay local.

### 5. Install the frontend

```bash
cd frontend
npm install
cd ..
```

The frontend talks to `http://127.0.0.1:8000` by default. Only if your backend runs elsewhere, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Running the project

You need **two terminals**, one for the backend and one for the frontend.

### Step 1: Load the Fractions content (first time only)

From the project root, with the virtual environment active:

```bash
python -m app.seed.seed_fractions
```

This creates the tables and inserts the 9 sections of Chapter 7 with their questions and hints. It is safe to re-run: it never deletes learners, progress or assessments.

### Step 2: Start the backend (Terminal 1)

```bash
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Interactive docs (Swagger): http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

### Step 3: Start the frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open **http://127.0.0.1:5173** in your browser, enter a name, and start learning.

### Optional: enable the webcam module

The app works fully without it. To get facial-cue predictions:

1. Place the trained model file at `cv/checkpoints/facial_stress_bilstm_best.pth`.
2. Restart the backend.
3. On the practice page, switch on the camera panel (the camera is **off by default** and needs `localhost` or HTTPS).

Without the model file, `/cv/status` reports `feature_extraction_only`: faces are detected and frames counted, but no prediction is made. The first CV use may download pretrained EfficientNet-B0 weights, so internet access is needed once.

---

## How it works

### The learner journey

```mermaid
flowchart LR
    A[Enter name] --> B[Dashboard: Chapter 7 sections]
    B --> C[Pick a section]
    C --> D[Practice: answer a question]
    D --> E[Struggle score + next step]
    E -->|wrong| F[Hint / scaffold]
    F --> D
    E -->|next| D
    E -->|session done| G[Result + recommendation]
    G --> H[Progress page]
```

1. **Landing:** the learner enters a name. A learner record (Class 6, Mathematics) is created and remembered in the browser.
2. **Dashboard:** shows the nine sections of *Fractions* (7.1 to 7.9) and a progress summary.
3. **Practice:** the backend opens an assessment with up to 5 questions from the chosen section. After each answer the learner gets feedback and the system decides what to do next.
4. **Result:** accuracy, struggle level and a recommended next action.
5. **Progress:** per-topic accuracy, completed topics, weak topics and the suggested next step.

### The adaptation engine (`app/ai/`)

Every decision is rule-based and explainable. Each response includes the **reason** and the **rules that fired**.

**1. Struggle score.** After each answer, a score between 0 and 1 is computed:

```
struggle = 0.35 × (1 − overall accuracy)
         + 0.30 × (1 − recent accuracy)        # last 5 answers
         + 0.20 × repeated mistakes
         + 0.15 × question difficulty factor
         (+ 0.05 if the learner was unusually slow)
```

Accuracy is smoothed with a prior, so a single wrong answer does not instantly look like "High". The score maps to a level:

| Score | Level |
|---|---|
| below 0.30 | Low |
| 0.30 to 0.59 | Medium |
| 0.60 and above | High |

Response time also matters: much slower than expected adds a small penalty, and a very fast wrong answer is flagged as a possible guess.

**2. Next-step recommendation.**

| Struggle | Answer | What the system does |
|---|---|---|
| Low | Correct, 3 in a row | Raise difficulty (or move to the next topic if already Hard) |
| Low | Correct / wrong | Continue; optional hint on a mistake |
| Medium | Correct | Similar question at the same level to consolidate |
| Medium | Wrong | Hint, plus a similar question (an easier one if mistakes repeat) |
| High | Correct | Easier question before moving up |
| High | Wrong | Scaffolding, revisit the **prerequisite section**, easier questions |

The prerequisite map for the chapter (for example 7.3 builds on 7.2, 7.5 and 7.6 build on 7.4) lives in `app/ai/adaptation_config.py`, along with every threshold, so behaviour can be tuned without touching the rules.

**3. Progressive scaffolding.** Learners who are stuck unlock help one level at a time, and only the last level reveals the answer:

| Level | Help |
|---|---|
| 1 | Small hint |
| 2 | Concept reminder |
| 3 | Worked steps on a *similar* example with different numbers |
| 4 | Final explanation and answer |

**4. Progress and post-assessment advice.** A topic counts as *completed* with at least 3 questions answered, 70% accuracy or better, and no current High struggle. A topic is *weak* below 60%. When an assessment ends, the advice is:

- **Advance to the next topic:** accuracy 80% or more, Low struggle, no weak topics.
- **Revisit prerequisites:** High struggle or accuracy below 50%.
- **Practise weak topics / keep practising:** everything in between.

### Optional: facial-cue module (`cv/`)

```
Webcam frame → face detection → EfficientNet-B0 features → 16-frame buffer → BiLSTM → cue probability
```

- The browser sends small JPEG frames to `POST /cv/frame` about once per interval; frames are processed **in memory and never stored**. No audio is captured.
- After 16 frames, the BiLSTM returns a probability of visible facial cues.
- On the frontend, three consecutive readings above the trigger level suggest a **break**: a 2-minute break first, then a 5-minute one. A third trigger ends the session. The timer for answering questions pauses during breaks.
- This signal reflects visible cues associated with the training dataset's labels. **It is not a diagnosis of stress**, and the answer-based adaptation above works independently of it.

### Soli, the study buddy

The chat bubble in the app sends your question and recent history to `POST /chat`, which calls Groq's `openai/gpt-oss-120b` model with a prompt that keeps replies short (about 100 words), simple, and focused on Class 6 fractions. Without `GROQ_API_KEY`, only this chat feature is unavailable; everything else works.

---

## API overview

Full interactive documentation is at `/docs` once the backend is running.

| Area | Endpoint | Purpose |
|---|---|---|
| Learners | `POST /learners/` | Create a learner |
| Content | `GET /content/curriculum` | Chapters and sections |
| | `GET /content/sections/{code}` | One section (e.g. `7.1`) |
| | `GET /content/units/{id}/questions` | Questions of a unit |
| Questions | `GET /questions/{id}` | One question |
| | `GET /questions/{id}/solution` | Answer key (teacher/demo use) |
| Assessments | `POST /assessments/start` | Start with `learner_id` and optional `unit_id` |
| | `POST /assessments/{id}/answer` | Submit an answer and response time |
| | `GET /assessments/{id}/result` | Result with recommendation |
| Adaptation | `POST /adaptation/evaluate` | Struggle score and recommended action |
| | `POST /adaptation/next-question` | Evaluate and open the next question |
| | `POST /adaptation/scaffold` | Reveal the next help level |
| Progress | `GET /progress/{learner_id}` | Per-topic progress |
| | `GET /progress/{learner_id}/summary` | Chapter summary and next step |
| CV | `GET /cv/status` | Is the model checkpoint installed? |
| | `POST /cv/frame` | Process one webcam frame |
| Chat | `POST /chat` | Ask Soli |

---

## Running the tests

From the project root:

```bash
pytest
```

Tests use a throwaway in-memory SQLite database, so they never touch your PostgreSQL data. They cover the adaptation rules, scaffolding, progress rules, seed data, every route group, and a full end-to-end learner flow.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ValidationError` for `APP_NAME`, `SECRET_KEY`, etc. on startup | The `.env` file is missing or not in the project root. |
| `could not connect to server` / `password authentication failed` | Check PostgreSQL is running and `DATABASE_URL` has the right password and database name. |
| Dashboard is empty | Run `python -m app.seed.seed_fractions`. |
| Browser shows a CORS or network error | Start the backend first; the frontend must run on port 5173 (the only origin allowed by CORS). |
| Soli says `GROQ_API_KEY is missing` | Add the key to the root `.env` and restart the backend. |
| Camera panel does not work | Allow camera access, and use `localhost` or HTTPS. |
| CV panel says "checkpoint not installed" | Add `facial_stress_bilstm_best.pth` to `cv/checkpoints/` and restart the backend. |

---

## Author

**Tanmay Kumar**, B.Tech CSE, ABES Institute of Technology.
