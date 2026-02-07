"""DB key helpers (no DynamoDB)."""
import pytest
from app.db.keys import key, PROGRAM_SK_PREFIX, REWARD_SK_PREFIX, TXN_SK_PREFIX


def test_tenant_key():
    k = key.tenant("t1")
    assert k["pk"] == "TENANT#t1"
    assert k["sk"] == "TENANT"


def test_program_key():
    k = key.program("t1", "prog_1")
    assert k["pk"] == "TENANT#t1"
    assert k["sk"] == "PROGRAM#prog_1"


def test_program_scoped_pk():
    assert key.program_scoped_pk("t1", "p1") == "TENANT#t1#PROGRAM#p1"


def test_balance_sk():
    assert key.balance_sk("m1") == "BALANCE#m1"


def test_reward_sk():
    assert key.reward_sk("r1") == "REWARD#r1"


def test_txn_sk():
    sk = key.txn_sk("2025-02-07T12:00:00.000Z", "txn_1")
    assert sk.startswith("TXN#")
    assert "txn_1" in sk


def test_gsi1_tenant():
    assert key.gsi1_tenant("t1") == "TENANT#t1"
