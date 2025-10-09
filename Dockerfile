# build stage
FROM node:lts-alpine AS build-stage
# Set environment variables for non-interactive npm installs
ENV NPM_CONFIG_LOGLEVEL=warn
ENV CI=true
ENV VITE_GTAG_ENABLED=true
ENV VITE_GTAG_MEASUREMENT_ID=G-G87DWBF9TX
ENV VITE_USERCENTRICS_ENABLED=true
ENV VITE_USERCENTRICS_SETTINGS_ID=ed_jz6KAMS3U2X
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

# production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
