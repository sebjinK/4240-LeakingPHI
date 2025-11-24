# ./Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./ 

RUN npm install

# Copy all source code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
