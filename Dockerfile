# Meeti API — production image (Express + Postgres client + local uploads)
# Multi-stage: build the TypeScript monorepo, then run only the compiled API.

FROM node:20-slim AS build
WORKDIR /repo
# Copy the whole workspace (a .dockerignore keeps out node_modules, .env, etc.)
COPY . .
# Install all workspace dependencies and link @meeti/database
RUN npm ci
# Build the shared database package, then the API
RUN npm run build -w @meeti/database && npm run build -w @meeti/api

FROM node:20-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
# Runtime needs: root manifest, node_modules, the built database package, and the built API
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/database/package.json ./packages/database/package.json
COPY --from=build /repo/packages/database/dist ./packages/database/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
# Uploads directory (mount a persistent volume here in production)
RUN mkdir -p /repo/uploads
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
