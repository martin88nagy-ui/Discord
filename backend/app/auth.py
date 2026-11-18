from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import AdminSession, AdminUser, AuditLog
from .schemas import LoginInput, LoginOutput, AdminOutput
from .security import hash_token, new_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)

def current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bejelentkezés szükséges.")
    session = db.query(AdminSession).filter(
        AdminSession.token_hash == hash_token(credentials.credentials),
        AdminSession.expires_at > datetime.now(timezone.utc)
    ).first()
    if session is None:
        raise HTTPException(status_code=401, detail="A munkamenet lejárt vagy érvénytelen.")
    admin = db.get(AdminUser, session.admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=401, detail="A fiók nem aktív.")
    return admin

def require_owner(admin: AdminUser = Depends(current_admin)) -> AdminUser:
    if admin.role != "owner":
        raise HTTPException(status_code=403, detail="Ehhez tulajdonosi jogosultság szükséges.")
    return admin

@router.post("/login", response_model=LoginOutput)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if admin is None or not admin.is_active or not verify_password(admin.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="Hibás felhasználónév vagy jelszó.")
    raw_token = new_session_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.session_hours)
    db.add(AdminSession(admin_id=admin.id, token_hash=hash_token(raw_token), expires_at=expires))
    db.add(AuditLog(actor_id=admin.id, action="auth.login", target=admin.username))
    db.commit()
    return LoginOutput(access_token=raw_token, expires_at=expires, admin=admin)

@router.get("/me", response_model=AdminOutput)
def me(admin: AdminUser = Depends(current_admin)):
    return admin

@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    admin: AdminUser = Depends(current_admin),
    db: Session = Depends(get_db),
):
    if credentials:
        db.query(AdminSession).filter(AdminSession.token_hash == hash_token(credentials.credentials)).delete()
        db.add(AuditLog(actor_id=admin.id, action="auth.logout", target=admin.username))
        db.commit()
    return {"ok": True}
