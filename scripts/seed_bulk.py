#!/usr/bin/env python3
"""
Heavy bulk seed — adds 500 more members + ~5 earn txns each per program.
Target: ~5000 transactions per program (15,000+ total across 3 programs).
Also adds edge-case members: VIP whale (200 txns), inactive, single-txn, burst.
Uses parallel batch_write_item for ~8× throughput.
"""

import boto3
import random
import string
import time
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

TABLE_NAME  = "loyalty-dev"
TENANT_ID   = "tenant-zomato-food"
REGION      = "ap-south-1"
PROFILE     = "loyalty"
TTL_OFFSET  = 18 * 30 * 24 * 3600   # 18 months TTL

PROGRAMS = [
    {"id": "prog_53ed0760800c",       "name": "Zomato Gold Rewards"},
    {"id": "prog_zp_pro_members_001", "name": "Zomato Pro Members"},
    {"id": "prog_zp_corporate_002",   "name": "Zomato Corporate Club"},
]


# ── helpers ──────────────────────────────────────────────────────────────────

def iso_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def uid(k: int = 10) -> str:
    return f"txn_{''.join(random.choices(string.ascii_lowercase + string.digits, k=k))}"

def program_pk(pid: str) -> str:
    return f"TENANT#{TENANT_ID}#PROGRAM#{pid}"

def get_rewards(table, program_id: str) -> list[dict]:
    pk = program_pk(program_id)
    res = table.query(
        KeyConditionExpression="pk = :pk AND begins_with(sk, :p)",
        ExpressionAttributeValues={":pk": pk, ":p": "REWARD#"},
    )
    return [
        {"id": it["sk"].replace("REWARD#", ""), "cost": int(it.get("pointsCost", 100))}
        for it in res.get("Items", [])
    ]

def write_chunks_parallel(table, items: list[dict], workers: int = 8):
    chunks = [items[i:i+25] for i in range(0, len(items), 25)]
    def write_one(chunk):
        with table.batch_writer() as bw:
            for item in chunk:
                bw.put_item(Item=item)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(write_one, c) for c in chunks]
        for f in as_completed(futs):
            f.result()


# ── member generation ─────────────────────────────────────────────────────────

ADJECTIVES = [
    "swift","bright","calm","eager","bold","sharp","warm","cool","deep","fresh",
    "keen","pure","wise","fair","kind","true","glad","firm","mild","safe",
    "neat","fine","lean","rich","loud","soft","fast","slow","high","low",
]
NOUNS = [
    "fox","owl","elk","doe","jay","ram","cub","pup","hen","koi",
    "yak","gnu","emu","bat","cod","eel","orb","hog","asp","coy",
]

def gen_extra_member_ids(n: int) -> list[str]:
    members = []
    for adj in ADJECTIVES:
        for noun in NOUNS:
            for i in range(1, 6):
                members.append(f"{adj}_{noun}_{i:02d}")
                if len(members) == n:
                    return members
    return members[:n]


# ── main ─────────────────────────────────────────────────────────────────────

