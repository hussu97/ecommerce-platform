from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.core.audit import log_audit_from_request
from app.models.user import User
from app.models.customer_address import CustomerAddress
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse

router = APIRouter()


@router.get("", response_model=List[AddressResponse])
async def list_my_addresses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all addresses for the current user."""
    result = await db.execute(
        select(CustomerAddress)
        .where(CustomerAddress.user_id == current_user.id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc())
    )
    rows = result.scalars().all()
    return [AddressResponse.model_validate(r) for r in rows]


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    body: AddressCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new address. If is_default=True, unset other defaults."""
    if body.is_default:
        others = (await db.execute(
            select(CustomerAddress).where(CustomerAddress.user_id == current_user.id)
        )).scalars().all()
        for o in others:
            o.is_default = False

    addr = CustomerAddress(
        user_id=current_user.id,
        contact_name=body.contact_name,
        phone=body.phone,
        address_type=body.address_type,
        lat=body.lat,
        lng=body.lng,
        street=body.street,
        city=body.city,
        country=body.country,
        postal_code=body.postal_code,
        state_province=body.state_province,
        label=body.label,
        company_name=body.company_name,
        building_name=body.building_name,
        floor_office=body.floor_office,
        is_default=body.is_default,
    )
    db.add(addr)
    await db.flush()
    await log_audit_from_request(db, request, "address.create", "address", addr.address_code, current_user.id, 201)
    await db.commit()
    await db.refresh(addr)
    return AddressResponse.model_validate(addr)


@router.get("/{address_code}", response_model=AddressResponse)
async def get_address(
    address_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single address by address_code (must belong to current user)."""
    result = await db.execute(
        select(CustomerAddress).where(
            CustomerAddress.address_code == address_code,
            CustomerAddress.user_id == current_user.id,
        )
    )
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return AddressResponse.model_validate(addr)


@router.put("/{address_code}", response_model=AddressResponse)
async def update_address(
    address_code: str,
    body: AddressUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an address. Only provided fields are updated."""
    result = await db.execute(
        select(CustomerAddress).where(
            CustomerAddress.address_code == address_code,
            CustomerAddress.user_id == current_user.id,
        )
    )
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    data = body.model_dump(exclude_unset=True)
    if data.get("is_default") is True:
        others_result = await db.execute(
            select(CustomerAddress).where(
                CustomerAddress.user_id == current_user.id,
                CustomerAddress.address_code != address_code,
            )
        )
        for o in others_result.scalars().all():
            o.is_default = False
    for k, v in data.items():
        setattr(addr, k, v)
    await log_audit_from_request(db, request, "address.update", "address", address_code, current_user.id, 200)
    await db.commit()
    await db.refresh(addr)
    return AddressResponse.model_validate(addr)


@router.delete("/{address_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an address."""
    result = await db.execute(
        select(CustomerAddress).where(
            CustomerAddress.address_code == address_code,
            CustomerAddress.user_id == current_user.id,
        )
    )
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    await db.delete(addr)
    await log_audit_from_request(db, request, "address.delete", "address", address_code, current_user.id, 204)
    await db.commit()


@router.patch("/{address_code}/default", response_model=AddressResponse)
async def set_default_address(
    address_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Set this address as the default. Others are unset."""
    result = await db.execute(
        select(CustomerAddress).where(
            CustomerAddress.address_code == address_code,
            CustomerAddress.user_id == current_user.id,
        )
    )
    addr = result.scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    others = (await db.execute(
        select(CustomerAddress).where(CustomerAddress.user_id == current_user.id)
    )).scalars().all()
    for o in others:
        o.is_default = o.address_code == address_code
    await db.commit()
    await db.refresh(addr)
    return AddressResponse.model_validate(addr)
