from collections import deque
class SequenceBuffer:
    def __init__(self, sequence_length=16): self.buffer=deque(maxlen=sequence_length)
    def add(self, feature): self.buffer.append(feature)
    def is_ready(self): return len(self.buffer)==self.buffer.maxlen
    def get(self): return list(self.buffer) if self.is_ready() else None
    def clear(self): self.buffer.clear()
    def __len__(self): return len(self.buffer)
