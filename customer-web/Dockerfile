# Build from repo root so packages/design-tokens workspace is available.
# Use slim (Debian) instead of Alpine so Next.js sharp and other native optional deps work.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages packages
COPY customer-web customer-web
COPY admin-web admin-web
COPY shop shop

RUN npm ci

WORKDIR /app/customer-web

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
