"""
FastAPI stub for the Contact Lists feature.

Drop this into your backend and wire it into your main app with:
    app.include_router(lists_router, prefix="/lists", tags=["lists"])

This assumes you already have SQLAlchemy models for Contact and User, and a
get_current_user dependency. Adapt table/column names to your actual schema.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from your_project.database import get_db
from your_project.models import User, Contact, ContactList, ListMember
from your_project.auth import get_current_user

lists_router = APIRouter()


# ---- Pydantic schemas --------------------------------------------------------

class ContactListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None


class ContactListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ContactListRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    member_count: int

    class Config:
        from_attributes = True


class ContactMini(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    company: Optional[str]

    class Config:
        from_attributes = True


class ListMemberRead(BaseModel):
    list_id: int
    contact_id: int
    contact: ContactMini
    added_at: datetime

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    contact_id: int


# ---- List CRUD ---------------------------------------------------------------

@lists_router.get("", response_model=List[ContactListRead])
def list_lists(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all lists owned by the current user, with member counts."""
    rows = (
        db.query(ContactList)
        .filter(ContactList.owner_id == user.id)
        .order_by(ContactList.created_at.desc())
        .all()
    )
    result = []
    for lst in rows:
        count = db.query(ListMember).filter(ListMember.list_id == lst.id).count()
        result.append(
            ContactListRead(
                id=lst.id,
                name=lst.name,
                description=lst.description,
                created_at=lst.created_at,
                member_count=count,
            )
        )
    return result


@lists_router.post("", response_model=ContactListRead, status_code=201)
def create_list(
    data: ContactListCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = ContactList(
        name=data.name,
        description=data.description,
        owner_id=user.id,
    )
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return ContactListRead(
        id=lst.id,
        name=lst.name,
        description=lst.description,
        created_at=lst.created_at,
        member_count=0,
    )


@lists_router.get("/{list_id}", response_model=ContactListRead)
def get_list(
    list_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")
    count = db.query(ListMember).filter(ListMember.list_id == lst.id).count()
    return ContactListRead(
        id=lst.id,
        name=lst.name,
        description=lst.description,
        created_at=lst.created_at,
        member_count=count,
    )


@lists_router.put("/{list_id}", response_model=ContactListRead)
def update_list(
    list_id: int,
    data: ContactListUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")
    if data.name is not None:
        lst.name = data.name
    if data.description is not None:
        lst.description = data.description
    db.commit()
    db.refresh(lst)
    count = db.query(ListMember).filter(ListMember.list_id == lst.id).count()
    return ContactListRead(
        id=lst.id,
        name=lst.name,
        description=lst.description,
        created_at=lst.created_at,
        member_count=count,
    )


@lists_router.delete("/{list_id}")
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")
    db.delete(lst)
    db.commit()
    return {"ok": True}


# ---- List members ------------------------------------------------------------

@lists_router.get("/{list_id}/members", response_model=List[ListMemberRead])
def list_members(
    list_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")
    members = (
        db.query(ListMember)
        .filter(ListMember.list_id == list_id)
        .options(joinedload(ListMember.contact))
        .order_by(ListMember.added_at.desc())
        .all()
    )
    return members


@lists_router.post("/{list_id}/members")
def add_member(
    list_id: int,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")

    contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
    if not contact or contact.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    existing = (
        db.query(ListMember)
        .filter(ListMember.list_id == list_id, ListMember.contact_id == data.contact_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Contact is already in this list")

    member = ListMember(list_id=list_id, contact_id=data.contact_id)
    db.add(member)
    db.commit()
    return {"ok": True}


@lists_router.delete("/{list_id}/members/{contact_id}")
def remove_member(
    list_id: int,
    contact_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lst = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not lst or lst.owner_id != user.id:
        raise HTTPException(status_code=404, detail="List not found")

    member = (
        db.query(ListMember)
        .filter(ListMember.list_id == list_id, ListMember.contact_id == contact_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Contact not in list")
    db.delete(member)
    db.commit()
    return {"ok": True}
