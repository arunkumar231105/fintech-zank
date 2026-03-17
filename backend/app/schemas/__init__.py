from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str = "user"

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
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer")
        return value

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: str

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

class GoogleLoginRequest(BaseModel):
    token: str

class AuthStatusResponse(BaseModel):
    success: bool
    message: str

class LoginResponse(BaseModel):
    success: bool
    accessToken: str
    user: UserResponse
