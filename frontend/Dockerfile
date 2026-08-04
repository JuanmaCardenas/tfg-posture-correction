# ===================== Etapa 1: compilar Angular =====================
FROM node:22 AS build
WORKDIR /app

# Dependencias primero (capa cacheable)
COPY package.json package-lock.json ./
RUN npm ci

# Código y build de producción → dist/frontend/browser, con apiUrl '/api'
COPY . .
RUN npm run build

# ===================== Etapa 2: servir con Caddy =====================
FROM caddy:2-alpine AS runtime

# Configuración de Caddy: sirve la SPA + proxy de /api + HTTPS automático
COPY Caddyfile /etc/caddy/Caddyfile

# Estáticos compilados de Angular (incluye el modelo de MediaPipe de public/)
COPY --from=build /app/dist/frontend/browser /srv

EXPOSE 80 443
