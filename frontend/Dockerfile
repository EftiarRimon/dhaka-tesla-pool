FROM node:20-alpine
WORKDIR /app
# next.config.mjs reads API_URL at build time to wire the /api proxy.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]