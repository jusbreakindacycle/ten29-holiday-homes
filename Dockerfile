FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV TEN29_ENVIRONMENT=staging
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -- --webpack

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TEN29_FFMPEG_PATH=/usr/bin/ffmpeg \
    TEN29_FFPROBE_PATH=/usr/bin/ffprobe \
    TEN29_HEIF_INFO_PATH=/usr/bin/heif-info \
    TEN29_HEIF_CONVERT_PATH=/usr/bin/heif-convert
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg libheif-examples libheif-plugin-libde265 \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nextjs \
 && useradd --system --uid 1001 --gid nextjs nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
