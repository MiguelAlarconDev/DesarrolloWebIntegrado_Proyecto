# Frontend Angular servido con nginx (alternativa a Netlify, p. ej. en docker-compose)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
# API_URL se inyecta al arrancar el contenedor (config.js), sin recompilar
ENV API_URL=""
CMD ["sh", "-c", "printf 'window.__APP_CONFIG__ = {\"apiUrl\": \"%s\"};\\n' \"$API_URL\" > /usr/share/nginx/html/config.js && exec nginx -g 'daemon off;'"]
EXPOSE 80
