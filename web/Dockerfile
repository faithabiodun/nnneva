# The Nnneva web app.
#
# Built in three stages so the runtime image carries no build tooling and no
# devDependencies: deps installs, builder compiles, runner holds only the
# standalone output.
#
# AWS's mirror of the official image rather than Docker Hub directly: Hub rate
# limits anonymous pulls per source IP, which fails builds on shared CI egress.
FROM public.ecr.aws/docker/library/node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci needs the lockfile to match package.json exactly, which is what makes
# the build reproducible.
RUN npm ci

FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next reads NEXT_TELEMETRY_DISABLED at build time.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user. The standalone server needs no write access to its
# own files, so nothing here is owned by the runtime user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# public/ and .next/static are not inside the standalone bundle; the server
# expects to find them at these paths.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
