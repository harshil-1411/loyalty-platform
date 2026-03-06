"""Key builders for single-table design. See docs/DYNAMODB_KEYS.md."""

PROGRAM_SK_PREFIX = "PROGRAM#"
REWARD_SK_PREFIX = "REWARD#"
TXN_SK_PREFIX = "TXN#"
BALANCE_SK_PREFIX = "BALANCE#"
MEMBER_SK_PREFIX = "MEMBER#"
IDEM_SK_PREFIX = "IDEM#"
API_KEY_PK_PREFIX = "API_KEY#"
API_KEY_SK = "API_KEY"
API_KEY_INDEX_SK_PREFIX = "API_KEY#"

# Global partitions (non-tenant data)
BILLING_EVENTS_PK = "BILLING_EVENTS"
AUDIT_LOG_PK      = "AUDIT_LOG"
METRICS_PK        = "METRICS"


def tenant(tenant_id: str) -> dict:
    return {"pk": f"TENANT#{tenant_id}", "sk": "TENANT"}


def program(tenant_id: str, program_id: str) -> dict:
    return {"pk": f"TENANT#{tenant_id}", "sk": f"{PROGRAM_SK_PREFIX}{program_id}"}


def program_pk(tenant_id: str) -> str:
    return f"TENANT#{tenant_id}"


def program_sk_prefix() -> str:
    return PROGRAM_SK_PREFIX


def program_scoped_pk(tenant_id: str, program_id: str) -> str:
    return f"TENANT#{tenant_id}#PROGRAM#{program_id}"


def balance_sk(member_id: str) -> str:
    return f"{BALANCE_SK_PREFIX}{member_id}"


def member_sk(member_id: str) -> str:
    return f"{MEMBER_SK_PREFIX}{member_id}"


def reward_sk(reward_id: str) -> str:
    return f"{REWARD_SK_PREFIX}{reward_id}"


def txn_sk(iso_ts: str, txn_id: str) -> str:
    return f"{TXN_SK_PREFIX}{iso_ts}#{txn_id}"


def billing_event_sk(iso_ts: str, event_id: str) -> str:
    return f"{iso_ts}#{event_id}"


def audit_log_sk(iso_ts: str, audit_id: str) -> str:
    return f"{iso_ts}#{audit_id}"


def mrr_snapshot_sk(yyyy_mm: str) -> str:
    return f"MRR_SNAPSHOT#{yyyy_mm}"


def gsi1_tenant(tenant_id: str) -> str:
    return f"TENANT#{tenant_id}"


def gsi1_txn_sk(program_id: str, iso_ts: str, txn_id: str) -> str:
    return f"{TXN_SK_PREFIX}{program_id}#{iso_ts}#{txn_id}"


def idem_sk(idempotency_key: str) -> str:
    return f"{IDEM_SK_PREFIX}{idempotency_key}"


def api_key_pk(key_hash: str) -> str:
    return f"{API_KEY_PK_PREFIX}{key_hash}"


def api_key_index_sk(key_hash: str) -> str:
    return f"{API_KEY_INDEX_SK_PREFIX}{key_hash}"


class key:
    # Prefix constants (mirrors module-level constants for convenience)
    PROGRAM_SK_PREFIX = PROGRAM_SK_PREFIX
    REWARD_SK_PREFIX = REWARD_SK_PREFIX
    TXN_SK_PREFIX = TXN_SK_PREFIX
    BALANCE_SK_PREFIX = BALANCE_SK_PREFIX
    MEMBER_SK_PREFIX = MEMBER_SK_PREFIX
    IDEM_SK_PREFIX = IDEM_SK_PREFIX
    API_KEY_PK_PREFIX = API_KEY_PK_PREFIX
    API_KEY_SK = API_KEY_SK
    API_KEY_INDEX_SK_PREFIX = API_KEY_INDEX_SK_PREFIX

    # Global partition keys
    BILLING_EVENTS_PK = BILLING_EVENTS_PK
    AUDIT_LOG_PK      = AUDIT_LOG_PK
    METRICS_PK        = METRICS_PK

    tenant          = staticmethod(tenant)
    program         = staticmethod(program)
    program_pk      = staticmethod(program_pk)
    program_sk_prefix = staticmethod(program_sk_prefix)
    program_scoped_pk = staticmethod(program_scoped_pk)
    balance_sk      = staticmethod(balance_sk)
    member_sk       = staticmethod(member_sk)
    reward_sk       = staticmethod(reward_sk)
    txn_sk          = staticmethod(txn_sk)
    idem_sk         = staticmethod(idem_sk)
    api_key_pk      = staticmethod(api_key_pk)
    api_key_index_sk = staticmethod(api_key_index_sk)
    billing_event_sk = staticmethod(billing_event_sk)
    audit_log_sk    = staticmethod(audit_log_sk)
    mrr_snapshot_sk = staticmethod(mrr_snapshot_sk)
    gsi1_tenant     = staticmethod(gsi1_tenant)
    gsi1_txn_sk     = staticmethod(gsi1_txn_sk)
