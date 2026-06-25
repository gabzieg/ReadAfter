import asyncio
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.db.database import get_db
from app.models.schemas import ReelUpdateSchema, FolderCreateSchema, FolderUpdateSchema

# --- REELS REPOSITORY ---

async def get_reels_async(limit: int, offset: int, q: str, liked: bool, archived: bool, folder_id: Optional[str]) -> List[Dict[str, Any]]:
    def _execute():
        with get_db() as conn:
            query = "SELECT * FROM reels WHERE 1=1"
            params = []
            if q:
                query += " AND (title LIKE ? OR summary LIKE ? OR tags LIKE ?)"
                params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
            if liked:
                query += " AND is_liked = 1"
            if archived:
                query += " AND is_archived = 1"
            else:
                query += " AND is_archived = 0"
            if folder_id:
                query += " AND folder_id = ?"
                params.append(folder_id)
            query += " ORDER BY saved_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            rows = conn.execute(query, params).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["tags"] = json.loads(d["tags"]) if d["tags"] else []
                d["ingredients"] = json.loads(d["ingredients"]) if d["ingredients"] else []
                d["links"] = json.loads(d.get("links") or "[]")
                d["action_items"] = json.loads(d.get("action_items") or "[]")
                d["products"] = json.loads(d.get("products") or "[]")
                results.append(d)
            return results
    return await asyncio.to_thread(_execute)

async def get_reel_by_id_async(reel_id: str) -> Optional[Dict[str, Any]]:
    def _execute():
        with get_db() as conn:
            r = conn.execute("SELECT * FROM reels WHERE id = ?", (reel_id,)).fetchone()
            if r:
                d = dict(r)
                d["tags"] = json.loads(d["tags"]) if d["tags"] else []
                d["ingredients"] = json.loads(d["ingredients"]) if d["ingredients"] else None
                return d
            return None
    return await asyncio.to_thread(_execute)

async def check_url_exists_async(url: str) -> Optional[str]:
    def _execute():
        with get_db() as conn:
            row = conn.execute("SELECT id FROM reels WHERE url = ?", (url,)).fetchone()
            return row["id"] if row else None
    return await asyncio.to_thread(_execute)

async def update_reel_async(reel_id: str, data: ReelUpdateSchema) -> Dict[str, str]:
    def _execute():
        with get_db() as conn:
            updates = []
            params = []
            if data.is_liked is not None:
                updates.append("is_liked = ?")
                params.append(1 if data.is_liked else 0)
            if data.is_archived is not None:
                updates.append("is_archived = ?")
                params.append(1 if data.is_archived else 0)
            if data.folder_id is not None:
                updates.append("folder_id = ?")
                params.append(data.folder_id)
                
            if not updates:
                return {"status": "no_changes"}
                
            params.append(reel_id)
            conn.execute(f"UPDATE reels SET {', '.join(updates)} WHERE id = ?", params)
            return {"updated": reel_id}
    return await asyncio.to_thread(_execute)

async def delete_reel_async(reel_id: str) -> None:
    def _execute():
        with get_db() as conn:
            conn.execute("DELETE FROM reels WHERE id = ?", (reel_id,))
    await asyncio.to_thread(_execute)

# --- FOLDERS REPOSITORY ---

async def get_folders_async() -> List[Dict[str, Any]]:
    def _execute():
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM folders ORDER BY is_pinned DESC, updated_at DESC").fetchall()
            return [dict(r) for r in rows]
    return await asyncio.to_thread(_execute)

async def create_folder_async(data: FolderCreateSchema) -> Dict[str, Any]:
    def _execute():
        folder_id = str(uuid.uuid4())
        updated_at = datetime.utcnow().isoformat()
        with get_db() as conn:
            conn.execute("INSERT INTO folders (id, name, is_pinned, updated_at) VALUES (?, ?, 0, ?)", 
                         (folder_id, data.name, updated_at))
        return {"id": folder_id, "name": data.name, "is_pinned": 0, "updated_at": updated_at}
    return await asyncio.to_thread(_execute)

async def update_folder_async(folder_id: str, data: FolderUpdateSchema) -> Dict[str, str]:
    def _execute():
        updated_at = datetime.utcnow().isoformat()
        with get_db() as conn:
            updates = ["updated_at = ?"]
            params = [updated_at]
            if data.name is not None:
                updates.append("name = ?")
                params.append(data.name)
            if data.is_pinned is not None:
                updates.append("is_pinned = ?")
                params.append(1 if data.is_pinned else 0)
                
            params.append(folder_id)
            conn.execute(f"UPDATE folders SET {', '.join(updates)} WHERE id = ?", params)
        return {"updated": folder_id}
    return await asyncio.to_thread(_execute)

async def delete_folder_async(folder_id: str) -> None:
    def _execute():
        with get_db() as conn:
            conn.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
            conn.execute("UPDATE reels SET folder_id = NULL WHERE folder_id = ?", (folder_id,))
    await asyncio.to_thread(_execute)
