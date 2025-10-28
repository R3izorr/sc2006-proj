from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..controllers import auth_controller
from .deps import db_session, get_current_user, require_admin


router = APIRouter()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"


@router.post("/register")
def register(body: RegisterIn, session: Session = Depends(db_session), _admin=Depends(require_admin)):
    try:
        return auth_controller.register(session, email=body.email, password=body.password, role=body.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(body: LoginIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.login(session, email=body.email, password=body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


class RefreshIn(BaseModel):
    refresh_token: str


@router.post("/refresh")
def refresh(body: RefreshIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.refresh(session, refresh_token=body.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout(body: RefreshIn, session: Session = Depends(db_session)):
    return auth_controller.logout(session, refresh_token=body.refresh_token)


@router.get("/me")
def me(user=Depends(get_current_user), session: Session = Depends(db_session)):
    return user


