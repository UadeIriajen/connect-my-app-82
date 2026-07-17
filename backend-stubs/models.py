"""
SQLAlchemy model additions for the Contact Lists feature.

Add these classes to your models file (or merge them into your existing
Contact model file) and run a migration to create the tables.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from your_project.database import Base


class ContactList(Base):
    __tablename__ = "contact_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="lists")
    memberships = relationship("ListMember", back_populates="list", cascade="all, delete-orphan")


class ListMember(Base):
    __tablename__ = "list_members"
    __table_args__ = (UniqueConstraint("list_id", "contact_id", name="uq_list_contact"),)

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("contact_lists.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    list = relationship("ContactList", back_populates="memberships")
    contact = relationship("Contact", back_populates="memberships")


# Add these relationships to your existing User and Contact models:
#
# class User(Base):
#     ...
#     lists = relationship("ContactList", back_populates="owner")
#
# class Contact(Base):
#     ...
#     memberships = relationship("ListMember", back_populates="contact", cascade="all, delete-orphan")
