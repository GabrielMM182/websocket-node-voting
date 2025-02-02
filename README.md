# websocket-node-voting
Estudo relembrando conceitos de mongo, websockets, redis,  mongodb e docker


📂 projeto-votacao
│── 📂 src
│   │── 📂 config
│   │   ├── db.js           # Configuração do MongoDB
│   │   ├── redis.js        # Configuração do Redis
│   │── 📂 models
│   │   ├── User.js         # Modelo do usuário
│   │   ├── VoteHistory.js  # Modelo do histórico de votos
│   │── 📂 services
│   │   ├── voteService.js  # Lógica de votação (Redis e MongoDB)
│   │── 📂 controllers
│   │   ├── userController.js  # Lida com registro de usuários
│   │   ├── voteController.js  # Lida com as votações
│   │── 📂 routes
│   │   ├── userRoutes.js  # Rotas para usuários
│   │   ├── voteRoutes.js  # Rotas para votos
│   │── 📂 websocket
│   │   ├── wsServer.js    # Configuração do WebSocket
│── 📂 docker
│   │   ├── Dockerfile     # Dockerfile para a aplicação
│   │   ├── docker-compose.yml  # Configuração para MongoDB e Redis
│── server.js              # Servidor principal Express e WebSocket
│── package.json           # Dependências do projeto
│── .env                   # Configurações sensíveis (Mongo URI, Redis Host)
