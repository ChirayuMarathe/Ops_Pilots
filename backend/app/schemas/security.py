from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SecretCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    key: str = Field(..., min_length=2, max_length=100)
    value: str = Field(..., min_length=1)
    environment: str = Field("production", pattern="^(production|staging|development)$")
    description: Optional[str] = None
    provider: str = Field("local", pattern="^(local|aws_secrets_manager)$")


class SecretResponse(BaseModel):
    id: str
    name: str
    key: str
    masked_value: str
    environment: str
    description: Optional[str] = None
    provider: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecretRevealResponse(BaseModel):
    id: str
    key: str
    plaintext_value: str
    revealed_by: str
    revealed_at: datetime


class VulnerabilityItem(BaseModel):
    vulnerability_id: str  # e.g., CVE-2024-21626
    pkg_name: str
    installed_version: str
    fixed_version: Optional[str] = None
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    title: Optional[str] = None
    description: Optional[str] = None


class ScanTriggerRequest(BaseModel):
    image_name: str = Field(..., min_length=3, max_length=255)


class ScanResponse(BaseModel):
    id: str
    image_name: str
    status: str
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    findings: List[VulnerabilityItem] = []
    scanned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
