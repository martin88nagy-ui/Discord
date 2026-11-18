from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from . import models
from .auth import router as auth_router
from .admin import router as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BartosMulti Admin API", version="0.1.0", docs_url="/api/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(admin_router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "bartosmulti-admin-api"}
