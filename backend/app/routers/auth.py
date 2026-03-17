import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

from ..core.database import get_db
from ..core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from ..core.email_utils import send_email
from ..models import User as UserModel, PendingRegistration, OTPCode, RefreshToken, Wallet, Card, PasswordResetToken
from ..schemas import (
    UserCreate, AuthStatusResponse, LoginRequest, OTPVerifyRequest, 
    ForgotPasswordRequest, ResetPasswordRequest, LoginResponse, UserResponse
)
import uuid

router = APIRouter()

# Helper for UUID
def gen_token():
    return secrets.token_urlsafe(32)

def gen_otp():
    import random
    return str(random.randint(100000, 999999))

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email is already in users table
    if db.query(UserModel).filter(UserModel.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if email is in pending_registrations and drop old one if so
    pending = db.query(PendingRegistration).filter(PendingRegistration.email == user.email).first()
    if pending:
        db.delete(pending)
        db.commit()

    token = gen_token()
    expires = datetime.utcnow() + timedelta(hours=24)
    hashed = get_password_hash(user.password[:72])

    new_pending = PendingRegistration(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=hashed,
        role=user.role,
        verification_token=token,
        expires_at=expires
    )
    db.add(new_pending)
    db.commit()

    # Send email
    verify_url = f"http://localhost:3000/auth/verify-email?token={token}"
    html = f"<h3>Welcome to Zank AI!</h3><p>Please <a href='{verify_url}'>click here</a> to verify your email address. This link expires in 24 hours.</p>"
    send_email(user.email, "Verify your Zank AI Account", html)

    return {"success": True, "message": "Verification email sent. Please check your inbox."}

class VerifyEmailRequest(BaseModel):
    token: str

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    pending = db.query(PendingRegistration).filter(PendingRegistration.verification_token == req.token).first()
    
    if not pending:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    if pending.expires_at < datetime.utcnow():
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="Token expired, please register again")

    # Move to Users table
    new_user = UserModel(
        first_name=pending.first_name,
        last_name=pending.last_name,
        email=pending.email,
        hashed_password=pending.hashed_password,
        role=pending.role,
        is_verified=True,
    )
    db.add(new_user)
    db.delete(pending)
    db.commit()
    db.refresh(new_user)
    
    # Give them a starter wallet automatically
    wallet = Wallet(
        user_id=new_user.id,
        wallet_id=f"W-{secrets.token_hex(4).upper()}",
        total_balance=0.0,
        available_balance=0.0,
        account_number=f"001{secrets.token_hex(3)}",
        routing_number="123456789"
    )
    db.add(wallet)
    db.commit()

    return {"success": True, "message": "Email verified! You can now login."}

@router.post("/login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    # Generate OTP
    code = gen_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP
    otp_record = OTPCode(user_id=user.id, code=code, expires_at=expires)
    db.add(otp_record)
    db.commit()

    # Send Email
    html = f"<h3>Your Login Code</h3><p>Your OTP code is: <strong>{code}</strong>. Valid for 10 minutes.</p>"
    send_email(user.email, "Zank AI - Login Code", html)

    return {"success": True, "message": "OTP sent"}

@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(req: OTPVerifyRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_record = db.query(OTPCode).filter(OTPCode.user_id == user.id, OTPCode.used == False).order_by(OTPCode.created_at.desc() if hasattr(OTPCode, 'created_at') else OTPCode.id.desc()).first()
    
    if not otp_record or otp_record.code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
        
    otp_record.used = True
    db.commit()

    # Issue Tokens
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    rt_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=datetime.utcnow() + timedelta(days=7))
    db.add(rt_record)
    db.commit()

    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False  # True in prod HTTPS
    )

    user_resp = UserResponse(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        id=user.id,
        phone=user.phone,
        country=user.country,
        timezone=user.timezone,
        kyc_status=user.kyc_status,
        loyalty_tier=user.loyalty_tier,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
    )
    
    return {
        "success": True,
        "accessToken": access_token,
        "user": user_resp
    }

