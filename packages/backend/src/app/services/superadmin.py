"""Super-admin service: platform metrics, tenant listing, Cognito users."""

import json
import os
import re
import uuid
import time as _time
from collections import defaultdict
from datetime import datetime

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
    AuditLogEntryResponse,
    AuditLogResponse,
    CreateTenantRequest,
    CreateTenantResponse,
    PlatformUserResponse,
    UserListResponse,
    TimeSeriesPoint,
    TimeSeriesResponse,
)


def _table():
    return get_table()


def _tenant_id_from_pk(pk: str) -> str:
    if pk.startswith("TENANT#"):
        return pk[7:]
    return pk


def _item_to_tenant(item: dict, program_count: int = 0, member_count: int | None = None) -> TenantResponse:
    pk = item.get("pk", "")
    tid = _tenant_id_from_pk(pk)
    plan_id = (item.get("planId") or "").lower()
    plan = plan_id if plan_id in ("starter", "growth", "scale") else None
    # Use live-counted value if provided; fall back to stored denormalized field
    mc = member_count if member_count is not None else int(item.get("memberCount", 0))
    return TenantResponse(
        id=tid,
        name=item.get("name", tid),
        slug=item.get("slug", tid),
        plan=plan,
        billingStatus=item.get("billingStatus", "none"),
        memberCount=mc,
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

    mrr_growth_pct, churn_pct = _read_mrr_growth_and_churn(table, mrr)

    return PlatformMetricsResponse(
        totalTenants=total_tenants,
        activeSubscriptions=active,
        trialSubscriptions=trial,
        totalMembers=total_members,
        totalTransactions=total_transactions,
        mrr=mrr,
        arr=mrr * 12,
        mrrGrowthPct=mrr_growth_pct,
        churnPct=churn_pct,
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
    member_counts = _member_counts_for_tenants(table, tenant_ids)

    out: list[TenantResponse] = []
    for item in items:
        tid = _tenant_id_from_pk(item.get("pk", ""))
        if search and search.lower() not in (item.get("name", "") or "").lower() and search.lower() not in (tid or "").lower():
            continue
        out.append(_item_to_tenant(item, program_counts.get(tid, 0), member_counts.get(tid)))
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


def _member_counts_for_tenants(table, tenant_ids: list[str]) -> dict[str, int]:
    """Count BALANCE# items across all programs for each tenant (live from DynamoDB)."""
    counts: dict[str, int] = {}
    for tid in tenant_ids:
        prog_pk = key.program_pk(tid)
        prog_resp = table.query(
            KeyConditionExpression=Key("pk").eq(prog_pk) & Key("sk").begins_with(key.program_sk_prefix()),
            ProjectionExpression="sk",
        )
        total = 0
        for prog in prog_resp.get("Items", []):
            prog_id = prog["sk"].replace(key.program_sk_prefix(), "")
            scoped_pk = key.program_scoped_pk(tid, prog_id)
            bal_resp = table.query(
                KeyConditionExpression=Key("pk").eq(scoped_pk) & Key("sk").begins_with(key.BALANCE_SK_PREFIX),
                Select="COUNT",
            )
            total += bal_resp.get("Count", 0)
        counts[tid] = total
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
        prog_id = p["sk"].replace(key.program_sk_prefix(), "")
        scoped_pk = key.program_scoped_pk(tenant_id, prog_id)
        bal_resp = table.query(
            KeyConditionExpression=Key("pk").eq(scoped_pk) & Key("sk").begins_with(key.BALANCE_SK_PREFIX),
            Select="COUNT",
        )
        prog_member_count = bal_resp.get("Count", 0)
        programs.append(
            ProgramResponse(
                id=prog_id,
                tenantId=tenant_id,
                name=p.get("name", ""),
                currency=p.get("currency", "INR"),
                memberCount=prog_member_count,
                createdAt=p.get("createdAt", ""),
            )
        )
    member_counts = _member_counts_for_tenants(table, [tenant_id])
    tenant = _item_to_tenant(item, program_count, member_counts.get(tenant_id))
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
    """Recent subscription events from DynamoDB billing event log (newest-first)."""
    table = _table()
    resp = table.query(
        KeyConditionExpression=Key("pk").eq(key.BILLING_EVENTS_PK),
        ScanIndexForward=False,
        Limit=limit,
    )
    events: list[SubscriptionEventResponse] = []
    for item in resp.get("Items", []):
        sk = item.get("sk", "")
        event_id = sk.split("#")[-1] if "#" in sk else sk
        events.append(
            SubscriptionEventResponse(
                id=event_id,
                tenantId=item.get("tenantId", ""),
                tenantName=item.get("tenantName", ""),
                event=item.get("event", ""),
                plan=item.get("plan", ""),
                amount=int(item.get("amount", 0)),
                date=item.get("createdAt", ""),
            )
        )
    return SubscriptionEventsResponse(events=events)


def _last_12_months() -> list[tuple[str, str]]:
    """Return list of (YYYY-MM, Mon) for the last 12 months, oldest first."""
    now = datetime.utcnow()
    months = []
    for i in range(11, -1, -1):
        total_months = now.month - 1 - i
        year = now.year + total_months // 12
        month = total_months % 12 + 1
        months.append((f"{year}-{month:02d}", datetime(year, month, 1).strftime("%b")))
    return months


def _scan_all_tenants() -> list[dict]:
    table = _table()
    items: list[dict] = []
    scan_kw = {"FilterExpression": Attr("sk").eq("TENANT")}
    while True:
        resp = table.scan(**scan_kw)
        items.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        scan_kw["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
    return items


def get_tenant_growth_series() -> TimeSeriesResponse:
    """Monthly new-tenant counts for the last 12 months."""
    items = _scan_all_tenants()
    counts: dict[str, int] = defaultdict(int)
    for item in items:
        created = item.get("createdAt", "")
        if created and len(created) >= 7:
            counts[created[:7]] += 1
    points = [
        TimeSeriesPoint(month=label, value=counts.get(ym, 0))
        for ym, label in _last_12_months()
    ]
    return TimeSeriesResponse(points=points)


def get_revenue_trend_series() -> TimeSeriesResponse:
    """Cumulative MRR for the last 12 months based on active tenants' join date.

    Approximation: uses current billingStatus as a proxy for historical state.
    Each month's value = sum of MRR of tenants that joined by that month and are
    currently active/trialing.
    """
    items = _scan_all_tenants()
    active = [i for i in items if i.get("billingStatus") in ("active", "trialing")]
    points = []
    for ym, label in _last_12_months():
        mrr = 0
        for t in active:
            created = t.get("createdAt", "")
            if created and created[:7] <= ym:
                plan_id = (t.get("planId") or "").lower()
                t_mrr = t.get("mrr") if isinstance(t.get("mrr"), (int, float)) else _DEFAULT_MRR.get(plan_id, 0)
                mrr += t_mrr
        points.append(TimeSeriesPoint(month=label, value=mrr))
    return TimeSeriesResponse(points=points)


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

        def _to_iso(dt) -> str:
            """Convert boto3 datetime (timezone-aware) to clean UTC ISO string."""
            if not hasattr(dt, "utctimetuple"):
                return ""
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        created = u.get("UserCreateDate")
        created_str = _to_iso(created) if created else ""
        last_modified = u.get("UserLastModifiedDate")
        last_sign_in = _to_iso(last_modified) if last_modified else None

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


# ── MRR snapshot helpers ────────────────────────────────────────────────────


def _current_ym() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _prev_ym() -> str:
    now = datetime.utcnow()
    if now.month == 1:
        return f"{now.year - 1}-12"
    return f"{now.year}-{now.month - 1:02d}"


def update_mrr_snapshot() -> None:
    """Recompute current-month MRR from live tenant records and store/update the snapshot."""
    tenants = _scan_all_tenants()
    mrr = 0
    cancelled_this_month = 0
    ym = _current_ym()
    for t in tenants:
        plan_id = (t.get("planId") or "").lower()
        if t.get("billingStatus") in ("active", "trialing"):
            mrr += t.get("mrr") if isinstance(t.get("mrr"), (int, float)) else _DEFAULT_MRR.get(plan_id, 0)
        updated = t.get("updatedAt", "")
        if t.get("billingStatus") == "cancelled" and updated and updated[:7] == ym:
            cancelled_this_month += 1
    table = _table()
    table.put_item(Item={
        "pk": key.METRICS_PK,
        "sk": key.mrr_snapshot_sk(ym),
        "mrr": mrr,
        "cancelledThisMonth": cancelled_this_month,
        "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    })


def _read_mrr_growth_and_churn(table, current_mrr: int) -> tuple[float, float]:
    """Read last 2 MRR snapshots and compute growth % and churn %."""
    try:
        prev_sk = key.mrr_snapshot_sk(_prev_ym())
        res = table.get_item(Key={"pk": key.METRICS_PK, "sk": prev_sk})
        prev = res.get("Item")
        if not prev:
            return 0.0, 0.0
        prev_mrr = int(prev.get("mrr", 0))
        cancelled = int(prev.get("cancelledThisMonth", 0))
        mrr_growth = round(((current_mrr - prev_mrr) / prev_mrr * 100), 1) if prev_mrr else 0.0
        churn = round((cancelled / max(prev_mrr // max(_DEFAULT_MRR.get("starter", 999), 1), 1)) * 100, 1)
        return mrr_growth, churn
    except Exception:
        return 0.0, 0.0


# ── Audit log ────────────────────────────────────────────────────────────────


def write_audit_log(action: str, actor: str, target_id: str, target_name: str, details: dict) -> None:
    """Write an immutable audit log entry to DynamoDB."""
    try:
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        audit_id = uuid.uuid4().hex[:12]
        _table().put_item(Item={
            "pk":         key.AUDIT_LOG_PK,
            "sk":         key.audit_log_sk(now, audit_id),
            "action":     action,
            "actor":      actor or "system",
            "targetId":   target_id,
            "targetName": target_name,
            "details":    json.dumps(details),
            "createdAt":  now,
        })
    except Exception:
        pass  # Never let audit logging break the main action


def get_audit_log(tenant_id: str | None = None, limit: int = 50) -> AuditLogResponse:
    """Return recent audit log entries, optionally filtered by tenantId."""
    table = _table()
    resp = table.query(
        KeyConditionExpression=Key("pk").eq(key.AUDIT_LOG_PK),
        ScanIndexForward=False,
        Limit=min(limit * 4, 200),  # over-fetch since we may filter
    )
    entries: list[AuditLogEntryResponse] = []
    for item in resp.get("Items", []):
        if tenant_id and item.get("targetId") != tenant_id:
            continue
        sk = item.get("sk", "")
        entry_id = sk.split("#")[-1] if "#" in sk else sk
        entries.append(AuditLogEntryResponse(
            id=entry_id,
            action=item.get("action", ""),
            actor=item.get("actor", ""),
            targetId=item.get("targetId", ""),
            targetName=item.get("targetName", ""),
            details=item.get("details", "{}"),
            createdAt=item.get("createdAt", ""),
        ))
        if len(entries) >= limit:
            break
    return AuditLogResponse(entries=entries)


# ── Create tenant ────────────────────────────────────────────────────────────


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")[:48]


def create_tenant(
    name: str,
    slug: str,
    contact_email: str,
    plan_id: str | None,
    admin_email: str | None,
    admin_username: str | None,
    actor: str = "",
) -> CreateTenantResponse:
    """Provision a new tenant record and optionally a Cognito admin user."""
    table = _table()
    tenant_id = slug or _slugify(name)
    pk = f"TENANT#{tenant_id}"
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Fail fast if tenant already exists
    existing = table.get_item(Key={"pk": pk, "sk": "TENANT"}).get("Item")
    if existing:
        from app.exceptions import ConflictError
        raise ConflictError(f"Tenant '{tenant_id}' already exists")

    table.put_item(Item={
        "pk":           pk,
        "sk":           "TENANT",
        "name":         name,
        "slug":         tenant_id,
        "contactEmail": contact_email,
        "planId":       plan_id or "",
        "billingStatus": "trialing",
        "memberCount":  0,
        "programCount": 0,
        "transactionCount": 0,
        "mrr":          0,
        "createdAt":    now,
    })

    admin_created = False
    if admin_email:
        try:
            pool_id = settings.cognito_user_pool_id or os.environ.get("USER_POOL_ID") or ""
            cognito = boto3.client("cognito-idp")
            username = admin_username or _slugify(name) + ".admin"
            cognito.admin_create_user(
                UserPoolId=pool_id,
                Username=username,
                UserAttributes=[
                    {"Name": "email", "Value": admin_email},
                    {"Name": "email_verified", "Value": "true"},
                    {"Name": "custom:tenant_id", "Value": tenant_id},
                ],
                MessageAction="SUPPRESS",
            )
            temp_pw = f"TempPass@{uuid.uuid4().hex[:6]}"
            cognito.admin_set_user_password(
                UserPoolId=pool_id,
                Username=username,
                Password=temp_pw,
                Permanent=False,
            )
            admin_created = True
        except Exception:
            pass  # Tenant was created; Cognito user failure is non-fatal

    write_audit_log("tenant_created", actor, tenant_id, name, {
        "planId": plan_id, "adminEmail": admin_email, "adminCreated": admin_created
    })
    update_mrr_snapshot()
    return CreateTenantResponse(tenantId=tenant_id, name=name, adminCreated=admin_created)


# ── User write actions ──────────────────────────────────────────────────────


def _cognito_client():
    return boto3.client("cognito-idp")


def _pool_id() -> str:
    return settings.cognito_user_pool_id or os.environ.get("USER_POOL_ID") or ""


def disable_user(username: str, actor: str = "") -> None:
    cognito = _cognito_client()
    cognito.admin_disable_user(UserPoolId=_pool_id(), Username=username)
    write_audit_log("user_disabled", actor, username, username, {})


def enable_user(username: str, actor: str = "") -> None:
    cognito = _cognito_client()
    cognito.admin_enable_user(UserPoolId=_pool_id(), Username=username)
    write_audit_log("user_enabled", actor, username, username, {})


def reset_user_password(username: str, actor: str = "") -> None:
    """Trigger Cognito to send a password-reset email to the user."""
    cognito = _cognito_client()
    cognito.admin_reset_user_password(UserPoolId=_pool_id(), Username=username)
    write_audit_log("password_reset", actor, username, username, {})


# ── Tenant write actions ────────────────────────────────────────────────────


def _get_tenant_name_for_log(tenant_id: str) -> str:
    try:
        pk, sk = key.tenant(tenant_id)["pk"], key.tenant(tenant_id)["sk"]
        res = _table().get_item(Key={"pk": pk, "sk": sk}, ProjectionExpression="#n",
                                ExpressionAttributeNames={"#n": "name"})
        return (res.get("Item") or {}).get("name", tenant_id)
    except Exception:
        return tenant_id


def patch_tenant_plan(tenant_id: str, plan: str | None, actor: str = "") -> None:
    """Update a tenant's plan ID in DynamoDB."""
    table = _table()
    keys = key.tenant(tenant_id)
    table.update_item(
        Key={"pk": keys["pk"], "sk": keys["sk"]},
        UpdateExpression="SET planId = :p",
        ExpressionAttributeValues={":p": plan or ""},
    )
    tenant_name = _get_tenant_name_for_log(tenant_id)
    write_audit_log("plan_changed", actor, tenant_id, tenant_name, {"plan": plan})
    update_mrr_snapshot()


def patch_tenant_status(tenant_id: str, status: str, actor: str = "") -> None:
    """Update a tenant's billingStatus in DynamoDB."""
    table = _table()
    keys = key.tenant(tenant_id)
    table.update_item(
        Key={"pk": keys["pk"], "sk": keys["sk"]},
        UpdateExpression="SET billingStatus = :s",
        ExpressionAttributeValues={":s": status},
    )
    tenant_name = _get_tenant_name_for_log(tenant_id)
    write_audit_log("status_changed", actor, tenant_id, tenant_name, {"status": status})
    update_mrr_snapshot()
