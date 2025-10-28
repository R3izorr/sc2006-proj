from pydantic import BaseModel
from typing import List

class SubzoneListResponse(BaseModel):
    count: int
    subzones: List[str]


