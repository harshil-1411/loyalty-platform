"""Programs CRUD API."""

from fastapi import APIRouter, Depends

from app.deps import get_tenant_id
from app.models.programs import ProgramCreate, ProgramUpdate, ProgramResponse, ProgramListResponse
from app.services import programs as svc
from app.exceptions import NotFoundError

router = APIRouter(prefix="/programs", tags=["Programs"])


@router.get("", response_model=ProgramListResponse)
def list_programs(tenant_id: str = Depends(get_tenant_id)):
    items = svc.list_programs(tenant_id)
    return ProgramListResponse(programs=[ProgramResponse(**x) for x in items])


@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(program_id: str, tenant_id: str = Depends(get_tenant_id)):
    item = svc.get_program(tenant_id, program_id)
    if not item:
        raise NotFoundError("Program not found")
    return ProgramResponse(**item)


@router.post("", response_model=dict, status_code=201)
def create_program(body: ProgramCreate, tenant_id: str = Depends(get_tenant_id)):
    return svc.create_program(tenant_id, body.name or "My Program", body.currency or "INR")


@router.put("/{program_id}", response_model=dict)
def update_program(program_id: str, body: ProgramUpdate, tenant_id: str = Depends(get_tenant_id)):
    return svc.update_program(
        tenant_id,
        program_id,
        name=body.name,
        currency=body.currency,
        earn_rules=body.earnRules,
        burn_rules=body.burnRules,
        tier_config=body.tierConfig,
    )
