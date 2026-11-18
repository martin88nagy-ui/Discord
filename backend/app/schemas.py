from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoginInput(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=1, max_length=256)

class AdminCreateInput(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=128)
    role: str = Field(default="admin", pattern=r"^(admin|moderator)$")

class AdminUpdateInput(BaseModel):
    role: str | None = Field(default=None, pattern=r"^(admin|moderator)$")
    is_active: bool | None = None

class AdminOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime

class LoginOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    admin: AdminOutput

class AuditOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_id: int | None
    action: str
    target: str | None
    details: str | None
    created_at: datetime
