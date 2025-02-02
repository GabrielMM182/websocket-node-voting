const express = require("express");
const mongoose = require("mongoose");
const { WebSocketServer } = require("ws");
const Redis = require("ioredis");
const User = require("./models/User");
const VoteHistory = require("./models/VoteHistory");

const app = express();
const PORT = 3000;

// Conectar ao MongoDB
mongoose
  .connect("mongodb://localhost:27017/voting", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB conectado"));

// Criar conexão com Redis
const redis = new Redis({
  host: "localhost",
  port: 6379,
});

// Criando o servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// Criando o servidor WebSocket
const wss = new WebSocketServer({ server });

let votingClosed = false; // Indica se a votação foi encerrada

/**
 * Obtém a contagem de votos atual do Redis.
 */
async function getVotes() {
  const votesA = (await redis.get("votes:A")) || 0;
  const votesB = (await redis.get("votes:B")) || 0;
  return { A: parseInt(votesA), B: parseInt(votesB) };
}

/**
 * Obtém os últimos 10 votos do MongoDB.
 */
async function getLastVotes() {
  return await VoteHistory.find().sort({ timestamp: -1 }).limit(10);
}

/**
 * Atualiza a contagem de votos no Redis e registra no MongoDB.
 */
async function updateVote(userId, vote) {
  const user = await User.findOne({ userId });
  if (!user) throw new Error("Usuário não encontrado");

  const previousVote = await redis.get(`user:${userId}`);

  // Se já votou diferente antes, remover o voto anterior
  if (previousVote && previousVote !== vote) {
    await redis.decr(`votes:${previousVote}`);
  }

  // Se não votou ou mudou, adicionar o novo voto
  if (!previousVote || previousVote !== vote) {
    await redis.incr(`votes:${vote}`);
    await redis.set(`user:${userId}`, vote);

    // Salvar no MongoDB
    await VoteHistory.create({
      userId,
      name: user.name,
      city: user.city,
      vote,
    });
  }
}

async function canVote(userId) {
  const lastVoteTime = await redis.get(`lastVoteTime:${userId}`);
  const currentTime = Date.now();
  const cooldown = 5000; // 5 segundos

  if (lastVoteTime && currentTime - lastVoteTime < cooldown) {
    return false;
  }

  await redis.set(`lastVoteTime:${userId}`, currentTime);
  return true;
}


/**
 * Broadcast: Atualiza clientes com votos e histórico.
 */
async function broadcastUpdates() {
  const votes = await getVotes();
  const lastVotes = await getLastVotes();
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(
        JSON.stringify({ type: "update", votes, lastVotes, votingClosed })
      );
    }
  });

  if (votes.A + votes.B >= 100) {
    votingClosed = true;
    const winner = votes.A > votes.B ? "A" : votes.B > votes.A ? "B" : "Empate";
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "end", winner, votes }));
      }
    });
    console.log(`Votação encerrada! Vencedor: ${winner}`);
  }
}

// Evento ao conectar no WebSocket
wss.on("connection", async (ws) => {
  console.log("Novo cliente conectado");

  // Enviar estado inicial para o cliente
  ws.send(
    JSON.stringify({
      type: "update",
      votes: await getVotes(),
      lastVotes: await getLastVotes(),
      votingClosed,
    })
  );

  // Escuta mensagens enviadas pelo cliente
  ws.on("message", async (message) => {
    if (votingClosed) {
      ws.send(JSON.stringify({ type: "error", message: "Votação encerrada" }));
      return;
    }

    try {
      const { userId, vote } = JSON.parse(message);

      if (!userId) {
        ws.send(
          JSON.stringify({ type: "error", message: "É necessário um userId" })
        );
        return;
      }

      if (vote !== "A" && vote !== "B") {
        ws.send(JSON.stringify({ type: "error", message: "Voto inválido" }));
        return;
      }

      // Valida se o usuário está votando rápido demais
      if (!(await canVote(userId))) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Você só pode votar a cada 5 segundos",
          })
        );
        return;
      }

      // Verifica se o usuário está repetindo o mesmo voto
      const previousVote = await redis.get(`user:${userId}`);
      if (previousVote === vote) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Você já votou nesta opção",
          })
        );
        return;
      }

      await updateVote(userId, vote);
      await broadcastUpdates();
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });

  ws.on("close", () => console.log("Cliente desconectado"));
});

// Criar um endpoint para cadastrar usuários
app.use(express.json());
app.post("/register", async (req, res) => {
  try {
    const { name, city } = req.body;
    if (!name || !city) {
      return res.status(400).json({ error: "Nome e cidade são obrigatórios" });
    }

    const newUser = await User.create({ name, city }); // `userId` será gerado automaticamente
    res
      .status(201)
      .json({ message: "Usuário cadastrado com sucesso", user: newUser });
  } catch (error) {
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

// Criar um endpoint para obter todos os usuários cadastrados
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Erro ao obter usuários" });
  }
});

