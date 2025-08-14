const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://localhost';
const FILA_ENTRADA = 'fila.notificacao.entrada.analaura';  // substitua 'seunome' igual no index.js
const FILA_STATUS = 'fila.notificacao.status.analaura';

async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(FILA_ENTRADA, { durable: true });
    await channel.assertQueue(FILA_STATUS, { durable: true });

    console.log('Consumidor iniciado, aguardando mensagens...');

    channel.consume(FILA_ENTRADA, async (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        console.log('Mensagem recebida:', content);
        const { mensagemId, conteudoMensagem } = JSON.parse(content);

        // Simula processamento assíncrono (1-2 segundos)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        // Resultado aleatório: 80% sucesso, 20% falha
        const sucesso = Math.random() > 0.2;

        const statusMsg = {
          mensagemId,
          status: sucesso ? 'PROCESSADO_SUCESSO' : 'FALHA_PROCESSAMENTO',
        };

        // Publica status na fila de status
        channel.sendToQueue(FILA_STATUS, Buffer.from(JSON.stringify(statusMsg)), { persistent: true });
        console.log('Status publicado:', statusMsg);

        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('Erro no consumidor:', err);
  }
}

startConsumer();
