#!/usr/bin/env bash
# One-command production deploy: Vercel project + envs + domains + Cloudflare DNS.
#
# Usage (run from the repo root on a machine with unrestricted network):
#   VERCEL_TOKEN=... CF_API_TOKEN=... ./scripts/deploy-frontend.sh
#
# Idempotent: safe to re-run. No secrets are ever written to disk — both
# tokens come from the environment and stay there.
set -euo pipefail

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN (vercel.com -> Settings -> Tokens)}"
: "${CF_API_TOKEN:?Set CF_API_TOKEN (Cloudflare token scoped to the rentium.ca zone)}"

DOMAIN="rentium.ca"
PROJECT="rentium-frontend"
API_URL="https://api.${DOMAIN}/api"   # where the backend will live (Cloudflare Tunnel -> your machine)

VC() { npx -y vercel@latest "$@" --token "$VERCEL_TOKEN"; }

echo "==> Linking Vercel project '${PROJECT}'"
VC link --yes --project "$PROJECT"

echo "==> Setting production env vars"
for pair in \
  "NEXT_PUBLIC_ROOT_DOMAIN=${DOMAIN}" \
  "NEXT_PUBLIC_DJANGO_API_URL=${API_URL}" \
  "DJANGO_API_URL=${API_URL}"; do
  name="${pair%%=*}"; value="${pair#*=}"
  VC env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | VC env add "$name" production
done

echo "==> Deploying to production"
VC deploy --prod --yes

echo "==> Attaching domains to the project"
PROJECT_ID=$(python3 -c "import json;print(json.load(open('.vercel/project.json'))['projectId'])")
for d in "$DOMAIN" "www.${DOMAIN}" "*.${DOMAIN}"; do
  echo "   + $d"
  curl -sS -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/domains" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json" \
    -d "{\"name\": \"$d\"}" | python3 -m json.tool || true
done

echo "==> Cloudflare DNS (records are DNS-only: Vercel must terminate TLS itself)"
ZONE_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")

cf_record() { # type name content
  curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
    -d "{\"type\":\"$1\",\"name\":\"$2\",\"content\":\"$3\",\"proxied\":false,\"ttl\":1}" \
    | python3 -c "import sys,json;r=json.load(sys.stdin);print('   ok' if r['success'] else '   ' + str(r['errors']))"
}
echo "   @   -> 76.76.21.21 (Vercel)";        cf_record A "@" "76.76.21.21"
echo "   www -> cname.vercel-dns.com";        cf_record CNAME "www" "cname.vercel-dns.com"
echo "   *   -> cname.vercel-dns.com";        cf_record CNAME "*" "cname.vercel-dns.com"

cat <<'NOTE'

Done. Two things to know:

1. WILDCARD (*.rentium.ca showcase subdomains): Vercel only issues wildcard
   certificates when the domain uses Vercel's nameservers. The API response
   above tells you the current verification state. If it's pending, either
   move nameservers to Vercel (Cloudflare stays your registrar) or skip
   wildcard for launch — the /l/<slug> paths work regardless.

2. BACKEND: the frontend expects https://api.rentium.ca/api. See
   docs/deploy.md for pointing that at your machine with a Cloudflare Tunnel.
NOTE
