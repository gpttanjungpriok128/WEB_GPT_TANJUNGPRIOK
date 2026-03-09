FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# Run migrations before starting the server
CMD ["sh", "-c", "npm run migrate && node server.js"]
