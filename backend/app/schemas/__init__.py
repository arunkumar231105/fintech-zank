from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "user"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr):
        return str(value).strip().lower()

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_names(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer")
        return value

class UserResponse(UserBase):
    id: str
    phone: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    kyc_status: Optional[str] = "pending"
    loyalty_tier: Optional[str] = "Bronze"
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = True

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_login_email(cls, value: EmailStr):
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer")
        return value

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("email")
    @classmethod
    def normalize_otp_email(cls, value: EmailStr):
        return str(value).strip().lower()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("OTP is required")
        return value

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_forgot_email(cls, value: EmailStr):
        return str(value).strip().lower()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password", "confirm_password")
    @classmethod
    def validate_reset_password_length(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer")
        return value

    @field_validator("token")
    @classmethod
    def validate_token(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Token is required")
        return value

class GoogleLoginRequest(BaseModel):
    token: str

class AuthStatusResponse(BaseModel):
    success: bool
    message: str

class LoginResponse(BaseModel):
    success: bool
    accessToken: str
    user: UserResponse