@router.post("/refresh-token")
def refresh_token(request: Request, db: Session = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if not cookie_token:
        raise HTTPException(status_code=401, detail="No refresh token")
        
    rt_record = db.query(RefreshToken).filter(RefreshToken.token == cookie_token).first()
    if not rt_record or rt_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    user = db.query(UserModel).filter(UserModel.id == rt_record.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return {"accessToken": access_token}

@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if cookie_token:
        rt_record = db.query(RefreshToken).filter(RefreshToken.token == cookie_token).first()
        if rt_record:
            db.delete(rt_record)
            db.commit()
    response.delete_cookie("refresh_token")
    return {"success": True, "message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
        
    token = gen_token()
    pr_record = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(pr_record)
    db.commit()
    
    reset_url = f"http://localhost:3000/auth/reset-password?token={token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #2affc4; margin: 0; font-size: 28px;">Zank AI</h1>
            </div>
            <h2 style="color: #f8fafc; font-size: 20px; text-align: center; margin-bottom: 16px;">You requested a password reset</h2>
            <p style="text-align: center; line-height: 1.6; margin-bottom: 32px;">
                Click the button below to set up a new password for your Zank AI account.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="{reset_url}" style="background-color: #2affc4; color: #0f172a; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
                <strong>Warning:</strong> This link expires in 1 hour.
            </p>
            <p style="text-align: center; color: #64748b; font-size: 12px; margin: 0;">
                If you did not request this, ignore this email.
            </p>
        </div>
    </div>
    """
    send_email(user.email, "Zank AI - Reset Your Password", html)
    return {"success": True, "message": "Password reset link sent to your email. Please check your inbox."}

@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    pr_record = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not pr_record or pr_record.used or pr_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This link has expired. Please request a new one.")
    return {"success": True, "message": "Token is valid"}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
        
    pr_record = db.query(PasswordResetToken).filter(PasswordResetToken.token == req.token).first()
    if not pr_record or pr_record.used or pr_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This link has expired. Please request a new one.")
        
    user = db.query(UserModel).filter(UserModel.id == pr_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(req.new_password[:72])
    pr_record.used = True
    db.commit()
    return {"success": True, "message": "Password reset successfully!"}

class GoogleAuthReq(BaseModel):
    code: str

@router.post("/google")
def google_auth_generate_url():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    
    # Mock bypass if user hasn't set up actual Google Client ID yet for local testing
    if client_id == "your_google_client_id" or not client_id:
        return {"url": f"{redirect_uri}?code=mock_google_auth_code_for_local_testing"}
        
    scope = "openid email profile"
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&access_type=offline&prompt=consent"
    return {"url": url}

@router.post("/google/callback", response_model=LoginResponse)
def google_auth_callback(req: GoogleAuthReq, response: Response, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    
    # Mock bypass handler for local testing
    if req.code == "mock_google_auth_code_for_local_testing":
        email = "demo.google@zankmail.com"
        user_info = {
            "email": email,
            "given_name": "Demo",
            "family_name": "Google User",
            "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
        }
    else:
        # Normally we'd use httpx to exchange code for token:
        try:
            token_res = httpx.post("https://oauth2.googleapis.com/token", data={
                "code": req.code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }).json()
            
            # Then get user info
            access_token_g = token_res.get("access_token")
            if not access_token_g:
                raise HTTPException(status_code=400, detail="Invalid Google auth code")
                
            user_info = httpx.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_token_g}"}).json()
            
            email = user_info.get("email")
            if not email:
                raise HTTPException(status_code=400, detail="Could not get email from Google")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        # Auto-register google user
        user = UserModel(
            first_name=user_info.get("given_name", ""),
            last_name=user_info.get("family_name", ""),
            email=email,
            hashed_password=get_password_hash(secrets.token_hex(16)), # Dummy random password
            role="user",
            is_verified=True,
            avatar_url=user_info.get("picture", "")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        wallet = Wallet(
            user_id=user.id,
            wallet_id=f"W-{secrets.token_hex(4).upper()}",
            account_number=f"001{secrets.token_hex(3)}",
            routing_number="123456789"
        )
        db.add(wallet)
        db.commit()
        
    # Issue Tokens
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    rt_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=datetime.utcnow() + timedelta(days=7))
    db.add(rt_record)
    db.commit()

    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=7*24*60*60, samesite="lax")

    user_resp = UserResponse(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        id=user.id,
    )
    return {"success": True, "accessToken": access_token, "user": user_resp}
