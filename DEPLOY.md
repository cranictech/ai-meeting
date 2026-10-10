# Deploying Meeti to AWS (Lightsail / EC2)

This runs the whole backend (API + Postgres + audio uploads) in Docker on one
small AWS server. Because the server has a **persistent disk**, the current
local-storage transcription pipeline works unchanged — no code edits required.

## 0. Prerequisites
- An AWS account. New accounts get a **12-month free tier** (EC2 `t3.micro` is free).
- The repo pushed to GitHub: `ssenkula-rivan/ai-meeting`.
- Your real secrets ready: `OPENAI_API_KEY`, Resend `SMTP_PASSWORD`, a strong `JWT_SECRET`.

---

## 1. Create the server

### Option A — Lightsail (simplest, fixed ~$3.5–5/mo)
1. AWS Console → **Lightsail** → **Create instance** → platform **Linux/Unix**, image **Ubuntu 22.04 LTS**.
2. Pick the **$5/mo** bundle (or the free trial bundle).
3. Create, then click the instance → **Connect using SSH** (browser terminal).

### Option B — EC2 (free tier `t3.micro`)
1. EC2 → **Launch instance** → AMI **Ubuntu Server 22.04 (free tier eligible)**, type **t3.micro**.
2. Create/download an SSH **key pair**, allow **SSH (22)** and **Custom TCP 3000** from `0.0.0.0/0` in the security group.
3. Launch, then connect:
   ```bash
   ssh -i ~/Downloads/your-key.pem ubuntu@<SERVER_PUBLIC_IP>
   ```

---

## 2. Install Docker (run on the server)
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker   # apply group without logging out
```

## 3. Clone the repo
```bash
git clone https://github.com/ssenkula-rivan/ai-meeting.git
cd ai-meeting
```

## 4. Create the production `.env` (this file is gitignored — secrets stay on the server)
```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```
Set these values inside it:
```
NODE_ENV=production
DB_HOST=postgres        # the compose service name, NOT localhost
DB_PORT=5432
DB_NAME=meeting_ai
DB_USER=postgres
DB_PASSWORD=postgres    # change for real production
JWT_SECRET=<a long random string>
OPENAI_API_KEY=sk-...
STORAGE_PROVIDER=local
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASSWORD=re_...
MAIL_FROM=onboarding@resend.dev   # or your verified domain sender
REDIS_ENABLED=false
```
Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 5. Build and start the stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Watch logs if anything looks off:
```bash
docker compose -f docker-compose.prod.yml logs -f api
```

## 6. Verify it's live
From your laptop or the server:
```bash
curl http://<SERVER_PUBLIC_IP>:3000/health
# → {"status":"ok","timestamp":"..."}
```

---

## 7. Point the apps at the live API
- **Web (Next.js):** set `NEXT_PUBLIC_API_URL=http://<SERVER_PUBLIC_IP>:3000` (or your domain) and deploy to Vercel.
- **Mobile (Expo):** on the login screen open **Server Settings** and enter `http://<SERVER_PUBLIC_IP>:3000`, then build with EAS.

## 8. Recommended next steps
- **Domain + HTTPS:** put the API behind a domain with TLS (e.g. Caddy or Nginx + Let's Encrypt). Browsers require HTTPS for microphone recording, so this matters before real use.
- **Email to any recipient:** verify a custom domain in Resend and update `MAIL_FROM`.
- **Backups:** snapshot the server or `pg_dump` the Postgres volume periodically.

## Updating later
```bash
cd ai-meeting
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes / honest caveats
- The Docker build has not been executed on this machine (Docker isn't installed locally), so the **first `--build` on the server is the real test**. If it errors, paste the log and I'll fix the Dockerfile.
- Free-tier `t3.micro` (1 GB RAM) can be tight during the Docker image build; if `npm ci` is killed, add swap or build on a larger instance.
