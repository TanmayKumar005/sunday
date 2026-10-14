# S.U.N.D.A.Y. CV integration

The FastAPI app exposes `GET /cv/status` and `POST /cv/frame`. The React practice page offers an opt-in webcam panel. The browser sends small JPEG frames to the local API; no audio is captured. Frames are processed in memory and are not persisted by these endpoints.

Place the trained MAS BiLSTM state-dict at `cv/checkpoints/facial_stress_bilstm_best.pth`. Until that checkpoint is available, the API only reports face detection and sequence progress; it does not emit a facial-cue prediction. The model estimates visible cues associated with dataset labels and must not be treated as a psychological stress diagnosis.

Install the CV dependencies from the project root with `pip install -r requirements.txt`. The first CV use may download pretrained EfficientNet-B0 weights.
