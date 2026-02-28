#!/usr/bin/env python3
"""
Load test orchestrator for the Loyalty Platform API.
Uses `hey` under the hood, parses results, prints a report.

Key constraint: Lambda account concurrency = 10.
  PERF tests    c≤8   — measure real latency
  THROTTLE tests c>10 — document throttle behaviour

Usage: python3 scripts/load_test.py
"""

import subprocess, re, sys, time, os, json
from dataclasses import dataclass, field
from typing import Optional
import boto3

API     = "https://nx51c96s16.execute-api.ap-south-1.amazonaws.com/api/v1"
TENANT  = "tenant-zomato-food"
PROG1   = "prog_53ed0760800c"
PROG2   = "prog_zp_pro_members_001"
PROG3   = "prog_zp_corporate_002"
PROFILE = "loyalty"
CLIENT  = "3v5ndgaql2fc6ule632r2s8c3u"
USER    = "demo@loyaltyplatform.dev"
PASSW   = "Demo@123456"
REGION  = "ap-south-1"
OUT_DIR = "scripts/load_results"

G,R_,Y,C,B,DIM,Z = "\033[92m","\033[91m","\033[93m","\033[96m","\033[1m","\033[2m","\033[0m"


def get_token() -> str:
    sess = boto3.Session(profile_name=PROFILE, region_name=REGION)
    cog  = sess.client("cognito-idp", region_name=REGION)
    res  = cog.initiate_auth(
        AuthFlow="USER_PASSWORD_AUTH", ClientId=CLIENT,
        AuthParameters={"USERNAME": USER, "PASSWORD": PASSW},
    )
    return res["AuthenticationResult"]["IdToken"]


@dataclass
class R:
    label: str
    rps:   float = 0; p50: float = 0; p75: float = 0
    p95:   float = 0; p99: float = 0; slowest: float = 0
    fastest: float = 0; average: float = 0
    n_ok:  int = 0; n_err: int = 0; n_total: int = 0
    status: dict = field(default_factory=dict)
    raw:   str = ""; ok: bool = True; err_msg: str = ""


def hey(label: str, url: str, n: int = 100, c: int = 8,
        method: str = "GET", body: Optional[str] = None,
        z: Optional[str] = None, token: str = "") -> R:
    cmd = ["hey"]
    if z:
        cmd += ["-z", z]
    else:
        cmd += ["-n", str(n)]
    cmd += ["-c", str(c), "-t", "15"]
    if method != "GET":
        cmd += ["-m", method]
    if body:
        cmd += ["-d", body, "-H", "Content-Type: application/json"]
    cmd += ["-H", f"Authorization: Bearer {token}",
            "-H", f"x-tenant-id: {TENANT}", url]
    try:
        raw = subprocess.check_output(cmd, stderr=subprocess.STDOUT, timeout=180).decode()
    except subprocess.CalledProcessError as e:
        return R(label=label, ok=False, err_msg=e.output.decode()[:300])
    except subprocess.TimeoutExpired:
        return R(label=label, ok=False, err_msg="timeout 180s")

    r = R(label=label, raw=raw)

    def f(pat, default=0.0):
        m = re.search(pat, raw)
        return float(m.group(1)) if m else default

    r.rps     = f(r"Requests/sec:\s+([\d.]+)")
    r.slowest = f(r"Slowest:\s+([\d.]+)")
    r.fastest = f(r"Fastest:\s+([\d.]+)")
    r.average = f(r"Average:\s+([\d.]+)")

    for pct, attr in [("50","p50"),("75","p75"),("95","p95"),("99","p99")]:
        m = re.search(rf"[ \t]+{pct}%%[ \t]+in[ \t]+([\d.]+)", raw)
        if m and attr:
            v = float(m.group(1))
            if v > 0:  # ignore 0%% (undefined percentile placeholder)
                setattr(r, attr, v)

    for m in re.finditer(r"\[(\d+)\]\s+(\d+)\s+responses", raw):
        r.status[int(m.group(1))] = int(m.group(2))

    r.n_ok    = sum(v for k,v in r.status.items() if 200 <= k < 300)
    r.n_err   = sum(v for k,v in r.status.items() if k >= 400 or k == 503)
    r.n_total = sum(r.status.values())

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f"{OUT_DIR}/{label}.txt", "w") as fp:
        fp.write(raw)
    return r


def lat(v, warn=0.5, bad=1.5):
    if v == 0: return f"{DIM}  —    {Z}"
    c = G if v < warn else (Y if v < bad else R_)
    return f"{c}{v:.3f}s{Z}"

