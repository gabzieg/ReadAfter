import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from app.models.schemas import SaveReelRequest, ReelUpdateSchema
from app.core.state import jobs
from app.core.security import verify_token
from app.services.pipeline import process_reel
from app.services.validators import is_valid_instagram_url
from app.db.repository import (
    get_reels_async,
    get_reel_by_id_async,
    update_reel_async,
    delete_reel_async,
    check_url_exists_async
)

router = APIRouter(prefix="/reels")

@router.get("")
async def list_reels(
    limit: int = 50, offset: int = 0, q: str = "",
    liked: bool = False, archived: bool = False, folder_id: Optional[str] = None
):
    return await get_reels_async(limit, offset, q, liked, archived, folder_id)

@router.patch("/{reel_id}", dependencies=[Depends(verify_token)])
async def update_reel(reel_id: str, data: ReelUpdateSchema):
    result = await update_reel_async(reel_id, data)
    return result

@router.post("/save", dependencies=[Depends(verify_token)])
async def save_reel(req: SaveReelRequest, background_tasks: BackgroundTasks):
    if not is_valid_instagram_url(req.url):
        raise HTTPException(status_code=400, detail="URL inválida ou não autorizada. Use um link do Instagram.")

    existing_id = await check_url_exists_async(req.url)
    if existing_id:
        fake_job_id = f"done_{existing_id}"
        jobs[fake_job_id] = {
            "status": "done",
            "step": "Já salvo",
            "error": None,
            "reel_id": existing_id,
            "reel": {"id": existing_id}
        }
        return {"job_id": fake_job_id, "status": "done"}

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "step": "Aguardando início", "error": None}
    background_tasks.add_task(process_reel, job_id, req.url)
    return {"job_id": job_id, "status": "queued"}

@router.get("/status/{job_id}")
async def job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job não encontrado")
    
    if job["status"] == "done" and "reel" in job and len(job["reel"]) == 1:
        full_reel = await get_reel_by_id_async(job["reel"]["id"])
        if full_reel:
            job["reel"] = full_reel
                
    return job

@router.delete("/{reel_id}", dependencies=[Depends(verify_token)])
async def delete_reel(reel_id: str):
    await delete_reel_async(reel_id)
    return {"deleted": reel_id}
