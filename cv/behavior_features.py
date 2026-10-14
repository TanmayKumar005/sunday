import numpy as np
def build_behavior_features(accuracy,response_time,expected_time,repeated_mistakes,difficulty,attempts):
    ratio=response_time/expected_time if expected_time>0 else 1.0
    return np.array([accuracy,ratio,repeated_mistakes,difficulty,attempts,1.0 if accuracy<.5 else 0.0],dtype=np.float32)
