#!/usr/bin/env bash
# Testability audit — see the rn-testability rules (R1–R11, T1–T10).
# Adapted from Quiz Master's scripts/testability-audit.sh for this repo's
# Expo Router layout:
#   app/         screens (Expo Router routes)   → tests in __tests__/app/
#   components/  shared components              → colocated components/__tests__/
#   lib/         httpClient, api, pure logic    → colocated lib/__tests__/
# Screen tests live outside app/ because Expo Router treats every file in
# app/ as a route.
#
# Run from the repo root:  npm run audit:testability
#
# HARD checks fail the run (exit 1): the codebase is currently clean on these,
# so any hit is a new regression.
# ADVISORY checks only report: they still list known, pre-existing debt.
# Must stay bash 3.2-compatible (macOS): feed checks with `report X < <(cmd)`,
# never `cmd | report X` (a pipeline runs report in a subshell and loses the
# failure counter).
set -u
SRC="app components lib"
TESTS="app components lib __tests__"
hard_failures=0

section() { echo; echo "### $1"; }
report() {  # $1 = HARD|ADVISORY, stdin = findings
    local kind=$1 out
    out=$(sed 's/^/- /')
    if [ -z "$out" ]; then
        echo "none"
    else
        echo "$out"
        [ "$kind" = HARD ] && hard_failures=$((hard_failures + 1))
    fi
}

# Path of the test file expected for a source file (without extension).
expected_test() {
    local f=$1 d b
    b=$(basename "$f"); b=${b%.*}
    case "$f" in
        app/*) d=$(dirname "$f"); echo "__tests__/$d/$b.test" ;;
        *)     d=$(dirname "$f"); echo "$d/__tests__/$b.test" ;;
    esac
}

# shellcheck disable=SC2086
existing() { for d in $1; do [ -d "$d" ] && echo "$d"; done; }
SRC_DIRS=$(existing "$SRC")
TEST_DIRS=$(existing "$TESTS")

echo "## Testability audit ($SRC)"

section "[HARD] R1: fetch() outside lib/httpClient.ts"
report HARD < <(
grep -rnE '(^|[^.[:alnum:]_])fetch\(' $SRC_DIRS --include='*.ts' --include='*.tsx' \
    | grep -v __tests__ | grep -v '^lib/httpClient.ts:'
)

section "[HARD] R2: components importing an api module directly"
report HARD < <(
grep -rnE "from '(\.\./)+lib/api(/[a-zA-Z.]+)?'" components --include='*.tsx' | grep -v __tests__
)

section "[HARD] T1: un-awaited async RNTL calls in tests"
report HARD < <(
grep -rnE '^[[:space:]]*(const .* = )?(render|renderHook)\(|^[[:space:]]*(unmount|rerender)\(|^[[:space:]]*user\.(press|type|clear)' \
    $TEST_DIRS --include='*.test.ts' --include='*.test.tsx' | grep -v await
)

section "[HARD] T3: QueryClient in tests without retry: false"
report HARD < <(
grep -rn 'new QueryClient(' $TEST_DIRS --include='*.test.ts' --include='*.test.tsx' \
    | grep -v 'retry: false'
)

section "[HARD] T6: snapshot tests"
report HARD < <(
grep -rln 'toMatchSnapshot\|toMatchInlineSnapshot' $TEST_DIRS
)

section "[ADVISORY] R2: screens importing an api module directly (move calls into a hook)"
report ADVISORY < <(
grep -rnE "from '(\.\./)+lib/api(/[a-zA-Z.]+)?'" app --include='*.tsx' | grep -v __tests__
)

section "[ADVISORY] R11: source files with no test"
report ADVISORY < <(
find $SRC_DIRS -type f \( -name '*.ts' -o -name '*.tsx' \) ! -path '*__tests__*' ! -name '*.d.ts' ! -name 'index.ts' \
    ! -name 'types.ts' ! -name 'theme.ts' | sort | while read -r f; do
    grep -q '@testability-exempt' "$f" && continue
    t=$(expected_test "$f")
    ls "$t."* >/dev/null 2>&1 || echo "$f (expected $t.tsx/ts)"
done
)

section "[ADVISORY] R5: clock/randomness inside screens/components"
report ADVISORY < <(
grep -rnE 'Date\.now\(|new Date\(\)|Math\.random\(' app components --include='*.tsx' | grep -v __tests__
)

section "[ADVISORY] R4: screens over 300 lines (extract logic)"
report ADVISORY < <(
find app -name '*.tsx' ! -path '*__tests__*' -exec wc -l {} + \
    | grep -v ' total$' | awk '$1>300{print $2" ("$1" lines)"}'
)

echo
if [ "$hard_failures" -gt 0 ]; then
    echo "**Result: FAIL** — $hard_failures hard check(s) have findings."
    exit 1
fi
echo "**Result: PASS** — no hard-check findings (advisory items above are known debt)."
