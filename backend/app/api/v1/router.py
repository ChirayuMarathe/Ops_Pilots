from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.health import router as health_router
from app.api.v1.github import router as github_router
from app.api.v1.pipelines import router as pipelines_router
from app.api.v1.docker import router as docker_router
from app.api.v1.kubernetes import router as kubernetes_router
from app.api.v1.monitoring import router as monitoring_router
from app.api.v1.logs import router as logs_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(github_router, prefix="/github", tags=["GitHub"])
api_router.include_router(pipelines_router, prefix="/pipelines", tags=["Pipelines"])
api_router.include_router(docker_router, prefix="/docker", tags=["Docker"])
api_router.include_router(kubernetes_router, prefix="/kubernetes", tags=["Kubernetes"])
api_router.include_router(monitoring_router, prefix="/monitoring", tags=["Monitoring"])
api_router.include_router(logs_router, prefix="/logs", tags=["Logs"])

