FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "index.js"]
