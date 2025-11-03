# Forgotten Password Reset Implementation Plan

## Overview
This plan details the implementation of a secure forgotten password reset flow with email verification. Users who forget their password can request a reset link sent to their registered email, verify ownership via a one-time token, and set a new password.

---

## Prerequisites
- Users must register with a valid email address
- Email verification is recommended before allowing password reset (prevents abuse)
- Access to an email service provider (e.g., SendGrid, AWS SES, Mailgun, or SMTP)

---

## Phase 1: Email Verification on Registration (Optional but Recommended)

### 1.1 Database Changes
Add email verification tracking to the `users` table:

**Migration: `backend/sql/005_email_verification.sql`**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;
```

### 1.2 Backend Model Update
Update `backend/src/models/user.py`:
```python
email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
email_verification_token: Mapped[Optional[str]] = mapped_column(Text, unique=True)
email_verification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
```

### 1.3 Email Verification Flow
**On Registration:**
1. Create user with `email_verified=False`
2. Generate a unique verification token (UUID or secure random string)
3. Store token and timestamp in user row
4. Send verification email with link: `https://yoursite.com/#/verify-email?token=TOKEN`
5. User clicks link → frontend calls `POST /auth/verify-email { "token": "..." }`
6. Backend validates token, sets `email_verified=True`, clears token

**Endpoints:**
- `POST /auth/send-verification-email` (resend verification email)
- `POST /auth/verify-email` (verify token and activate account)

---

## Phase 2: Forgotten Password Reset Flow

### 2.1 Database Changes
Add password reset tracking:

