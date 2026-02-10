# Build from repo root so all workspaces (customer-web, admin-web, shop) are available.
# Use slim (Debian) so optional native deps install correctly.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY customer-web customer-web
COPY admin-web admin-web
COPY shop shop

RUN npm ci

WORKDIR /app/admin-web

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
