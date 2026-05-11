FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm install -g .

CMD ["jira-mcp"]
