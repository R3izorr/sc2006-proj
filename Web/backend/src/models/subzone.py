from pydantic import BaseModel

class SubzoneSummary(BaseModel):
    name: str
    h_score: float | None = None
    dem: float | None = None
    sup: float | None = None
    acc: float | None = None


