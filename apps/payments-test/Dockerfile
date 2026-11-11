FROM node:24-alpine
WORKDIR /app
# Only the backend's two dependencies; the source is bind-mounted by compose.
RUN npm install --no-save --no-package-lock hono @hono/node-server
COPY server ./server
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server/dev.ts"]
