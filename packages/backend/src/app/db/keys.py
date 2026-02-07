"""Key builders for single-table design. See docs/DYNAMODB_KEYS.md."""

PROGRAM_SK_PREFIX = "PROGRAM#"
REWARD_SK_PREFIX = "REWARD#"
TXN_SK_PREFIX = "TXN#"
BALANCE_SK_PREFIX = "BALANCE#"
MEMBER_SK_PREFIX = "MEMBER#"


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


def gsi1_tenant(tenant_id: str) -> str:
    return f"TENANT#{tenant_id}"


def gsi1_txn_sk(program_id: str, iso_ts: str, txn_id: str) -> str:
    return f"{TXN_SK_PREFIX}{program_id}#{iso_ts}#{txn_id}"


class key:
    tenant = staticmethod(tenant)
    program = staticmethod(program)
    program_pk = staticmethod(program_pk)
    program_sk_prefix = staticmethod(program_sk_prefix)
    program_scoped_pk = staticmethod(program_scoped_pk)
    balance_sk = staticmethod(balance_sk)
    member_sk = staticmethod(member_sk)
    reward_sk = staticmethod(reward_sk)
    txn_sk = staticmethod(txn_sk)
    gsi1_tenant = staticmethod(gsi1_tenant)
    gsi1_txn_sk = staticmethod(gsi1_txn_sk)
