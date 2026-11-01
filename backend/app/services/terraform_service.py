import os
import re
import shutil
import subprocess
import time
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status

from app.schemas.terraform import TerraformActionResponse, TerraformPlanResponse, TerraformStateResource


class TerraformService:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "terraform_workspaces"))

    @classmethod
    def get_workspace_dir(cls, workspace_id: str) -> str:
        workspace_dir = os.path.join(cls.BASE_DIR, workspace_id)
        os.makedirs(workspace_dir, exist_ok=True)
        return workspace_dir

    @classmethod
    def sync_workspace_files(
        cls, workspace_id: str, main_tf: str, variables_tf: Optional[str] = None
    ) -> str:
        workspace_dir = cls.get_workspace_dir(workspace_id)
        with open(os.path.join(workspace_dir, "main.tf"), "w", encoding="utf-8") as f:
            f.write(main_tf)

        if variables_tf:
            with open(os.path.join(workspace_dir, "variables.tf"), "w", encoding="utf-8") as f:
                f.write(variables_tf)
        return workspace_dir

    @classmethod
    def delete_workspace_files(cls, workspace_id: str):
        workspace_dir = os.path.join(cls.BASE_DIR, workspace_id)
        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)

    @classmethod
    def _run_tf_command(
        cls, workspace_id: str, args: List[str], timeout: int = 120
    ) -> Tuple[int, str, int]:
        workspace_dir = cls.get_workspace_dir(workspace_id)
        cmd = ["terraform"] + args
        start_time = time.time()

        try:
            process = subprocess.run(
                cmd,
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            duration = int(time.time() - start_time)
            combined_output = process.stdout + ("\n" + process.stderr if process.stderr else "")
            return process.returncode, combined_output.strip(), duration
        except subprocess.TimeoutExpired:
            return -1, f"Command timed out after {timeout} seconds.", int(time.time() - start_time)
        except FileNotFoundError:
            return (
                -1,
                "Terraform binary is not installed or not found in system PATH.",
                int(time.time() - start_time),
            )
        except Exception as e:
            return -1, f"Unexpected error executing Terraform: {str(e)}", int(time.time() - start_time)

    @classmethod
    def init(cls, workspace_id: str) -> TerraformActionResponse:
        code, out, dur = cls._run_tf_command(workspace_id, ["init", "-no-color"])
        return TerraformActionResponse(
            workspace_id=workspace_id,
            action="init",
            status="success" if code == 0 else "failure",
            exit_code=code,
            output=out,
            duration_seconds=dur,
        )

    @classmethod
    def validate(cls, workspace_id: str) -> TerraformActionResponse:
        code, out, dur = cls._run_tf_command(workspace_id, ["validate", "-no-color"])
        return TerraformActionResponse(
            workspace_id=workspace_id,
            action="validate",
            status="success" if code == 0 else "failure",
            exit_code=code,
            output=out,
            duration_seconds=dur,
        )

    @classmethod
    def plan(cls, workspace_id: str) -> TerraformPlanResponse:
        code, out, dur = cls._run_tf_command(workspace_id, ["plan", "-no-color"])

        # Parse changes: Plan: X to add, Y to change, Z to destroy.
        to_add, to_change, to_destroy = 0, 0, 0
        match = re.search(r"Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy", out)
        if match:
            to_add = int(match.group(1))
            to_change = int(match.group(2))
            to_destroy = int(match.group(3))
        elif "No changes. Your infrastructure matches the configuration." in out or "No changes." in out:
            to_add, to_change, to_destroy = 0, 0, 0

        return TerraformPlanResponse(
            workspace_id=workspace_id,
            status="success" if code == 0 else "failure",
            exit_code=code,
            output=out,
            resources_to_add=to_add,
            resources_to_change=to_change,
            resources_to_destroy=to_destroy,
            requires_approval=True,
            is_approved=False,
        )

    @classmethod
    def apply(cls, workspace_id: str) -> TerraformActionResponse:
        code, out, dur = cls._run_tf_command(workspace_id, ["apply", "-auto-approve", "-no-color"])
        return TerraformActionResponse(
            workspace_id=workspace_id,
            action="apply",
            status="success" if code == 0 else "failure",
            exit_code=code,
            output=out,
            duration_seconds=dur,
        )

    @classmethod
    def destroy(cls, workspace_id: str) -> TerraformActionResponse:
        code, out, dur = cls._run_tf_command(workspace_id, ["destroy", "-auto-approve", "-no-color"])
        return TerraformActionResponse(
            workspace_id=workspace_id,
            action="destroy",
            status="success" if code == 0 else "failure",
            exit_code=code,
            output=out,
            duration_seconds=dur,
        )

    @classmethod
    def get_state_resources(cls, workspace_id: str) -> List[TerraformStateResource]:
        code, out, dur = cls._run_tf_command(workspace_id, ["state", "list", "-no-color"])
        if code != 0 or not out:
            return []

        resources = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            # e.g., local_file.sample_config or docker_container.web
            parts = line.split(".", 1)
            rtype = parts[0]
            rname = parts[1] if len(parts) > 1 else parts[0]
            resources.append(
                TerraformStateResource(
                    address=line,
                    resource_type=rtype,
                    name=rname,
                )
            )
        return resources

