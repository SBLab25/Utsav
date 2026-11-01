# Utsav Production Deployment Guide

This guide outlines production deployment strategies, continuous integration / continuous deployment (CI/CD) pipelines, environment variable management, and database rule provisioning for the **Utsav** AI Celebration & Event Planner.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             User Browser               │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Google Cloud Run (Container Service)                     │
│                                                                              │
│   ┌─────────────────────────────┐        ┌───────────────────────────────┐   │
│   │   Vite React 19 Frontend    │        │    Express Node.js Server     │   │
│   │   (Static SPA from /dist)   │        │     (Port 3000 / 0.0.0.0)     │   │
│   └─────────────────────────────┘        └──────────────┬────────────────┘   │
└─────────────────────────────────────────────────────────┼────────────────────┘
                                                          │
                    ┌─────────────────────────────────────┴──────────────────┐
                    │                                                        │
                    ▼                                                        ▼
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│       Google Gemini API              │          │       Firebase Backend               │
│   • Gemini 2.5 Flash (SSE Streaming) │          │   • Firebase Authentication          │
│   • Google Imagen (Decor Theming)    │          │   • Cloud Firestore (Realtime DB)    │
│   • In-Memory Context Optimization   │          │   • Custom Security Rules & Indexes  │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

---

## 1. Environment Variables Configuration

| Variable | Scope | Secret? | Description | Example / Default |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server | **Yes** | Google AI Studio or Vertex AI API key | `AIzaSy...` |
| `PORT` | Server | No | Server listen port | `3000` (Cloud Run sets this automatically) |
| `NODE_ENV` | Server | No | Node environment | `production` |
| `VITE_FIREBASE_API_KEY` | Client | No | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | No | Firebase Auth Domain | `utsav-planner.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Client | No | Firebase Project ID | `utsav-planner` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | No | Firebase Cloud Storage Bucket | `utsav-planner.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | No | Firebase FCM Sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Client | No | Firebase Web App ID | `1:123456789012:web:abcdef...` |

> [!IMPORTANT]
> Client variables (`VITE_*`) are embedded into the client bundle at build time. Server variables (`GEMINI_API_KEY`, `PORT`, `NODE_ENV`) must be supplied to the container runtime via environment variables or Secret Manager.

---

## 2. Primary Deployment: Google Cloud Run (Recommended)

Google Cloud Run is the recommended production platform because:
1. **Fully Managed & Auto-scaling**: Automatically scales from 0 to $N$ instances based on concurrent SSE streams and HTTP traffic.
2. **Native Secret Manager**: Safely mounts `GEMINI_API_KEY` without committing secrets.
3. **HTTP/2 & SSE Support**: Native support for Server-Sent Events (`/api/plan-stream`).
4. **Zero-downtime Rollbacks**: Instant traffic-splitting between revisions.

### Step 2.1: Initial Google Cloud Setup
```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your active GCP project
gcloud config set project YOUR_GCP_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### Step 2.2: Create Artifact Registry Repository
```bash
gcloud artifacts repositories create utsav-repo \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Docker repository for Utsav Celebration Planner"
```

### Step 2.3: Store Gemini Secret in Secret Manager
```bash
# Create the secret
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

### Step 2.4: Build and Deploy Container
```bash
# Build the container image using Google Cloud Build
gcloud builds submit --tag asia-south1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/utsav-repo/utsav-app:latest \
  --build-arg VITE_FIREBASE_API_KEY="your_api_key" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com" \
  --build-arg VITE_FIREBASE_PROJECT_ID="your-project" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id" \
  --build-arg VITE_FIREBASE_APP_ID="your_app_id"

# Deploy to Cloud Run
gcloud run deploy utsav-app \
  --image asia-south1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/utsav-repo/utsav-app:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

---

## 3. Firebase Authentication & Firestore Rules Deployment

### Step 3.1: Enable Firebase Auth Providers
1. Go to **Firebase Console** $\rightarrow$ **Build** $\rightarrow$ **Authentication** $\rightarrow$ **Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google Sign-In**.
4. In **Settings** $\rightarrow$ **Authorized domains**, add your Cloud Run domain (e.g. `utsav-app-xxxxx-el.a.run.app`) and any custom domain (e.g. `utsav.app`).

### Step 3.2: Deploy Security Rules & Composite Indexes
The repository includes production-hardened `firestore.rules` and `firestore.indexes.json`.

```bash
# Log in to Firebase CLI
npm install -g firebase-tools
firebase login