def seed_program(table, program: dict, extra_members: list[str], base: datetime) -> tuple[int, int]:
    """Returns (txn_count, balance_count)."""
    pid     = program["id"]
    pk      = program_pk(pid)
    rewards = get_rewards(table, pid)
    cheap   = [r for r in rewards if r["cost"] <= 200] or rewards[:3]
    now_str = iso_ts(base)
    ttl     = int(time.time()) + TTL_OFFSET

    all_items: list[dict] = []

    # ── 500 extra regular members ────────────────────────────────────────────
    for m_id in extra_members:
        bal = 0
        num_earns = random.randint(3, 8)
        for _ in range(num_earns):
            dt  = base - timedelta(days=random.randint(0,90), hours=random.randint(0,23), minutes=random.randint(0,59))
            pts = random.choice([50,100,150,200,250,300,400,500,750,1000,1500,2000])
            tid = uid()
            ts  = iso_ts(dt)
            all_items.append({
                "pk": pk, "sk": f"TXN#{ts}#{tid}",
                "type": "earn", "memberId": m_id, "points": pts,
                "createdAt": ts, "ttl": ttl,
                "gsi1pk": f"TENANT#{TENANT_ID}",
                "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
            })
            bal += pts
        # 35% chance: 1-2 redemptions
        if cheap and random.random() < 0.35:
            for _ in range(random.randint(1, 2)):
                r = random.choice(cheap)
                if bal < r["cost"]:
                    break
                dt  = base - timedelta(days=random.randint(0,30))
                tid = uid()
                ts  = iso_ts(dt)
                all_items.append({
                    "pk": pk, "sk": f"TXN#{ts}#{tid}",
                    "type": "redemption", "memberId": m_id,
                    "points": r["cost"], "rewardId": r["id"],
                    "createdAt": ts, "ttl": ttl,
                    "gsi1pk": f"TENANT#{TENANT_ID}",
                    "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
                })
                bal -= r["cost"]
        # 20% chance: burn
        if random.random() < 0.20:
            burn = random.choice([50, 100, 150])
            if bal >= burn:
                dt  = base - timedelta(days=random.randint(0,45))
                tid = uid()
                ts  = iso_ts(dt)
                all_items.append({
                    "pk": pk, "sk": f"TXN#{ts}#{tid}",
                    "type": "burn", "memberId": m_id, "points": burn,
                    "createdAt": ts, "ttl": ttl,
                    "gsi1pk": f"TENANT#{TENANT_ID}",
                    "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
                })
                bal -= burn
        all_items.append({
            "pk": pk, "sk": f"BALANCE#{m_id}",
            "memberId": m_id, "points": max(0, bal), "updatedAt": now_str,
        })

    # ── VIP whale — 200 earns ────────────────────────────────────────────────
    whale_id  = "whale_user_vip"
    whale_bal = 0
    for _ in range(200):
        dt  = base - timedelta(days=random.randint(0,365), hours=random.randint(0,23))
        pts = random.choice([1000,2000,3000,5000,10000])
        tid = uid()
        ts  = iso_ts(dt)
        all_items.append({
            "pk": pk, "sk": f"TXN#{ts}#{tid}",
            "type": "earn", "memberId": whale_id, "points": pts,
            "createdAt": ts, "ttl": ttl,
            "gsi1pk": f"TENANT#{TENANT_ID}",
            "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
        })
        whale_bal += pts
    all_items.append({
        "pk": pk, "sk": f"BALANCE#{whale_id}",
        "memberId": whale_id, "points": whale_bal, "updatedAt": now_str,
    })

    # ── Inactive member — all txns >180 days old ─────────────────────────────
    inactive_id  = "inactive_old_001"
    inactive_bal = 0
    for _ in range(8):
        dt  = base - timedelta(days=random.randint(180,365))
        pts = random.choice([100,200,300,500])
        tid = uid()
        ts  = iso_ts(dt)
        all_items.append({
            "pk": pk, "sk": f"TXN#{ts}#{tid}",
            "type": "earn", "memberId": inactive_id, "points": pts,
            "createdAt": ts, "ttl": ttl,
            "gsi1pk": f"TENANT#{TENANT_ID}",
            "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
        })
        inactive_bal += pts
    all_items.append({
        "pk": pk, "sk": f"BALANCE#{inactive_id}",
        "memberId": inactive_id, "points": inactive_bal,
        "updatedAt": iso_ts(base - timedelta(days=180)),
    })

    # ── Single-txn member ────────────────────────────────────────────────────
    single_id = "single_txn_001"
    dt  = base - timedelta(days=2)
    tid = uid()
    ts  = iso_ts(dt)
    all_items.append({
        "pk": pk, "sk": f"TXN#{ts}#{tid}",
        "type": "earn", "memberId": single_id, "points": 50,
        "createdAt": ts, "ttl": ttl,
        "gsi1pk": f"TENANT#{TENANT_ID}",
        "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
    })
    all_items.append({
        "pk": pk, "sk": f"BALANCE#{single_id}",
        "memberId": single_id, "points": 50, "updatedAt": ts,
    })

    # ── Burst user — 50 txns in one day ──────────────────────────────────────
    burst_id  = "burst_user_001"
    burst_bal = 0
    burst_day = (base - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(50):
        dt  = burst_day + timedelta(minutes=i * 20)
        pts = 100
        tid = uid()
        ts  = iso_ts(dt)
        all_items.append({
            "pk": pk, "sk": f"TXN#{ts}#{tid}",
            "type": "earn", "memberId": burst_id, "points": pts,
            "createdAt": ts, "ttl": ttl,
            "gsi1pk": f"TENANT#{TENANT_ID}",
            "gsi1sk": f"TXN#{pid}#{ts}#{tid}",
        })
        burst_bal += pts
    all_items.append({
        "pk": pk, "sk": f"BALANCE#{burst_id}",
        "memberId": burst_id, "points": burst_bal, "updatedAt": now_str,
    })

    # ── Write ────────────────────────────────────────────────────────────────
    txn_items = [i for i in all_items if i["sk"].startswith("TXN#")]
    bal_items = [i for i in all_items if not i["sk"].startswith("TXN#")]
    write_chunks_parallel(table, all_items)
    return len(txn_items), len(bal_items)


def main():
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    dynamo  = session.resource("dynamodb", region_name=REGION)
    table   = dynamo.Table(TABLE_NAME)
    base    = datetime.now(timezone.utc)

    extra_members = gen_extra_member_ids(500)
    print(f"Seeding {len(extra_members)} extra members + edge cases across {len(PROGRAMS)} programs …\n")

    grand_txns = 0
    grand_bals = 0
    for p in PROGRAMS:
        t0 = time.time()
        txns, bals = seed_program(table, p, extra_members, base)
        elapsed = time.time() - t0
        grand_txns += txns
        grand_bals += bals
        print(f"  ✓ {p['name']:<28} +{txns:>5} txns   +{bals:>4} balances   {elapsed:.1f}s")

    print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  Total new transactions : {grand_txns:,}")
    print(f"  Total new balances     : {grand_bals:,}")
    print(f"  Grand total new items  : {grand_txns + grand_bals:,}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    main()
