# Meeti API — RUNTIME-ONLY image.
#
# Why not a multi-stage in-container build? The free-tier deploy target is a 1 GB
# EC2 (t3.micro), and `tsc` for the API exceeds that RAM and aborts with SIGABRT
# (exit 134) even with swap. So we compile TypeScript OUTSIDE this image and ship
# the prebuilt `dist`, then install only production dependencies here.
#
# Build flow (see DEPLOY.md):
#   1. locally:  npm run build -w @meeti/database && npm run build -w @meeti/api
#   2. copy apps/api/dist and packages/database/dist into the build context
#   3. docker compose -f docker-compose.prod.yml up -d --build
#
# NOTE: do NOT copy host node_modules into the image (native modules such as
# bcrypt are compiled per-OS); npm ci installs Linux binaries here instead.

FROM node:20-slim
WORKDIR /repo
ENV NODE_ENV=production

# Full monorepo source (a .dockerignore excludes node_modules, .env, etc.).
# `dist` is intentionally INCLUDED so the prebuilt output ships.
COPY . .

# Install production dependencies for all workspaces (no dev tools, no tsc).
RUN npm ci --omit=dev

# Uploads directory (mount a persistent volume here in production).
RUN mkdir -p /repo/uploads

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
