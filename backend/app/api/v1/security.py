import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, SecretItem, User, VulnerabilityScan
from app.schemas.security import (
    AuditLogItem,
    ScanResponse,
    ScanTriggerRequest,
    SecretCreate,
    SecretResponse,
    SecretRevealResponse,
    VulnerabilityItem,
)
from app.services.security_service import SecurityService

router = APIRouter()


# -------------------------------------------------------------
# Secrets Vault Management (Never raw plaintext in general view)
# -------------------------------------------------------------
@router.get("/secrets", response_model=List[SecretResponse])
def list_secrets(
    env: Optional[str] = Query(None, alias="environment"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(SecretItem)
    if env:
        query = query.filter(SecretItem.environment == env)

    secrets = query.order_by(SecretItem.created_at.desc()).all()
    # Mask values
    result = []
    for s in secrets:
        raw_val = SecurityService.decode_value(s.value)
        masked = SecurityService.mask_secret(raw_val)
        result.append(
            SecretResponse(
                id=s.id,
                name=s.name,
                key=s.key,
                masked_value=masked,
                environment=s.environment,
                description=s.description,
                provider=s.provider,
                created_by=s.created_by,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return result


@router.post("/secrets", response_model=SecretResponse, status_code=status.HTTP_201_CREATED)
def create_secret(
    payload: SecretCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check duplicate key in same environment
    existing = (
        db.query(SecretItem)
        .filter(SecretItem.key == payload.key, SecretItem.environment == payload.environment)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Secret key '{payload.key}' already exists in environment '{payload.environment}'.",
        )

    encoded = SecurityService.encode_value(payload.value)
    secret = SecretItem(
        name=payload.name,
        key=payload.key,
        value=encoded,
        environment=payload.environment,
        description=payload.description,
        provider=payload.provider,
        created_by=current_user.username,
    )
    db.add(secret)
    db.commit()
    db.refresh(secret)

    audit = AuditLog(
        user_id=current_user.id,
        action="SECRET_CREATED",
        resource_type="SecretItem",
        resource_id=secret.id,
        details=f"Secret key '{secret.key}' created for environment '{secret.environment}' via provider '{secret.provider}'.",
    )
    db.add(audit)
    db.commit()

    masked = SecurityService.mask_secret(payload.value)
    return SecretResponse(
        id=secret.id,
        name=secret.name,
        key=secret.key,
        masked_value=masked,
        environment=secret.environment,
        description=secret.description,
        provider=secret.provider,
        created_by=secret.created_by,
        created_at=secret.created_at,
        updated_at=secret.updated_at,
    )


@router.post("/secrets/{id}/reveal", response_model=SecretRevealResponse)
def reveal_secret(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    secret = db.query(SecretItem).filter(SecretItem.id == id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found.")

    plaintext = SecurityService.decode_value(secret.value)

    # Auditing secret access is mandatory for security compliance
    audit = AuditLog(
        user_id=current_user.id,
        action="SECRET_REVEALED",
        resource_type="SecretItem",
        resource_id=secret.id,
        details=f"Plaintext secret '{secret.key}' was revealed by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return SecretRevealResponse(
        id=secret.id,
        key=secret.key,
        plaintext_value=plaintext,
        revealed_by=current_user.username,
        revealed_at=datetime.now(timezone.utc),
    )


@router.delete("/secrets/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_secret(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    secret = db.query(SecretItem).filter(SecretItem.id == id).first()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found.")

    db.delete(secret)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="SECRET_DELETED",
        resource_type="SecretItem",
        resource_id=id,
        details=f"Secret key '{secret.key}' deleted by {current_user.username}.",
    )
    db.add(audit)
    db.commit()
    return None


# -------------------------------------------------------------
# Vulnerability Scanning (Trivy Engine)
# -------------------------------------------------------------
@router.get("/scans", response_model=List[ScanResponse])
def list_vulnerability_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scans = db.query(VulnerabilityScan).order_by(VulnerabilityScan.scanned_at.desc()).all()
    results = []
    for s in scans:
        findings_list = []
        if s.findings_json:
            try:
                raw_findings = json.loads(s.findings_json)
                findings_list = [VulnerabilityItem(**f) for f in raw_findings]
            except Exception:
                pass
        results.append(
            ScanResponse(
                id=s.id,
                image_name=s.image_name,
                status=s.status,
                critical_count=s.critical_count,
                high_count=s.high_count,
                medium_count=s.medium_count,
                low_count=s.low_count,
                findings=findings_list,
                scanned_at=s.scanned_at,
            )
        )
    return results


@router.post("/scans", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def trigger_vulnerability_scan(
    payload: ScanTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    status_str, findings, counts = SecurityService.scan_image_with_trivy(payload.image_name)

    findings_dicts = [f.model_dump() for f in findings]
    scan = VulnerabilityScan(
        image_name=payload.image_name,
        status=status_str,
        critical_count=counts.get("critical", 0),
        high_count=counts.get("high", 0),
        medium_count=counts.get("medium", 0),
        low_count=counts.get("low", 0),
        findings_json=json.dumps(findings_dicts),
        scanned_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    audit = AuditLog(
        user_id=current_user.id,
        action="VULNERABILITY_SCAN_EXECUTED",
        resource_type="VulnerabilityScan",
        resource_id=scan.id,
        details=f"Trivy scan executed for image '{payload.image_name}'. Detected {scan.critical_count} CRITICAL, {scan.high_count} HIGH.",
    )
    db.add(audit)
    db.commit()

    return ScanResponse(
        id=scan.id,
        image_name=scan.image_name,
        status=scan.status,
        critical_count=scan.critical_count,
        high_count=scan.high_count,
        medium_count=scan.medium_count,
        low_count=scan.low_count,
        findings=findings,
        scanned_at=scan.scanned_at,
    )


# -------------------------------------------------------------
# Audit Logs Explorer
# -------------------------------------------------------------
@router.get("/audit-logs", response_model=List[AuditLogItem])
def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append(
            AuditLogItem(
                id=l.id,
                user_id=l.user_id,
                username=l.user.username if l.user else "system",
                action=l.action,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                details=l.details,
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
        )
    return results

