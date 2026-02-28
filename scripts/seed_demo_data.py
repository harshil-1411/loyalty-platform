#!/usr/bin/env python3
"""
Bulk seed script for demo@loyaltyplatform.dev (tenant: tenant-zomato-food).
Writes directly to DynamoDB using batch_write_item for maximum throughput.
Creates: 3 programs, 20 rewards each, 150 members, 600+ transactions spread over 90 days.
"""

import boto3
import random
import string
import time
from datetime import datetime, timedelta, timezone

# ── config ──────────────────────────────────────────────────────────────────
TABLE_NAME   = "loyalty-dev"
TENANT_ID    = "tenant-zomato-food"
REGION       = "ap-south-1"
PROFILE      = "loyalty"
TTL_SECONDS  = 18 * 30 * 24 * 3600   # 18 months

# ── programs to create (plus existing) ──────────────────────────────────────
PROGRAMS = [
    {"id": "prog_53ed0760800c", "name": "Zomato Gold Rewards", "currency": "INR"},   # existing — add more data
    {"id": "prog_zp_pro_members_001", "name": "Zomato Pro Members", "currency": "INR"},
    {"id": "prog_zp_corporate_002", "name": "Zomato Corporate Club", "currency": "USD"},
]

# ── reward catalog per program ───────────────────────────────────────────────
REWARD_TEMPLATES = [
    ("Free Delivery",              25),
    ("₹50 Off Next Order",        100),
    ("₹100 Cashback",             200),
    ("Free Dessert",               75),
    ("1 Month Gold Membership",   500),
    ("₹200 Discount Voucher",     400),
    ("Free Starter",               60),
    ("Birthday Surprise Box",     350),
    ("10% Off Zomato Market",     150),
    ("Early Access Pass",         180),
    ("Zomato Plus Trial",         250),
    ("Free Beverage",              50),
    ("₹500 Restaurant Voucher",   900),
    ("Loyalty Badge + Perks",     300),
    ("Priority Customer Support",  80),
    ("Weekend Brunch Discount",   220),
    ("Referral Bonus Credit",     120),
    ("Seasonal Festive Hamper",   750),
    ("₹1000 Grand Reward",       1800),
    ("Flash Sale Early Access",    90),
]

# ── member name corpus (150 members) ─────────────────────────────────────────
FIRST_NAMES = [
    "Priya", "Rahul", "Anita", "Karan", "Sneha", "Arjun", "Meera", "Vikram",
    "Divya", "Rohan", "Pooja", "Aditya", "Kavya", "Nikhil", "Riya", "Siddharth",
    "Anjali", "Manish", "Swati", "Dhruv", "Nandita", "Akash", "Shruti", "Varun",
    "Ayesha", "Rajesh", "Simran", "Mohit", "Lakshmi", "Suresh", "Deepika", "Kunal",
    "Payal", "Amit", "Ritika", "Gaurav", "Bhavna", "Shiv", "Tanvi", "Aarav",
    "Nisha", "Ishan", "Pallavi", "Tushar", "Sonali", "Pranav", "Aditi", "Vishal",
    "Radhika", "Kartik",
]
LAST_NAMES = ["001","002","003","004","005","006","007","008","009","010",
              "011","012","013","014","015","016","017","018","019","020",
              "021","022","023","024","025","026","027","028","029","030"]

# ── helpers ───────────────────────────────────────────────────────────────────
def uid(prefix: str, k=8) -> str:
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=k))}"

def iso_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def program_pk(program_id: str) -> str:
    return f"TENANT#{TENANT_ID}#PROGRAM#{program_id}"

def tenant_pk() -> str:
    return f"TENANT#{TENANT_ID}"

def batch_write(table, items: list[dict]):
    """Write items in batches of 25 (DynamoDB limit)."""
    for i in range(0, len(items), 25):
        batch = items[i:i+25]
        table.meta.client.batch_write_item(
            RequestItems={
                TABLE_NAME: [{"PutRequest": {"Item": item}} for item in batch]
            }
        )

def now_ts() -> int:
    return int(time.time())

