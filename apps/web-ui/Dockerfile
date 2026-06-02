FROM node:22-alpine AS build
WORKDIR /app
COPY apps/web-ui/package*.json ./
RUN npm ci --include=dev
COPY apps/web-ui ./
RUN npm run build

FROM nginx:1.31-alpine
RUN apk upgrade --no-cache libxml2 nghttp2-libs
ENV CAMPAIGN_API_UPSTREAM=http://campaign-api:8080
COPY apps/web-ui/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
