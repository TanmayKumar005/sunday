import torch
import torch.nn as nn
class FusionMLP(nn.Module):
    def __init__(self,facial_dim=256,behavior_dim=6):
        super().__init__(); self.network=nn.Sequential(nn.Linear(facial_dim+behavior_dim,128),nn.ReLU(),nn.Dropout(.3),nn.Linear(128,64),nn.ReLU(),nn.Dropout(.3),nn.Linear(64,1))
    def forward(self,x): return self.network(x).squeeze(1)
def combine_features(facial_representation,behavior_features):
    return torch.cat([torch.tensor(facial_representation,dtype=torch.float32),torch.tensor(behavior_features,dtype=torch.float32)])
