#!/usr/bin/env bash
# Sets up SEIHouse's Kokoro voice server in a Google Cloud project, from Cloud Shell.
#   bash services/kokoro-voice/setup.sh <project-id>
# Safe to run again: it updates the server in place (and makes a new private key).
# The server is reachable without Google sign-in (--no-invoker-iam-check): an organization's
# sharing policy often refuses the usual public setting, and the app's own key guards making lines.
set -euo pipefail

PROJECT="${1:?Give the project id, for example: bash setup.sh seihouse-core}"
REGION="us-central1"
SERVICE="kokoro-voice"
BUCKET="${PROJECT}-kokoro-voices"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== Using project ${PROJECT}"
gcloud config set project "${PROJECT}" >/dev/null

echo "== Turning on Cloud Run, Cloud Build and Cloud Storage (first time takes a minute)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com

NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
ACCOUNT="${NUMBER}-compute@developer.gserviceaccount.com"

echo "== Letting the project build and run the server"
# The account Cloud Build builds with: the project's own default, which an organization may leave
# without any role at all, so it is given exactly what a source deploy needs.
BUILDER="$(gcloud builds get-default-service-account --format='value(serviceAccountEmail)' 2>/dev/null | sed 's#.*/##')"
for MEMBER in "${ACCOUNT}" ${BUILDER:+"${BUILDER}"}; do
  for ROLE in roles/run.builder roles/serviceusage.serviceUsageConsumer; do
    gcloud projects add-iam-policy-binding "${PROJECT}" --member="serviceAccount:${MEMBER}" --role="${ROLE}" --condition=None >/dev/null
  done
done
echo "== Waiting a minute for Google to apply those permissions"
sleep 60

echo "== Making the storage for made lines (gs://${BUCKET})"
if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --location="${REGION}" --uniform-bucket-level-access
fi
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member="serviceAccount:${ACCOUNT}" --role="roles/storage.objectAdmin" >/dev/null

TOKEN="$(openssl rand -hex 32)"

echo "== Building and starting the server (about 5 to 10 minutes the first time)"
gcloud run deploy "${SERVICE}" \
  --source "${HERE}" \
  --region "${REGION}" \
  --no-invoker-iam-check \
  --cpu 4 --memory 4Gi \
  --concurrency 40 --max-instances 2 --timeout 120 \
  --set-env-vars "KOKORO_BUCKET=${BUCKET},KOKORO_TOKEN=${TOKEN}" \
  --quiet

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo "== Checking it answers"
curl -fsS "${URL}/health" && echo

cat <<DONE

All set. Add these two in Vercel (your project > Settings > Environment Variables),
for Production and Preview:

  KOKORO_SERVER_URL    ${URL}
  KOKORO_SERVER_TOKEN  ${TOKEN}

The address is not secret; the key is. Do not paste the key into a chat.
DONE
