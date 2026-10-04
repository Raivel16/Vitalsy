FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && chown -R node:node /app

ARG PORT=4200
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT}"]
