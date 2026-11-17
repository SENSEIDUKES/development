FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY model.mjs prefetch.mjs server.mjs ./
# The model is fetched now, so a new server never waits for a download.
RUN node prefetch.mjs
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
