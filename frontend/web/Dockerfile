FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src
# VITE_REVERB_APP_PUBLIC es la clave publica del cliente Reverb. VITE_* se resuelven en tiempo de build (alertas en tiempo real, RNF-01).
ARG VITE_REVERB_APP_PUBLIC=""
ARG VITE_REVERB_HOST=""
ARG VITE_REVERB_PORT=""
ARG VITE_REVERB_SCHEME=""
ENV VITE_REVERB_APP_PUBLIC=${VITE_REVERB_APP_PUBLIC} \
    VITE_REVERB_HOST=${VITE_REVERB_HOST} \
    VITE_REVERB_PORT=${VITE_REVERB_PORT} \
    VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}
RUN npm run build && chown -R node:node /app

ARG PORT=4200
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
