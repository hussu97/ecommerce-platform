# Build from repo root so packages/design-tokens workspace is available.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages packages
COPY customer-web customer-web
COPY admin-web admin-web
COPY shop shop

RUN npm ci

WORKDIR /app/admin-web

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
