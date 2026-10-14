FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_* se resuelven en tiempo de build (alertas en tiempo real, RNF-01).
ARG VITE_REVERB_APP_KEY=""
ARG VITE_REVERB_HOST=""
ARG VITE_REVERB_PORT=""
ARG VITE_REVERB_SCHEME=""
ENV VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY} \
    VITE_REVERB_HOST=${VITE_REVERB_HOST} \
    VITE_REVERB_PORT=${VITE_REVERB_PORT} \
    VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}
RUN npm run build && chown -R node:node /app

ARG PORT=4200
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
