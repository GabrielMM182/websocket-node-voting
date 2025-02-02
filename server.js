const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = 3000;

// Criando um servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// Criando o servidor WebSocket
const wss = new WebSocketServer({ server });

// Armazena a contagem de votos
const votes = { A: 0, B: 0 };
let votingClosed = false; // Indica se a votação foi encerrada

/**
 * Broadcast: Envia uma mensagem para todos os clientes conectados.
 * @param {Object} message - Objeto JSON com a mensagem a ser enviada.
 */
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado');

  // Enviar estado inicial da votação para o cliente
  ws.send(JSON.stringify({ type: 'update', votes, votingClosed }));

  // Escuta mensagens enviadas pelo cliente
  ws.on('message', (message) => {
    if (votingClosed) {
      ws.send(JSON.stringify({ type: 'error', message: 'Votação encerrada' }));
      return;
    }

    try {
      const { vote } = JSON.parse(message);

      if (vote !== 'A' && vote !== 'B') {
        ws.send(JSON.stringify({ type: 'error', message: 'Voto inválido' }));
        return;
      }

      votes[vote] += 1; // Incrementa o voto

      // Envia a atualização para todos os clientes
      broadcast({ type: 'update', votes });

      // Se atingir 100 votos, encerra a votação
      if (votes.A + votes.B >= 100) {
        votingClosed = true;
        const winner = votes.A > votes.B ? 'A' : votes.B > votes.A ? 'B' : 'Empate';

        broadcast({ type: 'end', winner, votes });
        console.log(`Votação encerrada! Vencedor: ${winner}`);
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensagem inválido' }));
    }
  });

  // Quando um cliente desconectar
  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});
