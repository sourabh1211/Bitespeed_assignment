FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npx prisma db push

EXPOSE 3000

CMD ["npm", "start"]
