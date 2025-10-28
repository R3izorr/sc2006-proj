from pydantic import BaseModel

class KernelConfig(BaseModel):
    kernel_kind: str = "exp"
    lambda_D: float = 700.0
    lambda_S: float = 700.0
    lambda_C: float = 700.0
    lambda_M: float = 900.0
    lambda_B: float = 500.0
    w_D: float = 0.5
    w_S: float = 0.3
    w_A: float = 0.2
    beta_MRT: float = 1.0
    beta_BUS: float = 1.0


