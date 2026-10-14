from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
STRESS_CHECKPOINT = CHECKPOINT_DIR / "facial_stress_bilstm_best.pth"
IMAGE_SIZE = 224
SEQUENCE_LENGTH = 16
EFFICIENTNET_FEATURES = 1280
LSTM_HIDDEN_SIZE = 64
LSTM_OUTPUT_SIZE = 128
