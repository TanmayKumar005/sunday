
import torch
import torch.nn as nn

from .config import EFFICIENTNET_FEATURES


class FacialStressBiLSTM(nn.Module):
    def __init__(self):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=EFFICIENTNET_FEATURES,
            hidden_size=64,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
        )

        self.classifier = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
        )

    def forward(self, x):
        output, _ = self.lstm(x)
        return self.classifier(output[:, -1, :]).squeeze(1)

    def get_representation(self, x):
        output, _ = self.lstm(x)
        return output[:, -1, :]


def create_model(device=None):
    device = device or (
        "cuda" if torch.cuda.is_available() else "cpu"
    )
    model = FacialStressBiLSTM().to(device)
    return model, device




def load_checkpoint(model, path, device):
    checkpoint = torch.load(
        str(path),
        map_location=device,
        weights_only=False,
    )

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    return model, checkpoint


