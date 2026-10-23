# Một container chạy cả máy chủ API và giao diện đã build. Dữ liệu (SQLite) nằm ở /data, cần gắn ổ đĩa bền vững vào đó.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY data ./data
RUN npm ci
RUN node node_modules/vite/bin/vite.js build apps/web

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/data/probability-lab.db
COPY --from=build /app ./
RUN mkdir -p /data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/tsx/dist/cli.mjs", "apps/server/src/index.ts"]
