# syntax=docker/dockerfile:1

# ─── Etap 1: build ────────────────────────────────────────────────
# Kompilacja TypeScriptu do JS. Ten etap ma pełne node_modules z @nestjs/cli,
# typescriptem i jestem — nic z tego nie trafi do finalnego obrazu.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Etap 2: runtime ──────────────────────────────────────────────
# Tu jest istotna różnica względem frontendu. Angular kompiluje się do
# statycznych plików i node_modules przestają być potrzebne. Backend Node
# POTRZEBUJE ich w runtime — ale tylko produkcyjnych.
# Dlatego nie kopiujemy node_modules z etapu build (byłyby z devDependencies),
# tylko instalujemy od nowa z --omit=dev.
FROM node:22-alpine AS runtime

WORKDIR /app

# NODE_ENV=production zmienia zachowanie wielu bibliotek (mniej logów,
# agresywniejsze cache) — ustaw je zanim cokolwiek się uruchomi.
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist

EXPOSE 3000

# Obraz node ma gotowego nieuprzywilejowanego użytkownika `node`.
# Domyślnie kontener działa jako root, co przy aplikacji wystawionej
# na sieć jest niepotrzebnym ryzykiem.
USER node

CMD ["node", "dist/main.js"]
