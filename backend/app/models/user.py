from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, Field, field_validator
from datetime import date


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, v: str):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password too long (bcrypt limit is 72 bytes).")
        return v

class UserUpdate(BaseModel):
    phone_number: Optional[str] = None
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    statut_marital: Optional[str] = None

    @field_validator("date_naissance", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("phone_number", "sexe", "statut_marital", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v


class UserOut(BaseModel):
    id: str
    username: str
    phone_number: Optional[str] = None
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    statut_marital: Optional[str] = None


class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    username: str
    hashed_password: str
    email: Optional[str] = None
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    statut_marital: Optional[str] = None
    phone_number: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_max_72_bytes(cls, v: str):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password too long (bcrypt limit is 72 bytes).")
        return v
        
