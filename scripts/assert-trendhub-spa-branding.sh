#!/usr/bin/env bash
# trendhub imports/linkconnect SPA 브랜드 가드
# linkconnect/onoffcpa 저장소 SPA를 잘못 복사하면 홈 브랜드가 덮인다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REQUIRE_LOCK=0
if [[ "${1:-}" == "--require-lock" ]]; then
  REQUIRE_LOCK=1
  shift
fi

INDEX="${1:-$ROOT/plugin/onoff-builder-bridge/imports/linkconnect/index.html}"
DIR="$(cd "$(dirname "$INDEX")" && pwd)"
LOCK="$DIR/spa-brand.trendhub"

fail() {
  echo "assert-trendhub-spa-branding: FAIL — $1" >&2
  echo "  → trendhub/builder/linkconnect_source 에서 npm run deploy:imports 로만 갱신하세요." >&2
  echo "  → linkconnect/onoffcpa 저장소 imports/linkconnect 를 rsync/복사하지 마세요." >&2
  exit 1
}

if [[ ! -f "$INDEX" ]]; then
  fail "index.html 없음: $INDEX"
fi

if [[ "$REQUIRE_LOCK" -eq 1 ]] || [[ "$DIR" == */plugin/onoff-builder-bridge/imports/linkconnect ]]; then
  if [[ ! -f "$LOCK" ]]; then
    fail "브랜드 lock 없음: $LOCK (동기화 스크립트가 생성해야 함)"
  fi
  if ! grep -qE '^brand=trendhub$' "$LOCK"; then
    fail "브랜드 lock 내용 불일치: $LOCK"
  fi
fi

TITLE="$(grep -oE '<title>[^<]*</title>' "$INDEX" | head -1 || true)"
if [[ -z "$TITLE" ]]; then
  fail "title 태그 없음 ($INDEX)"
fi
if echo "$TITLE" | grep -qE '링크커넥트|LinkConnect|온오프CPA|OnOff CPA'; then
  fail "title 에 타 브랜드 포함: $TITLE"
fi
if ! echo "$TITLE" | grep -qE '트랜드허브|TrendHub'; then
  fail "title 에 트랜드허브/TrendHub 없음: $TITLE"
fi

if ! grep -qE '트랜드허브|TrendHub' "$INDEX"; then
  fail "트랜드허브/TrendHub 브랜드 문자열이 없음 ($INDEX)"
fi
if grep -qE '<title>[^<]*링크커넥트|<title>[^<]*온오프CPA|<meta[^>]+content="[^"]*링크커넥트 \|' "$INDEX"; then
  fail "타 브랜드 메타/타이틀 패턴 감지 ($INDEX)"
fi

JS_REL="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$INDEX" | head -1 || true)"
if [[ -n "$JS_REL" ]]; then
  JS_FILE="$DIR/$JS_REL"
  if [[ ! -f "$JS_FILE" ]]; then
    if [[ -f "$DIR/assets/${JS_REL#assets/}" ]]; then
      JS_FILE="$DIR/assets/${JS_REL#assets/}"
    fi
  fi
  if [[ -f "$JS_FILE" ]]; then
    if ! grep -q '트랜드허브' "$JS_FILE"; then
      fail "메인 JS 에 트랜드허브 없음: $JS_FILE"
    fi
    if grep -qE '링크커넥트 \| CPA CPS|온오프CPA \| CPA' "$JS_FILE"; then
      fail "메인 JS 에 타 사이트 타이틀 패턴 감지: $JS_FILE"
    fi
  fi
fi

echo "assert-trendhub-spa-branding: OK ($INDEX)"
exit 0
