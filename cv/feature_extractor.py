import numpy as np
import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


class EfficientNetFeatureExtractor:
    def __init__(self, device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        weights = EfficientNet_B0_Weights.DEFAULT
        self.model = efficientnet_b0(weights=weights).features.to(self.device).eval()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.transform = weights.transforms()

    @torch.no_grad()
    def extract(self, face):
        if face is None or face.size == 0:
            raise ValueError("Empty face crop.")
        rgb = face[:, :, ::-1].copy()  # OpenCV BGR -> RGB
        tensor = torch.from_numpy(np.asarray(rgb)).permute(2, 0, 1)  # HWC -> CHW
        tensor = self.transform(tensor).unsqueeze(0).to(self.device)
        return self.pool(self.model(tensor)).flatten(1).squeeze(0).cpu().numpy()