**Migration: `backend/sql/006_password_reset.sql`**
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens(user_id);
```

### 2.2 Backend Models
Create `backend/src/models/password_reset_token.py`:
```python
from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[Optional[str]] = mapped_column(Text)
```

### 2.3 Email Service Setup

**Dependencies:**
Add to `backend/requirements.txt`:
```
sendgrid>=6.10  # or alternatives: mailgun, boto3 for SES
```

**Environment Variables (`.env`):**
```
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yoursite.com
FRONTEND_URL=http://localhost:5173  # dev; change to production URL in prod
```

**Email Service: `backend/src/services/email_service.py`**
```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email with token link."""
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("FROM_EMAIL", "noreply@example.com")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    reset_link = f"{frontend_url}/#/reset-password?token={reset_token}"
    
    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject="Reset Your Password - Hawker Opportunity Platform",
        html_content=f"""
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>If you did not request this, please ignore this email.</p>
        """
    )
    
    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        print(f"Email send error: {e}")
        return False

def send_email_verification(to_email: str, verification_token: str) -> bool:
    """Send email verification link."""
    # Similar structure to password reset email
    pass
```

### 2.4 Password Reset Service Logic

**Service: `backend/src/services/password_reset_service.py`**
```python
import os
import secrets
import time
from datetime import datetime, timezone
from hashlib import sha256
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models.password_reset_token import PasswordResetToken
from ..repositories import user_repo

def _hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()

def request_password_reset(session: Session, email: str, ip_address: str = None) -> tuple[bool, str]:
    """Generate reset token and send email. Returns (success, token_or_error)."""
    user = user_repo.get_user_by_email(session, email)
    if not user:
        # Security: don't reveal if email exists; return generic message
        return False, "If that email is registered, a reset link has been sent"
    
    # Optional: check email_verified
    if not getattr(user, "email_verified", True):
        return False, "Email not verified. Please verify your email first."
    
    # Rate limit: prevent spam (check recent tokens for this user)
    recent = session.execute(
        select(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .where(PasswordResetToken.created_at > datetime.now(timezone.utc) - timedelta(minutes=5))
    ).scalars().first()
    if recent:
        return False, "Password reset already requested. Please wait 5 minutes."
    
    # Generate token (48-byte URL-safe)
    token = secrets.token_urlsafe(48)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour validity
    
    prt = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip_address,
    )
    session.add(prt)
    session.flush()
    
    # Send email
    from ..services.email_service import send_password_reset_email
    success = send_password_reset_email(user.email, token)
    if not success:
        return False, "Failed to send email"
    
    return True, token  # For dev/testing; in prod, return generic message

def verify_reset_token(session: Session, token: str) -> tuple[bool, str]:
    """Validate reset token. Returns (valid, user_id_or_error)."""
    th = _hash_token(token)
    prt = session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == th)
    ).scalars().first()
    
    if not prt:
        return False, "Invalid or expired reset token"
    if prt.used_at:
        return False, "Reset token already used"
    if prt.expires_at < datetime.now(timezone.utc):
        return False, "Reset token expired"
    
    return True, prt.user_id

def reset_password(session: Session, token: str, new_password: str) -> tuple[bool, str]:
    """Reset password using valid token. Returns (success, message)."""
    valid, user_id_or_error = verify_reset_token(session, token)
    if not valid:
        return False, user_id_or_error
    
    user_id = user_id_or_error
    user = user_repo.get_user_by_id(session, user_id)
    if not user:
        return False, "User not found"
    
    # Validate new password policy
    from ..services.auth_service import validate_password_policy, hash_password
    pol_valid, pol_msg = validate_password_policy(new_password)
    if not pol_valid:
        return False, pol_msg
    
    # Update password
    user.password_hash = hash_password(new_password)
    
    # Mark token as used
    th = _hash_token(token)
    prt = session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == th)
    ).scalars().first()
    if prt:
        prt.used_at = datetime.now(timezone.utc)
    
    # Optional: revoke all refresh tokens for this user (force re-login)
    from ..services.auth_service import revoke_all_refresh_tokens_for_user
    # revoke_all_refresh_tokens_for_user(session, user_id)
    
    return True, "Password reset successful"
```

### 2.5 Backend Controllers

**Update `backend/src/controllers/auth_controller.py`:**
```python
def request_password_reset(session: Session, *, email: str, ip_address: str = None) -> dict[str, Any]:
    from ..services import password_reset_service
    success, msg = password_reset_service.request_password_reset(session, email, ip_address)
    # Always return success to avoid email enumeration
    return {"ok": True, "message": "If that email is registered, a reset link has been sent"}

def reset_password(session: Session, *, token: str, new_password: str) -> dict[str, Any]:
    from ..services import password_reset_service
    success, msg = password_reset_service.reset_password(session, token, new_password)
    if not success:
        raise ValueError(msg)
    return {"ok": True, "message": "Password reset successful. You can now log in."}
```

### 2.6 Backend Routes

**Update `backend/src/routers/auth_router.py`:**
```python
class ForgotPasswordIn(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, request: Request, session: Session = Depends(db_session)):
    ip = request.client.host if request.client else None
    return auth_controller.request_password_reset(session, email=body.email, ip_address=ip)

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, session: Session = Depends(db_session)):
    try:
        return auth_controller.reset_password(session, token=body.token, new_password=body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## Phase 3: Frontend Implementation

### 3.1 Forgot Password Page

**Create `frontend/src/screens/Auth/ForgotPasswordPage.tsx`:**
```tsx
import React, { useState } from 'react'

export default function ForgotPasswordPage(){
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true)
    setError(null)
    setOk(null)
    try{
      const r = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      if(!r.ok) throw new Error('Request failed')
      setOk('If that email is registered, a reset link has been sent. Check your inbox.')
      setEmail('')
    } catch(err: any){
      setError(err?.message || 'Failed to send reset email')
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[360px]">
        <h1 className="text-xl font-semibold mb-3">Forgot Password</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="w-full border rounded px-2 py-1" 
            required 
          />
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">
          {busy ? 'Sending…' : 'Send Reset Link'}
        </button>
        <div className="text-sm mt-3 text-center">
          <a href="#/login" className="text-blue-600">Back to Sign in</a>
        </div>
      </form>
    </div>
  )
}
```

### 3.2 Reset Password Page

**Create `frontend/src/screens/Auth/ResetPasswordPage.tsx`:**
```tsx
import React, { useState, useEffect } from 'react'

export default function ResetPasswordPage(){
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    // Extract token from URL hash query params
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const t = params.get('token')
    if(t) setToken(t)
  }, [])

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setBusy(true)
    setError(null)
    setOk(null)
    try{
      if (password !== password2){
        throw new Error('Passwords do not match')
      }
      // Client-side password validation (same as RegisterPage)
      if (password.length < 8) throw new Error('Password must be at least 8 characters long')
      if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter')
      if (!/[a-z]/.test(password)) throw new Error('Password must contain at least one lowercase letter')
      if (!/\d/.test(password)) throw new Error('Password must contain at least one number')
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)){
        throw new Error('Password must contain at least one special character')
      }

      const r = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      })
      if(!r.ok){
        const msg = await r.text().catch(()=>null)
        throw new Error(msg || 'Reset failed')
      }
      setOk('Password reset successful. Redirecting to sign in…')
      setTimeout(()=>{ window.location.hash = '#/login' }, 1500)
    } catch(err: any){
      setError(err?.message || 'Password reset failed')
    } finally { setBusy(false) }
  }

  if(!token){
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="border border-gray-200 rounded p-4 bg-white w-[360px]">
          <div className="text-sm text-red-600">Invalid or missing reset token.</div>
          <a href="#/login" className="text-blue-600 text-sm mt-2 block">Back to Sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 bg-white w-[360px]">
        <h1 className="text-xl font-semibold mb-3">Reset Password</h1>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">New Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            className="w-full border rounded px-2 py-1" 
            required 
          />
          <div className="text-xs text-gray-500 mt-1">Minimum 8 characters, uppercase, lowercase, number, special char</div>
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
          <input 
            type="password" 
            value={password2} 
            onChange={e=>setPassword2(e.target.value)} 
            className="w-full border rounded px-2 py-1" 
            required 
          />
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-sm text-green-700 mb-2">{ok}</div>}
        <button disabled={busy} className="w-full px-3 py-2 rounded text-white bg-blue-600">
          {busy ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
```

### 3.3 Add Link to LoginPage

**Update `frontend/src/screens/Auth/LoginPage.tsx`:**
Add a "Forgot password?" link below the password field:
```tsx
<div className="mb-2">
  <div className="flex justify-between items-center mb-1">
    <label className="block text-sm text-gray-600">Password</label>
    <a href="#/forgot-password" className="text-xs text-blue-600">Forgot password?</a>
  </div>
  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-2 py-1" />
</div>
```

### 3.4 Routing

**Update `frontend/src/App.tsx`:**
Add routes:
```tsx
import ForgotPasswordPage from './screens/Auth/ForgotPasswordPage'
import ResetPasswordPage from './screens/Auth/ResetPasswordPage'

// In your router:
{ path: '/forgot-password', element: <ForgotPasswordPage /> },
{ path: '/reset-password', element: <ResetPasswordPage /> },
```

---

## Phase 4: Security Considerations

### 4.1 Token Security
- Hash tokens before storing (SHA-256)
- Set expiration (1 hour recommended)
- Mark tokens as used after password reset
- Invalidate all tokens for a user after successful reset

### 4.2 Rate Limiting
- Limit password reset requests to 1 per 5 minutes per email
- Limit reset attempts per IP (e.g., 5 per hour)
- Log all reset requests with IP for abuse monitoring

### 4.3 Email Enumeration Prevention
- Always return success message regardless of whether email exists
- Use generic wording: "If that email is registered, a reset link has been sent"

### 4.4 HTTPS Requirement
- Password reset links MUST be sent over HTTPS in production
- Tokens transmitted in URL query params; use secure cookies as alternative

### 4.5 Token Cleanup
- Periodically delete expired/used tokens (cron job or on-demand cleanup)

---

## Phase 5: Testing Checklist

- [ ] User requests password reset with registered email → receives email with valid link
- [ ] User requests password reset with unregistered email → receives generic success (no email sent)
- [ ] User clicks reset link → ResetPasswordPage loads with token
- [ ] User submits weak password → validation error
- [ ] User submits strong password → password updated; redirect to login
- [ ] User tries to reuse reset token → error "already used"
- [ ] User tries expired token → error "expired"
- [ ] Rate limit: multiple requests in 5 minutes → error
- [ ] Password reset with unverified email (if email verification enabled) → error

---

## Phase 6: Deployment

### 6.1 Environment Setup
- Add SendGrid API key (or alternative email service credentials)
- Set `FROM_EMAIL` and `FRONTEND_URL` in production `.env`
- Ensure HTTPS is enforced in production

### 6.2 Migrations
- Apply `005_email_verification.sql` (if implementing email verification)
- Apply `006_password_reset.sql`

### 6.3 Monitoring
- Log all password reset requests (email, IP, timestamp)
- Alert on unusual patterns (e.g., 100+ requests for same email)

---

## Optional Enhancements

### Email Verification on Registration
- Require email verification before allowing login
- Send verification email on registration with token link
- Add `POST /auth/verify-email` and `POST /auth/resend-verification` endpoints

### Multi-Factor Authentication (MFA)
- Add TOTP (Time-based One-Time Password) support
- Require MFA code during password reset for high-security accounts

### Magic Link Login (Passwordless)
- Alternative to password reset: send one-time login link via email
- User clicks link → auto-login without password

---

## Summary

**Implementation Order:**
1. Set up email service (SendGrid/SES/SMTP)
2. Add DB migrations (email verification + password reset tokens)
3. Implement backend services, controllers, routes
4. Create frontend pages (ForgotPasswordPage, ResetPasswordPage)
5. Add link to LoginPage
6. Test flows end-to-end
7. Deploy with production email credentials and HTTPS

**Estimated Effort:**
- Backend: 3–4 hours (models, services, routes, email integration)
- Frontend: 2–3 hours (pages, routing, validation)
- Testing: 1–2 hours
- Total: ~6–9 hours

**Key Dependencies:**
- Email service provider account (SendGrid/AWS SES/Mailgun)
- Valid SMTP credentials or API key
- Production domain with HTTPS for secure token transmission

