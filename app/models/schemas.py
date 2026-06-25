from typing import Optional
from pydantic import BaseModel

class SaveReelRequest(BaseModel):
    url: str

class ReelStatus(BaseModel):
    id: str
    status: str
    step: Optional[str] = None
    error: Optional[str] = None

class ReelUpdateSchema(BaseModel):
    is_liked: Optional[bool] = None
    is_archived: Optional[bool] = None
    folder_id: Optional[str] = None

class FolderCreateSchema(BaseModel):
    name: str

class FolderUpdateSchema(BaseModel):
    name: Optional[str] = None
    is_pinned: Optional[bool] = None
