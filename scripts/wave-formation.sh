#!/usr/bin/env bash
# =============================================================================
# wave-formation.sh — PROJECT APEX Wave Delivery Hook Script
# =============================================================================
# Usage:
#   ./scripts/wave-formation.sh init W1
#   ./scripts/wave-formation.sh checkpoint W1 "auth working, 82 tests green"
#   ./scripts/wave-formation.sh complete W1
#   ./scripts/wave-formation.sh status
#   ./scripts/wave-formation.sh report W1
#
# Secrets (read from ~/.env or /etc/apex-os/secrets.env):
#   TELEGRAM_BOT_TOKEN
#   TELEGRAM_CHAT_ID
#   VERCEL_PROJECT
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WAVES_DIR="${REPO_ROOT}/docs/waves"
STATE_FILE="${WAVES_DIR}/.wave-state.json"

# ---------------------------------------------------------------------------
# PROJECT CONFIG — edit this block per project, touch nothing else
# ---------------------------------------------------------------------------
PROJECT_NAME="Apex Sentinel Presentation"
APP_DIR="${REPO_ROOT}"   # where tests + build run
VERCEL_ALIAS="sentinel-deck.infoacademy.uk"  # production URL (empty = no deploy)
DEPLOY_ENABLED=false

# ---------------------------------------------------------------------------
# Load secrets
# ---------------------------------------------------------------------------
load_secrets() {
  for f in "/etc/apex-os/secrets.env" "${HOME}/.env"; do
    if [[ -f "$f" ]]; then
      # shellcheck disable=SC1090
      set -o allexport
      source "$f"
      set +o allexport
      break
    fi
  done
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()    { echo -e "${CYAN}[wave]${RESET} $*"; }
ok()     { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[!]${RESET} $*"; }
fail()   { echo -e "${RED}[✗]${RESET} $*"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════${RESET}"; echo -e "${BOLD}${CYAN}  $*${RESET}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}\n"; }

# Validate wave name (W0-W9)
validate_wave() {
  local wave="$1"
  if [[ ! "$wave" =~ ^W[0-9]+$ ]]; then
    fail "Invalid wave name: '$wave'. Use format W0, W1, W2 ..."
  fi
}

# Get wave number (W1 → 1)
wave_num() {
  echo "${1:1}"
}

# ---------------------------------------------------------------------------
# State management (JSON via awk/sed — no jq dependency)
# ---------------------------------------------------------------------------
ensure_state_file() {
  mkdir -p "${WAVES_DIR}"
  if [[ ! -f "${STATE_FILE}" ]]; then
    echo '{}' > "${STATE_FILE}"
  fi
}

get_wave_status() {
  local wave="$1"
  ensure_state_file
  # Extract "W1": "complete" style value
  local val
  val=$(grep -o "\"${wave}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "${STATE_FILE}" 2>/dev/null | sed 's/.*: *"\(.*\)"/\1/' || true)
  echo "${val:-not_started}"
}

set_wave_status() {
  local wave="$1"
  local status="$2"
  ensure_state_file
  local current
  current=$(cat "${STATE_FILE}")
  # Remove existing entry if present
  current=$(echo "$current" | sed "s/\"${wave}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"[,]*//" | sed 's/{[[:space:]]*,/{/' | sed 's/,[[:space:]]*}/}/')
  # Insert new entry
  if [[ "$current" == "{}" ]]; then
    echo "{\"${wave}\": \"${status}\"}" > "${STATE_FILE}"
  else
    echo "$current" | sed "s/^{/{\"${wave}\": \"${status}\", /" > "${STATE_FILE}"
  fi
}

# ---------------------------------------------------------------------------
# Git checks
# ---------------------------------------------------------------------------
check_git_clean() {
  log "Checking git status..."
  cd "${REPO_ROOT}"
  local dirty
  dirty=$(git status --porcelain 2>/dev/null || true)
  if [[ -n "$dirty" ]]; then
    warn "Uncommitted changes detected:"
    echo "$dirty"
    fail "Git working tree must be clean before initialising a wave. Commit or stash changes first."
  fi
  ok "Git working tree is clean"
}

# ---------------------------------------------------------------------------
# Test runner — auto-detect npm vs pnpm vs yarn
# ---------------------------------------------------------------------------
detect_pm() {
  cd "${REPO_ROOT}"
  # Prefer the CFO app subdir; fall back to repo root
  local pkg_dir="${REPO_ROOT}"
  for d in "${APP_DIR}" "${REPO_ROOT}"; do
    if [[ -f "${d}/package.json" ]]; then
      pkg_dir="$d"
      break
    fi
  done
  echo "$pkg_dir"
}

run_tests() {
  local label="${1:-test run}"
  log "Running tests (${label})..."
  local pkg_dir
  pkg_dir=$(detect_pm)
  cd "$pkg_dir"

  local pm="npm"
  [[ -f "pnpm-lock.yaml" ]] && pm="pnpm"
  [[ -f "yarn.lock" ]] && pm="yarn"

  local output
  local exit_code=0
  output=$($pm test -- --passWithNoTests 2>&1) || exit_code=$?

  echo "$output"

  if [[ $exit_code -ne 0 ]]; then
    fail "Tests FAILED — cannot proceed. Fix all failing tests before continuing."
  fi

  # Extract test count
  local count
  count=$(echo "$output" | grep -Eo '[0-9]+ passed' | tail -1 | grep -Eo '[0-9]+' || echo "?")
  echo "$count"
}

# ---------------------------------------------------------------------------
# Build check
# ---------------------------------------------------------------------------
run_build() {
  log "Running build..."
  local pkg_dir
  pkg_dir=$(detect_pm)
  cd "$pkg_dir"

  local pm="npm"
  [[ -f "pnpm-lock.yaml" ]] && pm="pnpm"
  [[ -f "yarn.lock" ]] && pm="yarn"

  if $pm run build 2>&1; then
    ok "Build passed"
  else
    fail "Build FAILED — cannot deploy. Fix build errors first."
  fi
}

# ---------------------------------------------------------------------------
# Vercel deployment
# ---------------------------------------------------------------------------
deploy_preview() {
  local wave="$1"
  log "Deploying preview to Vercel..."

  if ! command -v vercel &>/dev/null; then
    warn "vercel CLI not found — skipping preview deploy"
    echo "no-preview-url"
    return
  fi

  cd "${REPO_ROOT}"
  local deploy_dir="${APP_DIR}"
  [[ -d "$deploy_dir" ]] || deploy_dir="${REPO_ROOT}"

  local url
  url=$(vercel deploy "${deploy_dir}" --yes 2>&1 | grep -E 'https://' | tail -1 || true)
  if [[ -z "$url" ]]; then
    warn "Could not extract preview URL from vercel output"
    url="no-preview-url"
  fi
  ok "Preview deployed: ${url}"
  echo "$url"
}

deploy_production() {
  log "Deploying to production..."

  if ! command -v vercel &>/dev/null; then
    warn "vercel CLI not found — skipping production deploy"
    return
  fi

  cd "${REPO_ROOT}"
  local deploy_dir="${APP_DIR}"
  [[ -d "$deploy_dir" ]] || deploy_dir="${REPO_ROOT}"

  local url
  url=$(vercel deploy "${deploy_dir}" --prod --yes 2>&1 | grep -E 'https://' | tail -1 || true)
  if [[ -z "$url" ]]; then
    warn "Could not extract production URL"
    url="${VERCEL_ALIAS:-${VERCEL_PROJECT:-${PROJECT_NAME}}}"
  fi
  ok "Production deployed: ${url}"
  echo "$url"
}

# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------
send_telegram() {
  local message="$1"
  local token="${TELEGRAM_BOT_TOKEN:-}"
  local chat="${TELEGRAM_CHAT_ID:-}"

  if [[ -z "$token" || -z "$chat" ]]; then
    warn "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram notification"
    return
  fi

  local resp
  resp=$(curl -s -X POST \
    "https://api.telegram.org/bot${token}/sendMessage" \
    -d "chat_id=${chat}" \
    -d "parse_mode=HTML" \
    --data-urlencode "text=${message}" \
    2>&1) || true

  if echo "$resp" | grep -q '"ok":true'; then
    ok "Telegram notification sent"
  else
    warn "Telegram send failed: $resp"
  fi
}

# ---------------------------------------------------------------------------
# Wave goal lookup
# ---------------------------------------------------------------------------
wave_goal() {
  case "$1" in
    W0) echo "Foundation &amp; Thursday Launch — live product for March 19 event" ;;
    W1) echo "Identity &amp; Persistence — users can create accounts and save diagnostics" ;;
    W2) echo "Intelligence Dashboard — HUD-style financial intelligence dashboard" ;;
    W3) echo "Monetisation — Stripe billing, paid tiers enforced" ;;
    W4) echo "Board Intelligence — board report generator (PDF)" ;;
    W5) echo "Scale &amp; Teams — multi-user accounts and team invites" ;;
    *)  echo "Custom wave" ;;
  esac
}

