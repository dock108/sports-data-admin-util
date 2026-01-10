FROM node:20.18-alpine AS base

# Install pnpm.
# Corepack signature verification has intermittently failed in CI/buildkit environments;
# install pnpm directly via npm to avoid keyid verification issues.
RUN npm install -g pnpm@9

WORKDIR /app

FROM base AS deps

# Copy workspace config and all package.json files
# Note: this repo does not commit pnpm-lock.yaml, so we cannot use --frozen-lockfile.
COPY pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
COPY packages/js-core/package.json ./packages/js-core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/ui-kit/package.json ./packages/ui-kit/

# Install dependencies (will create a lockfile inside the image)
RUN pnpm install

FROM deps AS build

# Copy source files
COPY packages ./packages
COPY web/tsconfig.json web/next.config.ts web/next-env.d.ts ./web/
COPY web/src ./web/src
COPY web/public ./web/public

WORKDIR /app/web
ENV NEXT_IGNORE_BUILD_ERRORS=true
RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

# Copy workspace config (see note above about pnpm-lock.yaml)
COPY pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
COPY packages/js-core/package.json ./packages/js-core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/ui-kit/package.json ./packages/ui-kit/

# Install production dependencies only
RUN pnpm install --prod

# Copy built assets
COPY --from=build /app/web/.next ./web/.next
COPY --from=build /app/web/public ./web/public
COPY --from=build /app/packages ./packages

WORKDIR /app/web

RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["pnpm", "start"]
