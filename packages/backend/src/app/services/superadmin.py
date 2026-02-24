"""Super-admin service: platform metrics, tenant listing, Cognito users."""

import os

import boto3
from boto3.dynamodb.conditions import Attr, Key

from app.config import settings
from app.db import get_table, key
from app.models.superadmin import (
    PlatformMetricsResponse,
    TenantResponse,
    TenantListResponse,
    TenantDetailResponse,
    ProgramResponse,
    PlanDistributionResponse,
    PlanDistributionListResponse,
    SubscriptionEventResponse,
    SubscriptionEventsResponse,
    PlatformUserResponse,
    UserListResponse,
)


def _table():
    return get_table()


def _tenant_id_from_pk(pk: str) -> str:
    if pk.startswith("TENANT#"):
        return pk[7:]
    return pk


def _item_to_tenant(item: dict, program_count: int = 0) -> TenantResponse:
    pk = item.get("pk", "")
    tid = _tenant_id_from_pk(pk)
    plan_id = (item.get("planId") or "").lower()
    plan = plan_id if plan_id in ("starter", "growth", "scale") else None
    return TenantResponse(
        id=tid,
        name=item.get("name", tid),
        slug=item.get("slug", tid),
        plan=plan,
        billingStatus=item.get("billingStatus", "none"),
        memberCount=int(item.get("memberCount", 0)),
        programCount=program_count,
        transactionCount=int(item.get("transactionCount", 0)),
        mrr=int(item.get("mrr", 0)),
        createdAt=item.get("createdAt", ""),
        contactEmail=item.get("contactEmail", ""),
    )


# Plan-based default MRR for metrics when not stored per tenant (INR)
_DEFAULT_MRR = {"starter": 999, "growth": 3999, "scale": 9999}


