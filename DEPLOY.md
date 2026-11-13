# Deploying OpenBloom to Google Cloud Run

This guide walks through deploying OpenBloom as a highly scalable, serverless container on **Google Cloud Run** with Google Gemini AI support via **Google Secret Manager**.

---

## Prerequisites
1. [Google Cloud SDK (`gcloud`) installed and logged in](https://cloud.google.com/sdk/docs/install)
2. An active Google Cloud project with billing enabled
3. A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

---

## Step 1: Set Variables & Enable Google Cloud APIs

```bash
# Set your active project ID and target region
export PROJECT_ID="your-google-cloud-project-id"
export REGION="us-central1"

gcloud config set project $PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Step 2: Store Gemini API Key in Secret Manager

Store your Gemini key securely without exposing it in code or environment configuration files:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your secret value
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Grant Cloud Run's service account permission to read the secret:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create openbloom-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="OpenBloom Docker Repository"
```

---

## Step 4: Build & Deploy Container

### Option A: Build and Deploy in One Command (Cloud Build)

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_AR_LOCATION=$REGION,_AR_REPO=openbloom-repo
```

### Option B: Build Locally & Deploy Directly

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/openbloom-repo/openbloom:latest .

# Push image
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/openbloom-repo/openbloom:latest

# Deploy to Cloud Run
gcloud run deploy openbloom \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/openbloom-repo/openbloom:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## Step 5: Verify Deployment & Health Check

Cloud Run outputs a production URL: `https://openbloom-xxxxx-uc.a.run.app`.

Test the health endpoints:
```bash
curl -i https://<your-service-url>/healthz
curl -i https://<your-service-url>/api/health
```
