const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const port = 3000;

const RABBITMQ_URL = 'amqp://localhost';
const FILA_ENTRADA = 'fila.notificacao.entrada.analaura'; 
const FILA_STATUS = 'fila.notificacao.status.analaura';

app.use(cors());
app.use(bodyParser.json());

let channel;
const statusMap = new Map();  // Armazena status das mensagens em memória

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(FILA_ENTRADA, { durable: true });
    await channel.assertQueue(FILA_STATUS, { durable: true });
    console.log('Conectado ao RabbitMQ e filas criadas.');
  } catch (error) {
    console.error('Erro ao conectar no RabbitMQ:', error);
  }
}

app.post('/api/notificar', async (req, res) => {
  const { mensagemId, conteudoMensagem } = req.body;

  if (!mensagemId || !conteudoMensagem || conteudoMensagem.trim() === '') {
    return res.status(400).json({ error: 'mensagemId e conteudoMensagem são obrigatórios' });
  }

  try {
    const mensagem = JSON.stringify({ mensagemId, conteudoMensagem });
    channel.sendToQueue(FILA_ENTRADA, Buffer.from(mensagem), { persistent: true });
    statusMap.set(mensagemId, 'AGUARDANDO PROCESSAMENTO'); // status inicial
    res.status(202).json({ mensagemId, status: 'Recebido e publicado para processamento' });
  } catch (err) {
    console.error('Erro ao publicar na fila:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Endpoint para retornar status da mensagem pelo mensagemId
app.get('/api/notificacao/status/:mensagemId', (req, res) => {
  const { mensagemId } = req.params;
  if (!statusMap.has(mensagemId)) {
    return res.status(404).json({ error: 'MensagemId não encontrado' });
  }
  res.json({ mensagemId, status: statusMap.get(mensagemId) });
});

const server = app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
  connectRabbitMQ();
});

// Consumidor da fila de entrada para atualizar o status no Map
async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const consumerChannel = await connection.createChannel();

    await consumerChannel.assertQueue(FILA_ENTRADA, { durable: true });

    consumerChannel.consume(FILA_ENTRADA, async (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        const { mensagemId, conteudoMensagem } = JSON.parse(content);

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        const sucesso = Math.random() > 0.2;
        const status = sucesso ? 'PROCESSADO_SUCESSO' : 'FALHA_PROCESSAMENTO';

        // Atualiza o status no Map
        statusMap.set(mensagemId, status);

        consumerChannel.ack(msg);
      }
    });
  } catch (err) {
    console.error('Erro no consumidor:', err);
  }
}

startConsumer();