wave_frs() {
  case "$1" in
    W0) echo "FR-01 to FR-15" ;;
    W1) echo "FR-16 to FR-28" ;;
    W2) echo "FR-29 to FR-42" ;;
    W3) echo "FR-43 to FR-54" ;;
    W4) echo "FR-55 to FR-62" ;;
    W5) echo "FR-63 to FR-70" ;;
    *)  echo "FR-?? to FR-??" ;;
  esac
}

# ---------------------------------------------------------------------------
# Plan template
# ---------------------------------------------------------------------------
write_plan_template() {
  local wave="$1"
  local plan_file="${WAVES_DIR}/${wave}-plan.md"

  if [[ -f "$plan_file" ]]; then
    warn "Plan file already exists: ${plan_file}"
    return
  fi

  local goal frs today
  goal=$(wave_goal "$wave")
  frs=$(wave_frs "$wave")
  today=$(date -u +"%Y-%m-%d")

  cat > "$plan_file" <<PLAN
# ${wave} Plan — $(wave_goal "$wave" | sed 's/&amp;/\&/g')

**Wave:** ${wave}
**Start date:** ${today}
**Target complete:** TODO
**Status:** planning

## Goal
$(wave_goal "$wave" | sed 's/&amp;/\&/g')

## Functional Requirements Covered
<!-- List each FR covered by this wave -->
- ${frs%%to*}: <name>
- ...${frs##*to }: <name>

## Acceptance Criteria
1. TODO
2. TODO
3. TODO

## TDD Test Mapping
| FR    | Test File                                 | Status |
|-------|-------------------------------------------|--------|
| FR-XX | __tests__/$(echo "$wave" | tr '[:upper:]' '[:lower:]')/FR-XX.test.ts | RED    |

## Definition of Done
- [ ] All acceptance criteria tests GREEN
- [ ] \`npm run build\` exits 0
- [ ] Preview URL deployed and verified
- [ ] Production deployed
- [ ] Wave completion report written

## Notes
<!-- Any decisions, risks, or carry-forwards from previous wave -->
PLAN

  ok "Wave plan created: ${plan_file}"
}

# ---------------------------------------------------------------------------
# Completion report
# ---------------------------------------------------------------------------
write_completion_report() {
  local wave="$1"
  local test_count="$2"
  local prod_url="$3"
  local report_file="${WAVES_DIR}/${wave}-complete.md"
  local now frs

  now=$(date -u +"%Y-%m-%d %H:%M UTC")
  frs=$(wave_frs "$wave")

  cat > "$report_file" <<REPORT
# ${wave} Completion Report

**Wave:** ${wave}
**Completed:** ${now}
**Production URL:** ${prod_url}
**Tests passing:** ${test_count}

## Goal Delivered
$(wave_goal "$wave" | sed 's/&amp;/\&/g')

## FRs Delivered
<!-- Auto-generated. Update with actual FRs. -->
- ${frs}: All delivered ✓

## Test Results
- Total tests: ${test_count}
- Passing: ${test_count}
- Failing: 0

## Deployment
- Production: ${prod_url}
- Deployed at: ${now}

## Known Issues / Carry-forwards
- None

## Next Wave Prerequisites
<!-- What does the next wave need from this one? -->
- TODO
REPORT

  ok "Completion report written: ${report_file}"
}

# ===========================================================================
# COMMANDS
# ===========================================================================

# ---------------------------------------------------------------------------
# INIT
# ---------------------------------------------------------------------------
cmd_init() {
  local wave="${1:-}"
  [[ -z "$wave" ]] && fail "Usage: wave-formation.sh init <WAVE>  (e.g. W1)"
  validate_wave "$wave"
  header "WAVE ${wave} — INIT"

  load_secrets

  # Check previous wave complete (skip for W0)
  local num
  num=$(wave_num "$wave")
  if [[ $num -gt 0 ]]; then
    local prev="W$((num - 1))"
    local prev_status
    prev_status=$(get_wave_status "$prev")
    if [[ "$prev_status" != "complete" ]]; then
      fail "Previous wave ${prev} is '${prev_status}' — must be 'complete' before starting ${wave}"
    fi
    ok "Previous wave ${prev} is complete"
  fi

  # Git clean check
  check_git_clean

  # Tests must pass at start
  log "Verifying baseline tests..."
  run_tests "baseline" > /dev/null 2>&1 || fail "Tests are failing at wave start — fix before initialising"
  ok "All existing tests passing"

  # Create plan template
  mkdir -p "${WAVES_DIR}"
  write_plan_template "$wave"

  # Create REUSE_SCAN.md template for this wave
  local reuse_scan_file="${WAVES_DIR}/${wave}/REUSE_SCAN.md"
  mkdir -p "${WAVES_DIR}/${wave}"
  if [[ ! -f "$reuse_scan_file" ]]; then
    local today
    today=$(date -u +"%Y-%m-%d")
    cat > "$reuse_scan_file" <<REUSE
# Reuse Scan — ${wave}

> **Mandatory:** Complete this before wave:tdd-red (Reuse-First Protocol, cheatsheet-v4.md §O)

**Date:** ${today}
**Wave:** ${wave}

## FR Reuse Results

| FR | Query | FFMS Match | Decision | Time Saved |
|----|-------|------------|----------|------------|
| FR-XX | \`./scripts/reuse-scan.sh "feature"\` | path/to/file.ts | REUSE/ADAPT/BUILD NEW | ~Nh |

## Decisions

<!-- For each FR, record: what was found, what was adapted, attribution comment used -->

## Build New Justifications

<!-- For any BUILD NEW decision, briefly explain why FFMS/existing code was not sufficient -->
REUSE
    ok "Reuse scan template created: ${reuse_scan_file}"
  fi

  # Update state
  set_wave_status "$wave" "init"

  # Telegram
  local goal frs
  goal=$(wave_goal "$wave")
  frs=$(wave_frs "$wave")

  send_telegram "🌊 <b>WAVE ${wave} INIT</b>
Project: ${PROJECT_NAME}
Goal: ${goal}
FRs: ${frs}
Status: INITIALISED ✅
Plan: docs/waves/${wave}-plan.md created"

  echo ""
  ok "${BOLD}Wave ${wave} initialised.${RESET}"
  echo ""
  warn "REUSE-FIRST GATE: Before wave:tdd-red, run:"
  log "  ./scripts/reuse-scan.sh \"[feature description]\" for each FR"
  log "  Document findings in docs/waves/${wave}/REUSE_SCAN.md"
  log "  Only proceed to tdd-red after confirming no reusable code exists"
  echo ""
  log "Next: edit docs/waves/${wave}-plan.md → run reuse scan → write failing tests (wave:tdd-red)"
}

# ---------------------------------------------------------------------------
# CHECKPOINT
# ---------------------------------------------------------------------------
cmd_checkpoint() {
  local wave="${1:-}"
  local note="${2:-checkpoint reached}"
  [[ -z "$wave" ]] && fail "Usage: wave-formation.sh checkpoint <WAVE> [\"note\"]"
  validate_wave "$wave"
  header "WAVE ${wave} — CHECKPOINT"

  load_secrets

  local current_status
  current_status=$(get_wave_status "$wave")
  if [[ "$current_status" == "not_started" ]]; then
    fail "Wave ${wave} has not been initialised. Run: ./scripts/wave-formation.sh init ${wave}"
  fi

  # Run unit + integration tests — must all pass
  log "Running unit + integration test suite..."
  local test_output test_count
  test_output=$(cd "$(detect_pm)" && \
    { npm test -- --passWithNoTests 2>&1 || true; })
  echo "$test_output" | tail -20

  if echo "$test_output" | grep -qE 'failed|FAIL'; then
    fail "Tests are FAILING — checkpoint blocked. Fix all failing tests first."
  fi
  test_count=$(echo "$test_output" | grep -Eo '[0-9]+ passed' | tail -1 | grep -Eo '[0-9]+' || echo "?")
  ok "Unit + integration tests passing (${test_count})"

  # Coverage thresholds
  log "Checking coverage thresholds..."
  local cov_output
  cov_output=$(cd "$(detect_pm)" && { npm run test:coverage -- --passWithNoTests 2>&1 || true; })
  if echo "$cov_output" | grep -q "ERROR: Coverage"; then
    echo "$cov_output" | grep "ERROR: Coverage"
    fail "Coverage thresholds not met — checkpoint blocked."
  fi
  ok "Coverage thresholds met"

  # TypeScript check
  log "Running TypeScript check..."
  if cd "$(detect_pm)" && npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    fail "TypeScript errors — checkpoint blocked."
  fi
  ok "TypeScript clean"

  # Build check
  run_build

  # Deploy preview
  local preview_url
  preview_url=$(deploy_preview "$wave")

  # Update state
  set_wave_status "$wave" "checkpoint"

  # Telegram
  send_telegram "⚡ <b>WAVE ${wave} CHECKPOINT</b>
Project: ${PROJECT_NAME}
Note: ${note}
Tests: ${test_count} passing / 0 failing
Build: ✅ PASS
Preview: ${preview_url}
Status: CHECKPOINT HIT 🎯"

  echo ""
  ok "${BOLD}Wave ${wave} checkpoint complete.${RESET}"
  log "Continue implementing remaining FRs, then run: ./scripts/wave-formation.sh complete ${wave}"
}

# ---------------------------------------------------------------------------
# COMPLETE
# ---------------------------------------------------------------------------
cmd_complete() {
  local wave="${1:-}"
  [[ -z "$wave" ]] && fail "Usage: wave-formation.sh complete <WAVE>"
  validate_wave "$wave"
  header "WAVE ${wave} — COMPLETE"

  load_secrets

  local current_status
  current_status=$(get_wave_status "$wave")
  if [[ "$current_status" == "not_started" ]]; then
    fail "Wave ${wave} has not been initialised."
  fi

  # Run unit + integration tests — 100% must pass
  log "Running final unit + integration test suite..."
  local test_output test_count
  test_output=$(cd "$(detect_pm)" && \
    { npm test -- --passWithNoTests 2>&1 || true; })
  echo "$test_output" | tail -25

  if echo "$test_output" | grep -qE 'failed|FAIL'; then
    fail "Tests are FAILING — wave completion blocked. ALL tests must pass before completing."
  fi
  test_count=$(echo "$test_output" | grep -Eo '[0-9]+ passed' | tail -1 | grep -Eo '[0-9]+' || echo "?")
  ok "Unit + integration tests passing (${test_count})"

  # Coverage thresholds — enforced at wave:complete
  log "Checking coverage thresholds..."
  local cov_output
  cov_output=$(cd "$(detect_pm)" && { npm run test:coverage -- --passWithNoTests 2>&1 || true; })
  if echo "$cov_output" | grep -q "ERROR: Coverage"; then
    echo "$cov_output" | grep "ERROR: Coverage"
    fail "Coverage thresholds not met — wave completion blocked."
  fi
  ok "Coverage thresholds met"

  # TypeScript — zero errors required
  log "Running TypeScript check..."
  if cd "$(detect_pm)" && npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    fail "TypeScript errors — wave completion blocked."
  fi
  ok "TypeScript clean"

  # E2E — run Playwright against production
  if [[ -f "$(detect_pm)/playwright.config.ts" ]]; then
    log "Running E2E tests against production..."
    local e2e_output e2e_passed
    e2e_output=$(cd "$(detect_pm)" && { npx playwright test --reporter=list 2>&1 || true; })
    echo "$e2e_output" | tail -5
    if echo "$e2e_output" | grep -qE "failed|error"; then
      fail "E2E tests FAILING — wave completion blocked."
    fi
    e2e_passed=$(echo "$e2e_output" | grep -Eo '[0-9]+ passed' | tail -1 | grep -Eo '[0-9]+' || echo "?")
    ok "E2E tests passing (${e2e_passed})"
  fi

  # Build
  run_build

  # Production deploy
  local prod_url
  prod_url=$(deploy_production "$wave")

  # Write completion report
  write_completion_report "$wave" "$test_count" "$prod_url"

  # Update state
  set_wave_status "$wave" "complete"

  # Telegram
  local frs
  frs=$(wave_frs "$wave")
  send_telegram "🚀 <b>WAVE ${wave} COMPLETE</b>
Project: ${PROJECT_NAME}
FRs delivered: ${frs}
Tests: ${test_count} passing / 0 failing
Build: ✅ PASS
Production: ${prod_url}
Status: WAVE COMPLETE 🏁"

  echo ""
  ok "${BOLD}Wave ${wave} is COMPLETE.${RESET}"
  log "Report: docs/waves/${wave}-complete.md"

  # Show next wave hint
  local num next_wave
  num=$(wave_num "$wave")
  next_wave="W$((num + 1))"
  log "Next wave: ./scripts/wave-formation.sh init ${next_wave}"
}

# ---------------------------------------------------------------------------
# STATUS
# ---------------------------------------------------------------------------
cmd_status() {
  header "${PROJECT_NAME} — Wave Status"

  ensure_state_file

  local waves=("W0" "W1" "W2" "W3" "W4" "W5")
  local goals=(
    "Foundation & Thursday Launch"
    "Identity & Persistence"
    "Intelligence Dashboard"
    "Monetisation"
    "Board Intelligence"
    "Scale & Teams"
  )
  local frs_list=(
    "FR-01–FR-15"
    "FR-16–FR-28"
    "FR-29–FR-42"
    "FR-43–FR-54"
    "FR-55–FR-62"
    "FR-63–FR-70"
  )

  printf "%-6s %-20s %-16s %-14s\n" "WAVE" "GOAL" "FRs" "STATUS"
  printf "%-6s %-20s %-16s %-14s\n" "------" "--------------------" "----------------" "--------------"

  for i in "${!waves[@]}"; do
    local w="${waves[$i]}"
    local status
    status=$(get_wave_status "$w")

    local status_icon
    case "$status" in
      complete)    status_icon="${GREEN}complete ✓${RESET}" ;;
      checkpoint)  status_icon="${YELLOW}checkpoint ⚡${RESET}" ;;
      init)        status_icon="${CYAN}init 🌊${RESET}" ;;
      not_started) status_icon="${RED}not started${RESET}" ;;
      *)           status_icon="$status" ;;
    esac

    printf "%-6s %-20s %-16s " "$w" "${goals[$i]:0:19}" "${frs_list[$i]}"
    echo -e "$status_icon"
  done

  echo ""
  # Show plan files
  if ls "${WAVES_DIR}"/*.md &>/dev/null; then
    log "Wave documents:"
    for f in "${WAVES_DIR}"/*.md; do
      local base
      base=$(basename "$f")
      echo "  ${CYAN}→${RESET} docs/waves/${base}"
    done
  fi
}

# ---------------------------------------------------------------------------
# REPORT
# ---------------------------------------------------------------------------
cmd_report() {
  local wave="${1:-}"
  [[ -z "$wave" ]] && fail "Usage: wave-formation.sh report <WAVE>"
  validate_wave "$wave"
  header "Wave ${wave} Report"

  local status
  status=$(get_wave_status "$wave")
  echo -e "Status: ${BOLD}${status}${RESET}"
  echo ""

  local plan_file="${WAVES_DIR}/${wave}-plan.md"
  local complete_file="${WAVES_DIR}/${wave}-complete.md"

  if [[ -f "$complete_file" ]]; then
    log "Completion report (${wave}-complete.md):"
    echo "---"
    cat "$complete_file"
    echo "---"
  elif [[ -f "$plan_file" ]]; then
    log "Plan (${wave}-plan.md) — wave in progress:"
    echo "---"
    cat "$plan_file"
    echo "---"
  else
    warn "No documents found for ${wave}."
    log "Run: ./scripts/wave-formation.sh init ${wave}  to start this wave."
  fi

  echo ""
  log "State file: ${STATE_FILE}"
}

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    init)         cmd_init "$@" ;;
    checkpoint)   cmd_checkpoint "$@" ;;
    complete)     cmd_complete "$@" ;;
    status)       cmd_status ;;
    report)       cmd_report "$@" ;;
    "")
      echo -e "${BOLD}wave-formation.sh — ${PROJECT_NAME} Wave Hook Script${RESET}"
      echo ""
      echo "Commands:"
      echo "  init <WAVE>                       Initialise a wave (git check, test check, create plan)"
      echo "  checkpoint <WAVE> [\"note\"]        Mid-wave checkpoint (tests + preview deploy + Telegram)"
      echo "  complete <WAVE>                   Complete a wave (tests + prod deploy + report + Telegram)"
      echo "  status                            Show all wave statuses"
      echo "  report <WAVE>                     Show plan or completion report for a wave"
      echo ""
      echo "Examples:"
      echo "  ./scripts/wave-formation.sh init W1"
      echo "  ./scripts/wave-formation.sh checkpoint W1 \"auth working, 82 tests green\""
      echo "  ./scripts/wave-formation.sh complete W1"
      echo "  ./scripts/wave-formation.sh status"
      echo "  ./scripts/wave-formation.sh report W1"
      echo ""
      echo "Secrets (load from ~/.env or /etc/apex-os/secrets.env):"
      echo "  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, VERCEL_PROJECT"
      ;;
    *)
      fail "Unknown command: '$cmd'. Run without arguments to see usage."
      ;;
  esac
}

main "$@"
