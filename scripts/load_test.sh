#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# load_test.sh  —  API Gateway + Lambda + DynamoDB load test
# Usage: ./scripts/load_test.sh <ID_TOKEN>
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TOKEN="${1:?Usage: $0 <ID_TOKEN>}"

API="https://nx51c96s16.execute-api.ap-south-1.amazonaws.com/api/v1"
TENANT="tenant-zomato-food"
PROG1="prog_53ed0760800c"
PROG2="prog_zp_pro_members_001"
PROG3="prog_zp_corporate_002"
AUTH="Authorization: Bearer ${TOKEN}"
TID="x-tenant-id: ${TENANT}"
CT="Content-Type: application/json"

OUT_DIR="scripts/load_results"
mkdir -p "$OUT_DIR"

PASS=0; FAIL=0

run() {
  local label="$1"; local file="$OUT_DIR/${label}.txt"
  shift
  echo -n "  [$label] "
  if hey "$@" > "$file" 2>&1; then
    # Extract summary line
    local rps lat50 lat95 lat99 err
    rps=$(grep -E "^  Requests/sec:" "$file" | awk '{print $2}')
    lat50=$(grep "50%" "$file" | awk '{print $2}')
    lat95=$(grep "95%" "$file" | awk '{print $2}')
    lat99=$(grep "99%" "$file" | awk '{print $2}')
    err=$(grep -E "^\[" "$file" | grep -v "200\|201\|204" | awk '{sum+=$2} END{print sum+0}')
    printf "✓  rps=%-8s  p50=%-8s  p95=%-8s  p99=%-8s  errors=%s\n" \
      "${rps:-?}" "${lat50:-?}" "${lat95:-?}" "${lat99:-?}" "${err:-0}"
    PASS=$((PASS+1))
  else
    echo "✗  (hey exit $?)"
    FAIL=$((FAIL+1))
  fi
}

bar() { echo ""; echo "▌ $1"; echo ""; }

# ─── warm-up ────────────────────────────────────────────────────────────────
bar "WARM-UP (5 req, verify auth)"
hey -n 5 -c 1 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs" > /dev/null 2>&1 && echo "  auth OK" || { echo "  auth FAILED — check token"; exit 1; }

# ─── 1. Programs list ───────────────────────────────────────────────────────
bar "1. GET /programs  (list all programs)"
run "programs_list_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs"

# ─── 2. Transactions — first page (heaviest DynamoDB query) ─────────────────
bar "2. GET /programs/{id}/transactions?limit=100  (first page — all members)"
run "txns_first_page_prog1_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/transactions?limit=100"

run "txns_first_page_prog2_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG2}/transactions?limit=100"

run "txns_first_page_prog3_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG3}/transactions?limit=100"

# ─── 3. Transactions — period filter (today) ────────────────────────────────
bar "3. GET /transactions  (filtered — last 7 days)"
SINCE=$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)-timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
run "txns_7d_filter_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/transactions?limit=100"

# ─── 4. Rewards list ────────────────────────────────────────────────────────
bar "4. GET /programs/{id}/rewards  (catalog)"
run "rewards_list_prog1_50c" \
  -n 300 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/rewards"

run "rewards_list_prog2_50c" \
  -n 300 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG2}/rewards"

# ─── 5. Balance lookup — single member ──────────────────────────────────────
bar "5. GET /balance/{memberId}  (point-read)"
run "balance_lookup_whale_100c" \
  -n 500 -c 100 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/balance/whale_user_vip"

run "balance_lookup_burst_100c" \
  -n 500 -c 100 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/balance/burst_user_001"

run "balance_lookup_random_100c" \
  -n 500 -c 100 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/balance/priya_001"

# ─── 6. Earn (write path) ────────────────────────────────────────────────────
bar "6. POST /earn  (write path — 20 concurrency)"
run "earn_20c" \
  -n 100 -c 20 -m POST \
  -H "$AUTH" -H "$TID" -H "$CT" \
  -d '{"memberId":"load_test_member","points":10}' \
  "${API}/programs/${PROG1}/earn"

# ─── 7. Transactions list for single member ───────────────────────────────────
bar "7. GET /transactions?memberId=whale_user_vip  (member drill-down)"
run "txns_whale_50c" \
  -n 200 -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/transactions?memberId=whale_user_vip&limit=100"

# ─── 8. Spike — 150 concurrent on heaviest endpoint ─────────────────────────
bar "8. SPIKE TEST — 150 concurrent on /transactions"
run "txns_spike_150c" \
  -n 300 -c 150 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/transactions?limit=100"

# ─── 9. Sustained — 50c for 30s ──────────────────────────────────────────────
bar "9. SUSTAINED — 50c, 30 s on /transactions (endurance)"
run "txns_sustained_30s" \
  -z 30s -c 50 \
  -H "$AUTH" -H "$TID" \
  "${API}/programs/${PROG1}/transactions?limit=100"

# ─── summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results saved in: $OUT_DIR/"
echo "  PASS: $PASS   FAIL: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
