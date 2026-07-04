FROM node:22-alpine
WORKDIR /app
COPY server.js .
ENV HOST=0.0.0.0
EXPOSE 3456
CMD ["node", "server.js"]
