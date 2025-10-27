from pydantic import BaseModel, EmailStr

class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str
    is_admin: bool = False


