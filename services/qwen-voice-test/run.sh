#!/usr/bin/env bash
# Runs the Qwen3-TTS trial once on a Google Cloud Run GPU (an NVIDIA L4), from Cloud Shell:
#   bash services/qwen-voice-test/run.sh <project-id>
# It builds the test, runs it (about 10 to 20 minutes), and prints the address of a page to listen on.
# The GPU only runs while the test runs; nothing stays switched on afterwards.
set -euo pipefail

PROJECT="${1:?Give the project id, for example: bash run.sh seihouse-core}"
REGION="us-central1"
JOB="qwen-voice-test"
BUCKET="${PROJECT}-kokoro-voices"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${JOB}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

gcloud config set project "${PROJECT}" >/dev/null
echo "== Building the test (about 10 minutes; the GPU libraries are large)"
gcloud builds submit "${HERE}" --tag "${IMAGE}" --timeout=3600s --machine-type=e2-highcpu-8 --quiet

echo "== Setting up the test on a GPU"
gcloud run jobs deploy "${JOB}" --image "${IMAGE}" --region "${REGION}" \
  --gpu 1 --gpu-type nvidia-l4 --no-gpu-zonal-redundancy \
  --cpu 4 --memory 16Gi --task-timeout 3600 --max-retries 0 \
  --set-env-vars "BUCKET=${BUCKET}" --quiet

echo "== Running it (about 10 minutes)"
gcloud run jobs execute "${JOB}" --region "${REGION}" --wait

echo
echo "== Results"
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=${JOB} AND (textPayload:\"OVERALL\" OR textPayload:\"LISTEN\")" \
  --limit 2 --freshness 1h --format 'value(textPayload)'
echo
echo "Open the LISTEN address above in this browser (you are signed in, so it opens)."
