from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .auth import current_admin, require_owner
from .database import get_db
from .models import AdminUser, AuditLog
from .schemas import AdminCreateInput, AdminOutput, AdminUpdateInput, AuditOutput
from .security import hash_password

router = APIRouter(prefix="/api/admin", tags=["administration"])

@router.get("/users", response_model=list[AdminOutput])
def list_admins(_: AdminUser = Depends(require_owner), db: Session = Depends(get_db)):
    return db.query(AdminUser).order_by(AdminUser.id.asc()).all()

@router.post("/users", response_model=AdminOutput, status_code=201)
def create_admin(payload: AdminCreateInput, actor: AdminUser = Depends(require_owner), db: Session = Depends(get_db)):
    if db.query(AdminUser).filter(AdminUser.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Ez a felhasználónév már foglalt.")
    user = AdminUser(username=payload.username, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.flush()
    db.add(AuditLog(actor_id=actor.id, action="admin.create", target=user.username, details=f"role={user.role}"))
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{admin_id}", response_model=AdminOutput)
def update_admin(admin_id: int, payload: AdminUpdateInput, actor: AdminUser = Depends(require_owner), db: Session = Depends(get_db)):
    user = db.get(AdminUser, admin_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Admin nem található.")
    if user.id == actor.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="A saját fiókodat itt nem tilthatod le.")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.add(AuditLog(actor_id=actor.id, action="admin.update", target=user.username, details=f"role={user.role}; active={user.is_active}"))
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{admin_id}", status_code=204)
def delete_admin(admin_id: int, actor: AdminUser = Depends(require_owner), db: Session = Depends(get_db)):
    user = db.get(AdminUser, admin_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Admin nem található.")
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="A saját fiókodat nem törölheted.")
    if user.role == "owner":
        owners = db.query(AdminUser).filter(AdminUser.role == "owner", AdminUser.is_active.is_(True)).count()
        if owners <= 1:
            raise HTTPException(status_code=400, detail="Az utolsó aktív tulajdonos nem törölhető.")
    username = user.username
    db.delete(user)
    db.add(AuditLog(actor_id=actor.id, action="admin.delete", target=username))
    db.commit()

@router.get("/audit", response_model=list[AuditOutput])
def audit_log(limit: int = 100, _: AdminUser = Depends(current_admin), db: Session = Depends(get_db)):
    safe_limit = max(1, min(limit, 250))
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(safe_limit).all()
