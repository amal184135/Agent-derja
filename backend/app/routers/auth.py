from datetime import timedelta, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import UserCreate, UserUpdate, UserOut, ChangePasswordRequest
from app.services.auth_service import authenticate_user, create_user, get_user_by_username, update_user_profile, change_user_password

router = APIRouter(tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class UserAlreadyExistsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )


class InvalidCredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidTokenException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token is invalid or expired",
        )


class IncorrectPasswordException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )


async def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("sub") is None:
            raise InvalidTokenException()
        return payload
    except JWTError:
        raise InvalidTokenException()


@router.post("/register")
async def register_user(user: UserCreate):
    db_user = await get_user_by_username(user.username)
    if db_user:
        raise UserAlreadyExistsException()
    return await create_user(user)


@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise InvalidCredentialsException()

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify-token")
async def verify_user_token(payload: dict = Depends(verify_token)):
    return {"message": "Token is valid"}


def serialize_user(user: dict) -> UserOut:
    dob = user.get("date_naissance")
    if isinstance(dob, datetime):
        dob = dob.date()

    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        phone_number=user.get("phone_number"),
        date_naissance=dob,
        sexe=user.get("sexe"),
        statut_marital=user.get("statut_marital"),
    )


@router.get("/me", response_model=UserOut)
async def get_my_profile(payload: dict = Depends(verify_token)):
    user = await get_user_by_username(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return serialize_user(user)


@router.put("/me", response_model=UserOut)
async def update_my_profile(data: UserUpdate, payload: dict = Depends(verify_token)):
    user = await get_user_by_username(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated_user = await update_user_profile(str(user["_id"]), data)
    return serialize_user(updated_user)

@router.put("/me/change-password")
async def change_password(
    data: ChangePasswordRequest, payload: dict = Depends(verify_token)
):
    user = await get_user_by_username(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    success = await change_user_password(
        str(user["_id"]), data.current_password, data.new_password
    )
    if not success:
        raise IncorrectPasswordException()
    return {"message": "Password updated successfully"}