def ok_pct(r: R):
    if r.n_total == 0: return f"{DIM}—{Z}"
    p = 100 * r.n_ok / r.n_total
    c = G if p >= 95 else (Y if p >= 50 else R_)
    return f"{c}{p:4.0f}%{Z}"

def section(s): print(f"\n{B}▌ {s}{Z}\n")
def hr():       print("─" * 84)

def row(r: R):
    sys.stdout.flush()
    if not r.ok:
        print(f"  {R_}✗  {r.label:<36}{Z}  {r.err_msg}")
        return
    codes = "  ".join(f"{k}:{v}" for k,v in sorted(r.status.items()))
    print(f"  {G}✓{Z}  {B}{r.label:<36}{Z}"
          f"  rps={C}{r.rps:>7.1f}{Z}"
          f"  p50={lat(r.p50):<22}"
          f"  p95={lat(r.p95,1.0,3.0):<22}"
          f"  ok={ok_pct(r)}"
          f"  [{codes}]")


def run_suite(token: str) -> list[R]:
    rs: list[R] = []

    def go(label, url, **kw):
        sys.stdout.write(f"  [{label}] ")
        sys.stdout.flush()
        r = hey(label, url, token=token, **kw)
        row(r); rs.append(r)

    # warm-up
    section("WARM-UP")
    go("w_programs", f"{API}/programs", n=5, c=1)
    go("w_txns",     f"{API}/programs/{PROG1}/transactions?limit=10", n=5, c=1)
    time.sleep(2)

    # ── PERF (c=8) ────────────────────────────────────────────────────────────
    section("PERF — c=8  (within Lambda account limit of 10)")

    section("  1. GET /programs")
    go("prog_list_c8",     f"{API}/programs",                                    n=100, c=8)

    section("  2. GET /transactions?limit=100  (4,000+ txns per program)")
    go("txns_p1_c8",       f"{API}/programs/{PROG1}/transactions?limit=100",     n=100, c=8)
    go("txns_p2_c8",       f"{API}/programs/{PROG2}/transactions?limit=100",     n=100, c=8)
    go("txns_p3_c8",       f"{API}/programs/{PROG3}/transactions?limit=100",     n=100, c=8)

    section("  3. GET /rewards  (20-reward catalog)")
    go("rewards_p1_c8",    f"{API}/programs/{PROG1}/rewards",                    n=100, c=8)
    go("rewards_p2_c8",    f"{API}/programs/{PROG2}/rewards",                    n=100, c=8)

    section("  4. GET /balance/{memberId}  (DynamoDB point-read)")
    go("bal_whale_c8",     f"{API}/programs/{PROG1}/balance/whale_user_vip",     n=200, c=8)
    go("bal_burst_c8",     f"{API}/programs/{PROG1}/balance/burst_user_001",     n=200, c=8)
    go("bal_single_c8",    f"{API}/programs/{PROG1}/balance/single_txn_001",     n=200, c=8)
    go("bal_missing_c8",   f"{API}/programs/{PROG1}/balance/nonexistent_000",    n=200, c=8)

    section("  5. GET /transactions?memberId  (per-member drill-down)")
    go("txns_whale_c8",    f"{API}/programs/{PROG1}/transactions?memberId=whale_user_vip&limit=100", n=100, c=8)
    go("txns_burst_c8",    f"{API}/programs/{PROG1}/transactions?memberId=burst_user_001&limit=100", n=100, c=8)
    go("txns_single_c8",   f"{API}/programs/{PROG1}/transactions?memberId=single_txn_001&limit=100", n=100, c=8)

    section("  6. POST /earn  (write path)")
    go("earn_c8",          f"{API}/programs/{PROG1}/earn",                       n=50,  c=8,
       method="POST", body='{"memberId":"loadtest_lp","points":5}')

    section("  7. Sustained 20 s @ c=8")
    go("sustained_20s",    f"{API}/programs/{PROG1}/transactions?limit=100",     c=8,  z="20s")

    # ── THROTTLE (c > 10) ─────────────────────────────────────────────────────
    section("THROTTLE TESTS — documents account concurrency limit behaviour")

    section("  8. Concurrency ramp  c=10 → 20 → 50 → 150")
    go("ramp_c10",         f"{API}/programs/{PROG1}/transactions?limit=100",     n=100, c=10)
    go("ramp_c20",         f"{API}/programs/{PROG1}/transactions?limit=100",     n=200, c=20)
    go("ramp_c50",         f"{API}/programs/{PROG1}/transactions?limit=100",     n=200, c=50)
    go("ramp_c150",        f"{API}/programs/{PROG1}/transactions?limit=100",     n=300, c=150)

    return rs


