FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# As três primeiras SEMPRE precisam de algum valor (mesmo o genérico) — ver
# .env.example: index.html usa elas como texto puro (%VAR%), e sem a chave
# presente o Vite deixa o "%VAR%" literal no HTML publicado. Os defaults
# abaixo são os do deploy compartilhado/multi-tenant (o caso comum).
ARG VITE_API_URL
ARG VITE_EMPRESA_ID=""
ARG VITE_EMPRESA_LOGO_URL="/pwa-icon.svg"
ARG VITE_EMPRESA_SPLASH_BG="#ffffff"
ARG VITE_VAPID_PUBLIC_KEY=""
ARG VITE_EMPRESA_LOGO_192=""
ARG VITE_EMPRESA_COR_PRIMARIA=""
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_EMPRESA_ID=${VITE_EMPRESA_ID}
ENV VITE_EMPRESA_LOGO_URL=${VITE_EMPRESA_LOGO_URL}
ENV VITE_EMPRESA_SPLASH_BG=${VITE_EMPRESA_SPLASH_BG}
ENV VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}
ENV VITE_EMPRESA_LOGO_192=${VITE_EMPRESA_LOGO_192}
ENV VITE_EMPRESA_COR_PRIMARIA=${VITE_EMPRESA_COR_PRIMARIA}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
