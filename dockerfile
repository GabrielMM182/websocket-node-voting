# Usa uma imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos necessários
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante do código para o contêiner
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