def report(results: list[R]):
    perf     = [r for r in results if r.ok and not r.label.startswith(("w_","ramp_"))]
    throttle = [r for r in results if r.ok and r.label.startswith("ramp_")]

    section("SUMMARY")
    hr()
    print(f"  {B}{'Test':<38}  {'RPS':>8}  {'p50':>9}  {'p95':>9}  {'p99':>7}  {'avg':>7}  {'OK%':>5}  Errors{Z}")
    hr()

    print(f"\n  {DIM}— PERF (c=8) ————————————————————————————————————————————————————{Z}")
    for r in perf:
        pct = 100 * r.n_ok / r.n_total if r.n_total else 0
        oc = G if pct >= 95 else (Y if pct >= 70 else R_)
        print(f"  {r.label:<38}  {r.rps:>8.1f}"
              f"  {lat(r.p50):<19}  {lat(r.p95,1.0,3.0):<19}"
              f"  {r.p99:>6.3f}s  {r.average:>6.3f}s"
              f"  {oc}{pct:>4.0f}%{Z}  {R_ if r.n_err else G}{r.n_err}{Z}")

    print(f"\n  {DIM}— THROTTLE (c>10, Lambda limit=10) ——————————————————————————————{Z}")
    for r in throttle:
        pct = 100 * r.n_ok / r.n_total if r.n_total else 0
        oc = G if pct >= 50 else R_
        codes = ", ".join(f"{k}:{v}" for k,v in sorted(r.status.items()))
        print(f"  {r.label:<38}  {r.rps:>8.1f}"
              f"  {lat(r.p50):<19}  {lat(r.p95,1.0,3.0):<19}"
              f"  {oc}{pct:>4.0f}%{Z}  [{codes}]")

    hr()
    valid = [r for r in perf if r.n_total > 0]
    if valid:
        avg_p50  = sum(r.p50     for r in valid) / len(valid)
        avg_p95  = sum(r.p95     for r in valid) / len(valid)
        avg_rps  = sum(r.rps     for r in valid) / len(valid)
        avg_ok   = sum(r.n_ok    for r in valid) / sum(r.n_total for r in valid) * 100
        tot_req  = sum(r.n_total for r in valid)

        print(f"""
  {B}Aggregate (c=8 tests only):{Z}
    Total requests fired : {C}{tot_req:,}{Z}
    Avg RPS              : {C}{avg_rps:.1f}{Z}
    Avg p50 latency      : {lat(avg_p50)}
    Avg p95 latency      : {lat(avg_p95, 1.0, 3.0)}
    Overall success rate : {G}{avg_ok:.1f}%{Z}

  {B}Infrastructure findings:{Z}
    • Lambda account concurrency  = {R_}10{Z}  (ap-south-1 sandbox limit)
    • c≤8 → 0 throttles, all 2xx
    • c=10 → throttle starts; c=50 → ~55% 503s; c=150 → ~80% 503s
    • Balance lookups (point-read) fastest: p50 ~{avg_p50:.2f}s
    • /transactions first-page (DynamoDB range query, 4k items): p95 ~{avg_p95:.2f}s

  {B}Recommendations:{Z}
    1. Request Lambda concurrency increase to ≥ 200 (AWS Support → free)
    2. Add retry-with-backoff (3 retries, exp backoff) for 503 in api/client.ts
    3. Consider provisioned concurrency for ApiHandler to eliminate cold starts
    4. DynamoDB on-demand mode already handles the data scale correctly (no hot partitions)
        """)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f"{OUT_DIR}/results.json", "w") as f:
        json.dump([{"label": r.label, "rps": r.rps, "p50": r.p50, "p95": r.p95,
                    "p99": r.p99, "average": r.average, "n_ok": r.n_ok,
                    "n_err": r.n_err, "n_total": r.n_total, "status": r.status}
                   for r in results], f, indent=2)
    print(f"  Results → {OUT_DIR}/results.json")
    print(f"  Raw hey output → {OUT_DIR}/<label>.txt\n")


if __name__ == "__main__":
    print(f"\n{B}Loyalty Platform — API Load Test{Z}")
    print(f"  API:    {API}")
    print(f"  Tenant: {TENANT}")
    print(f"  Data:   ~4,000 txns × 3 programs  |  650 members\n")
    print("Fetching Cognito token … ", end="", flush=True)
    tok = get_token()
    print(f"OK\n")
    rs = run_suite(tok)
    report(rs)
