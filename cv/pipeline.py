
import numpy as np
import torch

from .config import SEQUENCE_LENGTH, STRESS_CHECKPOINT
from .face_detector import FaceDetector
from .feature_extractor import EfficientNetFeatureExtractor
from .sequence_buffer import SequenceBuffer
from .temporal_model import create_model, load_checkpoint


class CVPipeline:
    def __init__(self, checkpoint_path=STRESS_CHECKPOINT):
        self.detector = FaceDetector()
        self.extractor = EfficientNetFeatureExtractor()
        self.buffer = SequenceBuffer(SEQUENCE_LENGTH)

        self.temporal_model, self.device = create_model()

        self.checkpoint_loaded = False
        self.feature_mean = None
        self.feature_std = None
        self.threshold = 0.5

        if checkpoint_path is not None and checkpoint_path.exists():
            self.temporal_model, checkpoint = load_checkpoint(
                self.temporal_model,
                checkpoint_path,
                self.device,
            )

            self.feature_mean = torch.as_tensor(
                checkpoint["feature_mean"],
                dtype=torch.float32,
                device=self.device,
            ).reshape(1, 1, -1)

            self.feature_std = torch.as_tensor(
                checkpoint["feature_std"],
                dtype=torch.float32,
                device=self.device,
            ).reshape(1, 1, -1).clamp_min(1e-6)

            self.threshold = float(checkpoint["threshold"])
            self.checkpoint_loaded = True

    def process_frame(self, frame):
        box = self.detector.detect(frame)

        if box is None:
            return {
                "face_detected": False,
                "frames_collected": len(self.buffer),
                "sequence_ready": self.buffer.is_ready(),
                "checkpoint_loaded": self.checkpoint_loaded,
            }

        face = self.detector.crop(frame, box)
        feature = self.extractor.extract(face)
        self.buffer.add(feature)

        result = {
            "face_detected": True,
            "face_box": tuple(map(int, box)),
            "feature_shape": tuple(feature.shape),
            "frames_collected": len(self.buffer),
            "sequence_ready": self.buffer.is_ready(),
            "checkpoint_loaded": self.checkpoint_loaded,
        }

        if not self.buffer.is_ready():
            return result

        sequence = np.asarray(
            self.buffer.get(),
            dtype=np.float32,
        )

        x = torch.as_tensor(
            sequence,
            dtype=torch.float32,
            device=self.device,
        ).unsqueeze(0)

        if self.checkpoint_loaded:
            mean = self.feature_mean
            std = self.feature_std

            if mean is None or std is None:
                raise RuntimeError(
                    "Checkpoint feature statistics are missing."
                )

            x = (x - mean) / std

        with torch.no_grad():
            logits = self.temporal_model(x)
            probability = torch.sigmoid(logits).item()

            representation = (
                self.temporal_model.get_representation(x)
            )

        result["temporal_shape"] = tuple(
            representation.shape[1:]
        )
        result["temporal_representation"] = (
            representation.cpu().numpy()[0]
        )
        result["stress_probability"] = probability
        result["threshold"] = self.threshold
        result["predicted_label"] = int(
            probability >= self.threshold
        )

        return result
