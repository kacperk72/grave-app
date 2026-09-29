# syntax=docker/dockerfile:1

# ─── Etap 1: build ────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

# --legacy-peer-deps jest tu konieczne i nie jest to kosmetyka.
# @asymmetrik/ngx-leaflet@17.0.0 deklaruje peerDependencies twardo przypięte
# do Angulara 17 ("@angular/common": "17"), a aplikacja stoi na Angularze 21.
# npm od wersji 7 traktuje takie konflikty jako błąd i przerywa instalację.
# Flaga przywraca zachowanie npm 6: peer deps są ostrzeżeniem, nie blokadą.
#
# To obejście, nie rozwiązanie. Dług do spłacenia osobno: ngx-leaflet nie jest
# już rozwijany pod nowe Angulary, więc albo trzeba go zastąpić, albo owinąć
# Leaflet własnym cienkim serwisem. Do czasu tej decyzji flaga zostaje —
# bez niej build w kontenerze nie przechodzi w ogóle.
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

# ─── Etap 2: runtime ──────────────────────────────────────────────
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# angular.json nie ustawia outputPath, więc builder @angular/build:application
# używa domyślnej ścieżki dist/<nazwa-projektu>/browser.
COPY --from=build /app/dist/grave-app-front/browser /usr/share/nginx/html

EXPOSE 80
