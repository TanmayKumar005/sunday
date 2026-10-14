"""Optional webcam facial-cue endpoints. The model is loaded lazily and is not required for the API to start."""
import base64
import binascii
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/cv", tags=["computer-vision"])


class FramePayload(BaseModel):
    image: str = Field(..., description="Base64 image data or data:image/jpeg;base64,...")


@lru_cache(maxsize=1)
def _pipeline():
    # Import heavy optional dependencies only when the CV feature is used.
    try:
        from cv.pipeline import CVPipeline
        return CVPipeline()
    except Exception as exc:
        raise RuntimeError(f"CV pipeline unavailable: {exc}") from exc


def _checkpoint_exists() -> bool:
    return (Path(__file__).resolve().parents[1] / ".." / "cv" / "checkpoints" / "facial_stress_bilstm_best.pth").resolve().exists()


@router.get("/status")
def cv_status():
    ready = _checkpoint_exists()
    return {
        "enabled": True,
        "pipeline": "available" if ready else "feature_extraction_only",
        "model_ready": ready,
        "message": "MAS model checkpoint loaded when available." if ready else "CV integration is active, but the MAS checkpoint is not installed yet. No facial-stress prediction will be returned.",
    }


@router.post("/frame")
def process_frame(payload: FramePayload):
    raw = payload.image.split(",", 1)[-1]

    try:
        decoded = base64.b64decode(raw, validate=True)
        import cv2

        frame = cv2.imdecode(
            np.frombuffer(decoded, dtype=np.uint8),
            cv2.IMREAD_COLOR,
        )

        if frame is None:
            raise ValueError("Image could not be decoded")

    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid image frame",
        ) from exc

    try:
        result = _pipeline().process_frame(frame)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"CV pipeline unavailable: {exc}",
        ) from exc

    response = {
        "face_detected": bool(result.get("face_detected", False)),
        "frames_collected": int(result.get("frames_collected", 0)),
        "sequence_ready": bool(result.get("sequence_ready", False)),
        "model_ready": bool(result.get("checkpoint_loaded", False)),
    }

    if result.get("stress_probability") is not None:
        response["facial_cue_probability"] = float(
            result["stress_probability"]
        )

    return response


    if "stress_probability" in result:
        response["facial_cue_probability"] = float(result["stress_probability"])
    return response
