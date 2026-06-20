# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vite/React client ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: minimal Node server serving dist/ + /api ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
