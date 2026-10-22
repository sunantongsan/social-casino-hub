FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci --omit=dev --workspace=@hub/server
COPY apps/server apps/server
COPY packages packages
ENV NODE_ENV=production
ENV PORT=3001
USER node
EXPOSE 3001
CMD ["node","apps/server/src/index.mjs"]
