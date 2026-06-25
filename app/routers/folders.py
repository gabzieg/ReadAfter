from fastapi import APIRouter, Depends
from app.models.schemas import FolderCreateSchema, FolderUpdateSchema
from app.core.security import verify_token
from app.db.repository import (
    get_folders_async,
    create_folder_async,
    update_folder_async,
    delete_folder_async
)

router = APIRouter(prefix="/folders")

@router.get("")
async def list_folders():
    return await get_folders_async()

@router.post("", dependencies=[Depends(verify_token)])
async def create_folder(data: FolderCreateSchema):
    result = await create_folder_async(data)
    return result

@router.patch("/{folder_id}", dependencies=[Depends(verify_token)])
async def update_folder(folder_id: str, data: FolderUpdateSchema):
    result = await update_folder_async(folder_id, data)
    return result

@router.delete("/{folder_id}", dependencies=[Depends(verify_token)])
async def delete_folder(folder_id: str):
    await delete_folder_async(folder_id)
    return {"deleted": folder_id}