def get_platform_metrics() -> PlatformMetricsResponse:
    """Aggregate platform metrics from DynamoDB scan (sk = TENANT)."""
    table = _table()
    tenants: list[dict] = []
    scan_kw = {"FilterExpression": Attr("sk").eq("TENANT")}
    while True:
        resp = table.scan(**scan_kw)
        tenants.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        scan_kw["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    total_tenants = len(tenants)
    active = sum(1 for t in tenants if t.get("billingStatus") == "active")
    trial = sum(1 for t in tenants if t.get("billingStatus") == "trialing")
    past_due = sum(1 for t in tenants if t.get("billingStatus") == "past_due")
    mrr = 0
    total_members = 0
    total_transactions = 0
    for t in tenants:
        plan_id = (t.get("planId") or "").lower()
        mrr += t.get("mrr") if isinstance(t.get("mrr"), (int, float)) else _DEFAULT_MRR.get(plan_id, 0)
        total_members += int(t.get("memberCount", 0))
        total_transactions += int(t.get("transactionCount", 0))

    return PlatformMetricsResponse(
        totalTenants=total_tenants,
        activeSubscriptions=active,
        trialSubscriptions=trial,
        totalMembers=total_members,
        totalTransactions=total_transactions,
        mrr=mrr,
        arr=mrr * 12,
        mrrGrowthPct=0.0,  # Requires historical MRR snapshots
        churnPct=0.0,  # Requires churn event tracking
        pastDueCount=past_due,
    )


def list_tenants(
    search: str | None = None,
    plan: str | None = None,
    status: str | None = None,
) -> TenantListResponse:
    """List all tenants with optional filters. Uses scan + filter."""
    table = _table()
    cond = Attr("sk").eq("TENANT")
    if plan:
        if plan == "none":
            cond = cond & (Attr("planId").not_exists() | Attr("planId").eq(""))
        else:
            cond = cond & Attr("planId").eq(plan)
    if status:
        cond = cond & Attr("billingStatus").eq(status)
    scan_kw = {"FilterExpression": cond}
    items: list[dict] = []
    while True:
        resp = table.scan(**scan_kw)
        items.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        scan_kw["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    tenant_ids = [_tenant_id_from_pk(i.get("pk", "")) for i in items]
    program_counts = _program_counts_for_tenants(table, tenant_ids)

    out: list[TenantResponse] = []
    for item in items:
        tid = _tenant_id_from_pk(item.get("pk", ""))
        if search and search.lower() not in (item.get("name", "") or "").lower() and search.lower() not in (tid or "").lower():
            continue
        out.append(_item_to_tenant(item, program_counts.get(tid, 0)))
    return TenantListResponse(tenants=out)


def _program_counts_for_tenants(table, tenant_ids: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for tid in tenant_ids:
        pk = key.program_pk(tid)
        resp = table.query(
            KeyConditionExpression=Key("pk").eq(pk) & Key("sk").begins_with(key.program_sk_prefix()),
            Select="COUNT",
        )
        counts[tid] = resp.get("Count", 0)
    return counts


def get_tenant_detail(tenant_id: str) -> TenantDetailResponse | None:
    """Single tenant detail with programs."""
    table = _table()
    pk, sk = key.tenant(tenant_id)["pk"], key.tenant(tenant_id)["sk"]
    res = table.get_item(Key={"pk": pk, "sk": sk})
    item = res.get("Item")
    if not item:
        return None
    program_count = 0
    programs: list[ProgramResponse] = []
    prog_resp = table.query(
        KeyConditionExpression=Key("pk").eq(pk) & Key("sk").begins_with(key.program_sk_prefix()),
    )
    for p in prog_resp.get("Items", []):
        program_count += 1
        programs.append(
            ProgramResponse(
                id=p["sk"].replace(key.program_sk_prefix(), ""),
                tenantId=tenant_id,
                name=p.get("name", ""),
                currency=p.get("currency", "INR"),
                memberCount=0,
                createdAt=p.get("createdAt", ""),
            )
        )
    tenant = _item_to_tenant(item, program_count)
    return TenantDetailResponse(tenant=tenant, programs=programs)


def get_tenant_programs(tenant_id: str) -> list[ProgramResponse]:
    """Programs for a specific tenant."""
    detail = get_tenant_detail(tenant_id)
    return detail.programs if detail else []


def list_plans() -> PlanDistributionListResponse:
    """Plan distribution (tenant counts per plan)."""
    table = _table()
    items: list[dict] = []
    scan_kw = {"FilterExpression": Attr("sk").eq("TENANT")}
    while True:
        resp = table.scan(**scan_kw)
        items.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        scan_kw["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    counts: dict[str, int] = {}
    for item in items:
        plan_id = (item.get("planId") or "none").lower()
        counts[plan_id] = counts.get(plan_id, 0) + 1
    plans = [PlanDistributionResponse(plan=k, count=v) for k, v in sorted(counts.items())]
    return PlanDistributionListResponse(plans=plans)


def get_subscription_events(limit: int = 50) -> SubscriptionEventsResponse:
    """Recent subscription events. Stub: no webhook log table yet."""
    return SubscriptionEventsResponse(events=[])


def _get_super_admin_usernames(cognito_client, pool_id: str) -> set[str]:
    """Return the set of usernames that belong to the super_admin Cognito group."""
    names: set[str] = set()
    token = None
    while True:
        kw: dict = {"UserPoolId": pool_id, "GroupName": "super_admin", "Limit": 60}
        if token:
            kw["NextToken"] = token
        try:
            resp = cognito_client.list_users_in_group(**kw)
        except cognito_client.exceptions.ResourceNotFoundException:
            break
        for u in resp.get("Users", []):
            names.add(u.get("Username", ""))
        token = resp.get("NextToken")
        if not token:
            break
    return names


def _get_tenant_names(tenant_ids: set[str]) -> dict[str, str]:
    """Batch-fetch tenant names from DynamoDB for the given tenant IDs."""
    if not tenant_ids:
        return {}
    table = _table()
    names: dict[str, str] = {}
    for tid in tenant_ids:
        if not tid:
            continue
        pk, sk = key.tenant(tid)["pk"], key.tenant(tid)["sk"]
        res = table.get_item(Key={"pk": pk, "sk": sk}, ProjectionExpression="#n", ExpressionAttributeNames={"#n": "name"})
        item = res.get("Item")
        if item:
            names[tid] = item.get("name", tid)
    return names


def list_users(
    search: str | None = None,
    tenant_id: str | None = None,
    role: str | None = None,
) -> UserListResponse:
    """List Cognito users (paginated) with accurate roles and tenant names."""
    pool_id = settings.cognito_user_pool_id or os.environ.get("USER_POOL_ID") or ""
    if not pool_id:
        return UserListResponse(users=[])

    cognito = boto3.client("cognito-idp")

    # If filtering by super_admin role, use the group membership endpoint
    if role == "super_admin":
        super_admin_names = _get_super_admin_usernames(cognito, pool_id)
        # Fetch details for only those users
        raw_users: list[dict] = []
        for username in super_admin_names:
            try:
                u = cognito.admin_get_user(UserPoolId=pool_id, Username=username)
                raw_users.append({
                    "Username": u.get("Username"),
                    "Attributes": u.get("UserAttributes", []),
                    "UserStatus": u.get("UserStatus"),
                    "UserCreateDate": u.get("UserCreateDate"),
                    "UserLastModifiedDate": u.get("UserLastModifiedDate"),
                    "_role": "super_admin",
                })
            except Exception:
                pass
    else:
        # Fetch all users and determine roles via super_admin group membership
        super_admin_names = _get_super_admin_usernames(cognito, pool_id)
        raw_users = []
        pagination_token = None
        while True:
            kw: dict = {"UserPoolId": pool_id, "Limit": 60}
            if pagination_token:
                kw["PaginationToken"] = pagination_token
            resp = cognito.list_users(**kw)
            for u in resp.get("Users", []):
                uname = u.get("Username", "")
                derived_role = "super_admin" if uname in super_admin_names else "tenant_admin"
                # Skip if role filter is tenant_admin and user is super_admin
                if role == "tenant_admin" and derived_role == "super_admin":
                    continue
                raw_users.append({**u, "_role": derived_role})
            pagination_token = resp.get("PaginationToken")
            if not pagination_token:
                break

    # Collect unique tenant IDs for name lookup
    tenant_ids_needed: set[str] = set()
    for u in raw_users:
        attrs = {a["Name"]: a["Value"] for a in u.get("Attributes", []) or u.get("UserAttributes", [])}
        t = attrs.get("custom:tenant_id", "")
        if t and (not tenant_id or t == tenant_id):
            tenant_ids_needed.add(t)
    tenant_name_map = _get_tenant_names(tenant_ids_needed)

    users: list[PlatformUserResponse] = []
    for u in raw_users:
        attr_list = u.get("Attributes") or u.get("UserAttributes") or []
        attrs = {a["Name"]: a["Value"] for a in attr_list}
        sub = attrs.get("sub", u.get("Username", ""))
        email = attrs.get("email", "")
        custom_tenant = attrs.get("custom:tenant_id", "")

        if tenant_id and custom_tenant != tenant_id:
            continue
        username = u.get("Username", sub)
        if search and search.lower() not in (email or "").lower() and search.lower() not in (username or "").lower():
            continue

        status_raw = (u.get("UserStatus") or "UNKNOWN").lower()
        status_map = {
            "confirmed": "confirmed",
            "unconfirmed": "unconfirmed",
            "force_change_password": "force_change_password",
        }
        status = status_map.get(status_raw, "disabled" if status_raw == "disabled" else status_raw)

        created = u.get("UserCreateDate")
        created_str = created.isoformat() + "Z" if hasattr(created, "isoformat") else ""
        last_modified = u.get("UserLastModifiedDate")
        last_sign_in = last_modified.isoformat() + "Z" if hasattr(last_modified, "isoformat") else None

        users.append(
            PlatformUserResponse(
                id=sub,
                username=username,
                email=email,
                tenantId=custom_tenant,
                tenantName=tenant_name_map.get(custom_tenant, ""),
                role=u.get("_role", "tenant_admin"),
                status=status,
                lastSignIn=last_sign_in,
                createdAt=created_str,
            )
        )
    return UserListResponse(users=users)
