from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings
from .redis_client import get_redis_client

settings = get_settings()
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days

# Configure CryptContext to allow long passwords (will be handled by our truncation)
# bcrypt__truncate_error=False tells passlib to silently truncate instead of raising ValueError
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__truncate_error=False)

def _truncate_password(password: str) -> bytes:
    """Bcrypt has a 72-byte limit. We truncate here as bytes to be safe."""
    if isinstance(password, str):
        password = password.encode("utf-8")
    return password[:72]

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(_truncate_password(plain_password), hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(_truncate_password(password))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def blacklist_token(token: str, expires_at: datetime | None) -> None:
    if not token:
        return
    ttl = None
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        ttl = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
    try:
        get_redis_client().setex(f"blacklist:{token}", ttl or 60, "1")
    except Exception:
        return


def is_token_blacklisted(token: str) -> bool:
    if not token:
        return False
    try:
        return bool(get_redis_client().get(f"blacklist:{token}"))
    except Exception:
        return False
