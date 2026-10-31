import hashlib
import hmac
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status


class GitHubService:
    BASE_URL = "https://api.github.com"

    @classmethod
    def _get_headers(cls, token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "OpsPilot-Platform",
        }

    @classmethod
    async def get_user_info(cls, token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cls.BASE_URL}/user",
                    headers=cls._get_headers(token),
                    timeout=10.0,
                )
                if resp.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid GitHub access token or credentials expired."
                    )
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"GitHub API error: {resp.text}"
                    )
                data = resp.json()
                scopes = resp.headers.get("x-oauth-scopes", "")
                return {
                    "login": data.get("login"),
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "avatar_url": data.get("avatar_url"),
                    "html_url": data.get("html_url"),
                    "scopes": [s.strip() for s in scopes.split(",") if s.strip()] if scopes else [],
                }
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Network error connecting to GitHub API: {str(e)}"
                )

    @classmethod
    async def list_repositories(cls, token: str, per_page: int = 50) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cls.BASE_URL}/user/repos",
                    headers=cls._get_headers(token),
                    params={"sort": "updated", "per_page": per_page, "affiliation": "owner,collaborator,organization_member"},
                    timeout=12.0,
                )
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"Failed to fetch repositories from GitHub: {resp.text}"
                    )
                repos = resp.json()
                return [
                    {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "owner": r.get("owner", {}).get("login"),
                        "private": r.get("private"),
                        "html_url": r.get("html_url"),
                        "description": r.get("description"),
                        "default_branch": r.get("default_branch", "main"),
                        "language": r.get("language"),
                        "updated_at": r.get("updated_at"),
                    }
                    for r in repos
                ]
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Network error communicating with GitHub API: {str(e)}"
                )

    @classmethod
    async def list_branches(cls, token: str, owner: str, repo: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cls.BASE_URL}/repos/{owner}/{repo}/branches",
                    headers=cls._get_headers(token),
                    timeout=10.0,
                )
                if resp.status_code != 200:
                    return []
                return [{"name": b.get("name"), "protected": b.get("protected", False)} for b in resp.json()]
            except httpx.RequestError:
                return []

    @classmethod
    async def list_workflows(cls, token: str, owner: str, repo: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cls.BASE_URL}/repos/{owner}/{repo}/actions/workflows",
                    headers=cls._get_headers(token),
                    timeout=10.0,
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
                workflows = data.get("workflows", [])
                return [
                    {
                        "id": str(w.get("id")),
                        "name": w.get("name"),
                        "path": w.get("path"),
                        "state": w.get("state"),
                        "html_url": w.get("html_url"),
                    }
                    for w in workflows
                ]
            except httpx.RequestError:
                return []

    @classmethod
    async def trigger_workflow(
        cls,
        token: str,
        owner: str,
        repo: str,
        workflow_id: str,
        ref: str = "main",
        inputs: Optional[Dict[str, Any]] = None,
    ) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                payload = {"ref": ref}
                if inputs:
                    payload["inputs"] = inputs

                resp = await client.post(
                    f"{cls.BASE_URL}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
                    headers=cls._get_headers(token),
                    json=payload,
                    timeout=10.0,
                )
                if resp.status_code in [204, 201, 200]:
                    return True
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub Actions dispatch failed: {resp.text}"
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Error triggering GitHub Actions workflow: {str(e)}"
                )

    @classmethod
    async def list_workflow_runs(
        cls, token: str, owner: str, repo: str, workflow_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                url = (
                    f"{cls.BASE_URL}/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
                    if workflow_id
                    else f"{cls.BASE_URL}/repos/{owner}/{repo}/actions/runs"
                )
                resp = await client.get(
                    url,
                    headers=cls._get_headers(token),
                    params={"per_page": 20},
                    timeout=12.0,
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
                runs = data.get("workflow_runs", [])
                return [
                    {
                        "id": str(r.get("id")),
                        "run_number": r.get("run_number"),
                        "name": r.get("name"),
                        "status": r.get("status"),
                        "conclusion": r.get("conclusion"),
                        "branch": r.get("head_branch"),
                        "commit_hash": r.get("head_sha", "")[:7],
                        "commit_message": r.get("head_commit", {}).get("message", ""),
                        "author": r.get("head_commit", {}).get("author", {}).get("name", "Unknown"),
                        "html_url": r.get("html_url"),
                        "created_at": r.get("created_at"),
                        "updated_at": r.get("updated_at"),
                    }
                    for r in runs
                ]
            except httpx.RequestError:
                return []

    @classmethod
    async def get_workflow_run_jobs(
        cls, token: str, owner: str, repo: str, run_id: str
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cls.BASE_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
                    headers=cls._get_headers(token),
                    timeout=12.0,
                )
                if resp.status_code != 200:
                    return []
                jobs = resp.json().get("jobs", [])
                formatted = []
                for j in jobs:
                    steps = [
                        {
                            "name": s.get("name"),
                            "status": s.get("status"),
                            "conclusion": s.get("conclusion"),
                            "number": s.get("number"),
                            "started_at": s.get("started_at"),
                            "completed_at": s.get("completed_at"),
                        }
                        for s in j.get("steps", [])
                    ]
                    formatted.append({
                        "id": str(j.get("id")),
                        "name": j.get("name"),
                        "status": j.get("status"),
                        "conclusion": j.get("conclusion"),
                        "started_at": j.get("started_at"),
                        "completed_at": j.get("completed_at"),
                        "steps": steps,
                    })
                return formatted
            except httpx.RequestError:
                return []

    @staticmethod
    def verify_webhook_signature(payload_bytes: bytes, signature_header: Optional[str], secret: str) -> bool:
        if not signature_header or not secret:
            return False
        
        prefix = "sha256="
        if not signature_header.startswith(prefix):
            return False

        expected_sig = signature_header[len(prefix):]
        computed_sig = hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(computed_sig, expected_sig)

