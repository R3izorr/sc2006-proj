from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
import os
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..controllers import auth_controller
from .deps import db_session, get_current_user, require_admin


router = APIRouter()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    industry: str
    phone: str | None = None


@router.post("/register")
def register(body: RegisterIn, session: Session = Depends(db_session)):
    # Public client registration only; force role='client'
    try:
        return auth_controller.register(
            session,
            email=body.email,
            password=body.password,
            role="client",
            display_name=body.display_name,
            industry=body.industry,
            phone=body.phone,
        )
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


class GoogleLoginIn(BaseModel):
    id_token: str


@router.post("/google")
def google_login(body: GoogleLoginIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.login_with_google(session, id_token_str=body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


class VerifyEmailConfirmIn(BaseModel):
    token: str


@router.post("/verify-email/confirm")
def verify_email_confirm(body: VerifyEmailConfirmIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.verify_email(session, token=body.token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class VerifyEmailResendIn(BaseModel):
    email: EmailStr


@router.post("/verify-email/resend")
def verify_email_resend(body: VerifyEmailResendIn, session: Session = Depends(db_session)):
    return auth_controller.resend_verification_email(session, email=body.email)


class PwResetRequestIn(BaseModel):
    email: EmailStr


@router.post("/password-reset/request")
def pw_reset_request(body: PwResetRequestIn, request: Request, session: Session = Depends(db_session)):
    ip = request.client.host if request and request.client else None
    return auth_controller.request_password_reset(session, email=body.email, ip_address=ip)


class PwResetConfirmIn(BaseModel):
    token: str
    new_password: str


@router.post("/password-reset/confirm")
def pw_reset_confirm(body: PwResetConfirmIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.reset_password(session, token=body.token, new_password=body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/google/client-id")
def google_client_id():
    cid = os.getenv("GOOGLE_CLIENT_ID") or ""
    return JSONResponse({"client_id": cid}, headers={
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    })


class ProfileUpdateIn(BaseModel):
    display_name: str | None = None
    industry: str | None = None
    phone: str | None = None
    picture_url: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@router.get("/profile")
def get_profile(user=Depends(get_current_user), session: Session = Depends(db_session)):
    try:
        return auth_controller.get_profile(session, user_id=user["id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/profile")
def update_profile(body: ProfileUpdateIn, user=Depends(get_current_user), session: Session = Depends(db_session)):
    try:
        return auth_controller.update_profile(
            session,
            user_id=user["id"],
            display_name=body.display_name,
            industry=body.industry,
            phone=body.phone,
            picture_url=body.picture_url,
            current_password=body.current_password,
            new_password=body.new_password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


