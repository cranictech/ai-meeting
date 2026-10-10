# Deploying Meeti to AWS EC2

Backend (API + Postgres + audio uploads) in Docker on one small AWS server with
a persistent disk, so the local-storage transcription pipeline works unchanged.

> Status: deployed and verified live on a free-tier t3.micro (Ubuntu 22.04,
> us-east-1). /health returns ok; register/login/auth-me work end-to-end.

## Why the build is runtime-only

The target is a 1 GB box. Compiling the API with tsc inside the container
exceeds RAM and aborts (SIGABRT, exit 134) even with swap. So the Dockerfile
does NOT run tsc: compile TypeScript locally, copy the built dist into the
build context, and the image only runs npm ci --omit=dev and starts
apps/api/dist/index.js. Never ship your laptop's node_modules (bcrypt is native).

## Prerequisites

- An AWS account with an IAM user that has AmazonEC2FullAccess +
  AmazonVPCFullAccess attached (no permissions boundary).
- AWS CLI v2 installed locally and configured (verify: aws sts get-caller-identity).
- A local checkout of this repo with Node 20 and npm workspaces working.

## 1. Provision the instance (once)

Create a key pair, a security group opening 22/80/443/3000, and launch a
free-tier t3.micro running Ubuntu 22.04 in us-east-1. Save the private key and
chmod 400. Pick the newest Ubuntu AMI with
reverse(sort_by(Images,&CreationDate))[0].ImageId (the max_by JMESPath form
errors on CLI v2).

## 2. Install Docker + swap on the server

SSH in as ubuntu@PUBLIC_IP. Create a 2 GB swapfile (helps Postgres + Node
coexist in 1 GB), then: apt-get install -y docker.io docker-compose-v2 git.

## 3. Clone the repo and set environment

Clone the repo to ~/ai-meeting. Create apps/api/.env with: a fresh JWT_SECRET
(openssl rand -hex 64), DB_NAME=meeting_ai, STORAGE_PROVIDER=local,
REDIS_ENABLED=false, and your OpenAI / SMTP secrets. Do not commit this file.

## 4. Build dist locally and ship it

On your laptop, compile the two packages that the runtime image needs:

    npm run build -w @meeti/database
    npm run build -w @meeti/api

Then rsync the built dist directories to the server's repo. The runtime-only
Dockerfile expects apps/api/dist and packages/database/dist to be present in
the build context.

## 5. Build and start containers

On the server:

    cd ~/ai-meeting
    docker compose -f docker-compose.prod.yml up -d --build

The image build is fast (no tsc). Postgres and the API come up; the API
listens on 0.0.0.0:3000.

## 6. Verify

    curl http://localhost:3000/health
    curl -X POST http://localhost:3000/auth/register \
      -H 'content-type: application/json' \
      -d '{"email":"you@example.com","password":"secret123"}'

Routes are mounted WITHOUT an /api prefix (/auth, /meetings, /health).

## 7. HTTPS + Elastic IP (recommended next)

A bare IP cannot get a Let's Encrypt certificate. Point a real domain (or a
free DuckDNS hostname) at an Elastic IP, then run Caddy as a reverse proxy in
front of the API on port 3000; Caddy handles automatic TLS. Allocate the
Elastic IP only after the DNS record is ready (public IPv4 incurs a small
hourly charge once allocated).

## Updating the deployment

Rebuild dist locally, rsync to the server, then
docker compose -f docker-compose.prod.yml up -d --build. Named volumes (pgdata,
uploads) persist data across rebuilds.

## Caveats

- Do not reintroduce a multi-stage / build-in-container Dockerfile on this box;
  it OOMs at 1 GB.
- Keep dist out of .dockerignore (the runtime image needs it).
- The Next.js web frontend is NOT hosted on this box (1 GB is too tight); it
  runs on Cloudflare Workers via OpenNext (see below). The API is served at
  https://api.meeti.org.uk through Caddy + Let's Encrypt (Elastic IP
  44.214.64.190).

## Web frontend (Next.js on Cloudflare Workers via OpenNext)

The web app is fully client-rendered (all pages are client components; auth
uses a Bearer token in localStorage, not cookies; data comes from
https://api.meeti.org.uk which sends Access-Control-Allow-Origin: *). Static
export is NOT possible because of the /dashboard/meetings/[id] dynamic routes
(client components cannot export generateStaticParams), so the real Next.js
server runs on Cloudflare Workers via @opennextjs/cloudflare.

Version pin: Next.js 14.2.35 requires @opennextjs/cloudflare@1.15.x (1.16.0+
dropped Next 14). wrangler is a devDependency. Config files live in apps/web:
wrangler.jsonc, open-next.config.ts, public/_headers, .dev.vars.

Build + preview locally (on the laptop, never on the 1 GB server):

    cd apps/web
    NEXT_PUBLIC_API_URL=https://api.meeti.org.uk npx opennextjs-cloudflare build
    npx opennextjs-cloudflare preview   # serves http://localhost:8787

Verified locally: / , /login , /register render 200, and the dynamic routes
/dashboard/meetings/<id> and /dashboard/meetings/<id>/record render 200.

Deploy to Cloudflare (needs a one-time Cloudflare login):

    cd apps/web
    npx wrangler login
    NEXT_PUBLIC_API_URL=https://api.meeti.org.uk npx opennextjs-cloudflare build
    npx opennextjs-cloudflare deploy

This creates a workers.dev URL. To serve meeti.org.uk, add a custom domain for
the meeti-web Worker (Cloudflare dashboard > Workers & Pages > meeti-web >
Settings > Domains > Add > meeti.org.uk); Cloudflare issues TLS automatically
because DNS is already on Cloudflare.

