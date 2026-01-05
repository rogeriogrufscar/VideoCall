const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const DAILY_API_KEY = process.env.DAILY_API_KEY;

// Rota para criar agendamento e sala
app.post('/create-meeting', async (req, res) => {
  const { startTime, durationMinutes } = req.body;

  try {
    // 1. [Lógica de Controle] Aqui verificaríamos no Banco de Dados:
    // const totalUsado = await db.getMonthlyMinutes();
    // if (totalUsado > 9900) return res.status(403).json({ error: "Limite atingido" });

    // 2. Cálculo dos Timestamps (Segundos desde 1970)
    const nbf = Math.floor(new Date(startTime).getTime() / 1000);
    const exp = nbf + (durationMinutes * 60);

    // 3. Chamada para a API da Daily para criar a sala
    const roomResponse = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        properties: {
          nbf: nbf,
          exp: exp,
          enable_chat: true,
          privacy: 'private', // Sala fechada para segurança
        },
      },
      { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
    );

    // 4. Gerar um Token de Acesso (para permitir entrada na sala privada)
    const tokenResponse = await axios.post(
      'https://api.daily.co/v1/meeting-tokens',
      {
        properties: {
          room_name: roomResponse.data.name,
          is_owner: true,
        },
      },
      { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
    );

    // 5. Retornar os dados para o Frontend
    res.json({
      url: roomResponse.data.url,
      token: tokenResponse.data.token,
      roomName: roomResponse.data.name
    });

  } catch (error) {
    console.error('Erro na Daily API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao criar reunião' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));