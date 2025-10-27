from pydantic import BaseModel

class Snapshot(BaseModel):
    id: str
    created_at: str
    notes: str | None = None


