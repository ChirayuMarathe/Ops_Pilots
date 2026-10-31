from typing import List, Optional
from pydantic import BaseModel, Field


class GitHubConnectRequest(BaseModel):
    access_token: str = Field(min_length=10, description="GitHub Personal Access Token or OAuth token")
    webhook_secret: Optional[str] = Field(default=None, description="Optional custom webhook secret")


class GitHubStatusResponse(BaseModel):
    is_connected: bool
    login: Optional[str] = None
    avatar_url: Optional[str] = None
    scopes: List[str] = []
    status: str = "disconnected"


class GitHubRepoItem(BaseModel):
    id: int
    name: str
    full_name: str
    owner: str
    private: bool
    html_url: str
    description: Optional[str] = None
    default_branch: str = "main"
    language: Optional[str] = None
    updated_at: Optional[str] = None


class GitHubBranchItem(BaseModel):
    name: str
    protected: bool = False


class GitHubWorkflowItem(BaseModel):
    id: str
    name: str
    path: str
    state: str
    html_url: Optional[str] = None

