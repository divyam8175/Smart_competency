"""Authentication routes for signup and login."""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from ..db import get_database
from ..schemas import UserCreate, UserResponse, UserLogin, Token
from ..services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from ..config import get_settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])
settings = get_settings()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate) -> UserResponse:
    """Register a new user (candidate or admin)."""
    db = get_database()
    
    # Check if user already exists
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    now = datetime.utcnow()
    
    user_doc = {
        "email": user.email,
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "role": user.role.value,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db["users"].insert_one(user_doc)
    created_user = await db["users"].find_one({"_id": result.inserted_id})
    
    created_user["_id"] = str(created_user["_id"])
    return UserResponse(**created_user)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    """Login with email and password to get JWT token."""
    db = get_database()
    
    # Find user by email (username field in OAuth2 form)
    user = await db["users"].find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    user["_id"] = str(user["_id"])
    user_response = UserResponse(**user)
    
    return Token(access_token=access_token, user=user_response)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)) -> UserResponse:
    """Get current logged-in user information."""
    db = get_database()
    
    user = await db["users"].find_one({"email": current_user.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user["_id"] = str(user["_id"])
    return UserResponse(**user)