# Associate with your Firebase project
firebase use YOUR_FIREBASE_PROJECT_ID

# Deploy Firestore rules and composite indexes
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 4. Automated CI/CD Pipeline (GitHub Actions)

Add `.github/workflows/deploy.yml` for automated testing, image building, and continuous deployment upon pushing to `main`.

```yaml
name: Deploy to Google Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: asia-south1
  SERVICE_NAME: utsav-app
  GAR_REPOSITORY: utsav-repo

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run Vitest test suite
        run: npx vitest run --exclude "server/api.test.ts"
        env:
          GEMINI_API_KEY: 'test-key'

      - name: Google Cloud Authentication
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet

      - name: Build and Push Docker Image
        run: |
          docker build \
            --build-arg VITE_FIREBASE_API_KEY="${{ secrets.VITE_FIREBASE_API_KEY }}" \
            --build-arg VITE_FIREBASE_AUTH_DOMAIN="${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}" \
            --build-arg VITE_FIREBASE_PROJECT_ID="${{ secrets.VITE_FIREBASE_PROJECT_ID }}" \
            --build-arg VITE_FIREBASE_STORAGE_BUCKET="${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}" \
            --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}" \
            --build-arg VITE_FIREBASE_APP_ID="${{ secrets.VITE_FIREBASE_APP_ID }}" \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.GAR_REPOSITORY }}/${{ env.SERVICE_NAME }}:${{ github.sha }} \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.GAR_REPOSITORY }}/${{ env.SERVICE_NAME }}:latest .
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.GAR_REPOSITORY }}/${{ env.SERVICE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.GAR_REPOSITORY }}/${{ env.SERVICE_NAME }}:latest

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ env.SERVICE_NAME }}
          region: ${{ env.REGION }}
          image: ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.GAR_REPOSITORY }}/${{ env.SERVICE_NAME }}:${{ github.sha }}
          flags: '--port=3000 --memory=512Mi --set-secrets=GEMINI_API_KEY=gemini-api-key:latest'
```

---

## 5. Alternative Platforms

### Option B: Render or Railway (PaaS)
1. Link your GitHub repository (`SBLab25/Utsav`).
2. Choose **Docker** environment (Render and Railway will detect the root `Dockerfile`).
3. Set Environment Variables in dashboard:
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
   - `VITE_FIREBASE_*` (if building via Docker build args)
4. Health check path: `/api/health`.

### Option C: Self-Hosted Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  utsav:
    build:
      context: .
      args:
        VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY}
        VITE_FIREBASE_AUTH_DOMAIN: ${VITE_FIREBASE_AUTH_DOMAIN}
        VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: always
```
Run with:
```bash
docker compose up -d --build
```

---

## 6. Health Checks, Monitoring & Rollbacks

- **Liveness & Readiness Health Endpoint**: `GET /api/health`
  - Returns `{"status": "ok"}` with HTTP 200.
  - Used by Cloud Run and Docker `HEALTHCHECK`.
- **Instant Rollback on Cloud Run**:
  If a new revision experiences errors:
  ```bash
  # List existing revisions
  gcloud run revisions list --service=utsav-app --region=asia-south1

  # Route 100% of traffic immediately to the previous stable revision
  gcloud run services update-traffic utsav-app \
    --region=asia-south1 \
    --to-revisions=PREVIOUS_REVISION_NAME=100
  ```
- **Firestore PITR (Point-in-Time Recovery)**:
  Enable continuous backup for Firestore:
  ```bash
  gcloud firestore databases update --point-in-time-recovery=enable
  ```
