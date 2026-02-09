from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AddressBase(BaseModel):
    contact_name: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50, pattern=r"^[\d\s\+\-\(\)\.]{6,50}$")
    address_type: str = Field(..., pattern="^(home|office|other)$")
    lat: Optional[float] = None
    lng: Optional[float] = None
    street: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    country: str = Field(..., max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    state_province: Optional[str] = Field(None, max_length=100)
    label: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    building_name: Optional[str] = Field(None, max_length=255)
    floor_office: Optional[str] = Field(None, max_length=100)
    is_default: bool = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    contact_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50, pattern=r"^[\d\s\+\-\(\)\.]{6,50}$")
    address_type: Optional[str] = Field(None, pattern="^(home|office|other)$")
    lat: Optional[float] = None
    lng: Optional[float] = None
    street: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    state_province: Optional[str] = Field(None, max_length=100)
    label: Optional[str] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    building_name: Optional[str] = Field(None, max_length=255)
    floor_office: Optional[str] = Field(None, max_length=100)
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    address_code: str
    contact_name: str
    phone: str
    address_type: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    street: str
    city: str
    country: str
    postal_code: Optional[str] = None
    state_province: Optional[str] = None
    label: Optional[str] = None
    company_name: Optional[str] = None
    building_name: Optional[str] = None
    floor_office: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