# ── main seed ─────────────────────────────────────────────────────────────────
def main():
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    dynamo  = session.resource("dynamodb", region_name=REGION)
    table   = dynamo.Table(TABLE_NAME)

    base_time = datetime.now(timezone.utc)

    # ── 1. Create programs ───────────────────────────────────────────────────
    print("Creating programs …")
    program_items = []
    for p in PROGRAMS:
        created_at = iso_ts(base_time - timedelta(days=random.randint(90, 150)))
        program_items.append({
            "pk": tenant_pk(),
            "sk": f"PROGRAM#{p['id']}",
            "programId": p["id"],
            "name": p["name"],
            "currency": p["currency"],
            "earnRules": {"pointsPerUnit": random.choice([1, 2, 5])},
            "burnRules": {"minPoints": 50},
            "tierConfig": None,
            "createdAt": created_at,
            "updatedAt": created_at,
        })
    batch_write(table, program_items)
    print(f"  ✓ {len(program_items)} programs")

    # ── 2. Create rewards for each program ───────────────────────────────────
    print("Creating rewards …")
    reward_items = []
    # Map: program_id → list of reward_ids
    program_rewards: dict[str, list[dict]] = {}
    for p in PROGRAMS:
        pk = program_pk(p["id"])
        rewards = []
        # Shuffle so each program gets a slightly different mix
        templates = REWARD_TEMPLATES.copy()
        random.shuffle(templates)
        for name, cost in templates:
            r_id = uid("rew", 12)
            created_at = iso_ts(base_time - timedelta(days=random.randint(60, 120)))
            reward_items.append({
                "pk": pk,
                "sk": f"REWARD#{r_id}",
                "name": name,
                "pointsCost": cost,
                "tierEligibility": None,
                "createdAt": created_at,
                "updatedAt": created_at,
            })
            rewards.append({"id": r_id, "cost": cost, "name": name})
        program_rewards[p["id"]] = rewards
    batch_write(table, reward_items)
    print(f"  ✓ {len(reward_items)} rewards across {len(PROGRAMS)} programs")

    # ── 3. Generate members (150 per program) and transactions ───────────────
    print("Seeding members + transactions …")
    all_member_balance_items = []
    all_txn_items = []

    for p in PROGRAMS:
        pk = program_pk(p["id"])
        rewards = program_rewards[p["id"]]
        cheap_rewards = [r for r in rewards if r["cost"] <= 200]

        # Generate 150 unique member IDs for this program
        members = []
        seen = set()
        for fn in FIRST_NAMES:
            for ln in LAST_NAMES:
                m_id = f"{fn.lower()}_{ln}"
                if m_id not in seen:
                    seen.add(m_id)
                    members.append(m_id)
                if len(members) == 150:
                    break
            if len(members) == 150:
                break

        txns_for_program = []
        balance_map: dict[str, int] = {}  # member_id → running balance

        # Spread transactions over last 90 days
        # Each member gets between 3 and 9 earn transactions
        for m_id in members:
            balance_map[m_id] = 0
            num_earns = random.randint(3, 9)
            earn_times = sorted(
                [base_time - timedelta(
                    days=random.randint(0, 90),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                ) for _ in range(num_earns)]
            )
            for dt in earn_times:
                pts = random.choice([50, 100, 150, 200, 250, 300, 400, 500, 750, 1000])
                txn_id = uid("txn", 12)
                ts = iso_ts(dt)
                txns_for_program.append({
                    "pk": pk,
                    "sk": f"TXN#{ts}#{txn_id}",
                    "type": "earn",
                    "memberId": m_id,
                    "points": pts,
                    "createdAt": ts,
                    "ttl": now_ts() + TTL_SECONDS,
                    "gsi1pk": f"TENANT#{TENANT_ID}",
                    "gsi1sk": f"TXN#{p['id']}#{ts}#{txn_id}",
                })
                balance_map[m_id] += pts

        # Redemptions: ~40% of members redeem 1-3 times
        redeemers = random.sample(members, k=int(len(members) * 0.4))
        for m_id in redeemers:
            num_redeems = random.randint(1, 3)
            for _ in range(num_redeems):
                if not cheap_rewards:
                    break
                r = random.choice(cheap_rewards)
                if balance_map[m_id] < r["cost"]:
                    continue
                dt = base_time - timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
                txn_id = uid("txn", 12)
                ts = iso_ts(dt)
                txns_for_program.append({
                    "pk": pk,
                    "sk": f"TXN#{ts}#{txn_id}",
                    "type": "redemption",
                    "memberId": m_id,
                    "points": r["cost"],
                    "rewardId": r["id"],
                    "createdAt": ts,
                    "ttl": now_ts() + TTL_SECONDS,
                    "gsi1pk": f"TENANT#{TENANT_ID}",
                    "gsi1sk": f"TXN#{p['id']}#{ts}#{txn_id}",
                })
                balance_map[m_id] -= r["cost"]

        # Burns: ~15% of members burn points manually
        burners = random.sample(members, k=int(len(members) * 0.15))
        for m_id in burners:
            burn_pts = random.choice([50, 100, 150])
            if balance_map[m_id] < burn_pts:
                continue
            dt = base_time - timedelta(
                days=random.randint(0, 45),
                hours=random.randint(0, 23)
            )
            txn_id = uid("txn", 12)
            ts = iso_ts(dt)
            txns_for_program.append({
                "pk": pk,
                "sk": f"TXN#{ts}#{txn_id}",
                "type": "burn",
                "memberId": m_id,
                "points": burn_pts,
                "createdAt": ts,
                "ttl": now_ts() + TTL_SECONDS,
                "gsi1pk": f"TENANT#{TENANT_ID}",
                "gsi1sk": f"TXN#{p['id']}#{ts}#{txn_id}",
            })
            balance_map[m_id] -= burn_pts

        # Write balance items
        now_str = iso_ts(base_time)
        for m_id, bal in balance_map.items():
            all_member_balance_items.append({
                "pk": pk,
                "sk": f"BALANCE#{m_id}",
                "memberId": m_id,
                "points": max(0, bal),
                "updatedAt": now_str,
            })

        all_txn_items.extend(txns_for_program)
        print(f"  {p['name']}: {len(members)} members, {len(txns_for_program)} transactions")

    # ── 4. Batch write balances ───────────────────────────────────────────────
    print(f"\nWriting {len(all_member_balance_items)} balance items …")
    batch_write(table, all_member_balance_items)
    print("  ✓ done")

    # ── 5. Batch write transactions ──────────────────────────────────────────
    print(f"Writing {len(all_txn_items)} transaction items …")
    # Sort by timestamp just for sanity
    all_txn_items.sort(key=lambda x: x["sk"])
    batch_write(table, all_txn_items)
    print("  ✓ done")

    # ── summary ───────────────────────────────────────────────────────────────
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("Seed complete!")
    print(f"  Programs     : {len(PROGRAMS)}")
    print(f"  Rewards      : {len(reward_items)}")
    print(f"  Members      : {len(all_member_balance_items)}")
    print(f"  Transactions : {len(all_txn_items)}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    main()
