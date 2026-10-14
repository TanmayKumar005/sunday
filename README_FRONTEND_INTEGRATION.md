# S.U.N.D.A.Y. Frontend Integration

The repository now includes a `frontend/` React + Vite MVP connected to the existing FastAPI backend.

## Run backend

```powershell
uvicorn app.main:app --reload
```

## Run frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend defaults to `http://127.0.0.1:5173` and the API defaults to `http://127.0.0.1:8000`.

The frontend uses real curriculum, learner, assessment, adaptation, scaffold, result and progress endpoints. It contains no mock learner/progress/question data.

### Small backend integration changes

- Added local-development CORS for Vite (`127.0.0.1:5173` and `localhost:5173`).
- Added optional `unit_id` to `POST /assessments/start` so section practice can create an assessment from the selected real section instead of using unrelated questions.

## Optional CV integration

- The practice page now has an opt-in webcam panel (`frontend/src/components/CVMonitor.jsx`).
- `GET /cv/status` reports whether the MAS checkpoint is present.
- `POST /cv/frame` accepts `{ "image": "data:image/jpeg;base64,..." }` and returns face/sequence status. A facial cue probability is returned only after a compatible trained checkpoint is placed at `cv/checkpoints/facial_stress_bilstm_best.pth`.
- Install dependencies with `pip install -r requirements.txt`. The first use can download pretrained EfficientNet-B0 weights.
- The camera is off by default. Webcam access generally requires localhost or HTTPS. Frames are processed in memory and are not persisted by these endpoints.
- The CV signal represents visible cues associated with dataset labels, not a diagnosis of psychological stress. Existing answer/response-time-based adaptation remains unchanged.
