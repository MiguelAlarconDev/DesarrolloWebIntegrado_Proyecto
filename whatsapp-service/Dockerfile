# Imagen de whatsapp-service (Node + Chromium para whatsapp-web.js).
# Necesita un volumen persistente en /data para no perder la sesion de WhatsApp.
FROM node:20-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates wget \
 && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WWEBJS_DATA_PATH=/data/.wwebjs_auth \
    NODE_ENV=production \
    PORT=8085
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:8085/health || exit 1
CMD ["node", "src/index.js"]
