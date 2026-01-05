// 1. IMPORTAÇÕES (Sempre no topo)
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg'); // Importação do Banco de Dados
require('dotenv').config();

const app = express();

// 2. MIDDLEWARES
app.use(express.json());
app.use(cors());

// 3. CONFIGURAÇÃO DO BANCO DE DADOS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DAILY_API_KEY = process.env.DAILY_API_KEY;

// 4. ROTAS
// Substitua a rota anterior por esta versão completa:
app.post('/create-meeting', async (req, res) => {
  const { title, hostId, guestId, startTime, durationMinutes } = req.body;

  try {
    // Cálculo de timestamps
    const nbf = Math.floor(new Date(startTime).getTime() / 1000);
    const exp = nbf + (durationMinutes * 60);

    // Chamada para a Daily
    const roomRes = await axios.post('https://api.daily.co/v1/rooms', {
      properties: { nbf, exp, privacy: 'private' }
    }, { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } });

    const tokenRes = await axios.post('https://api.daily.co/v1/meeting-tokens', {
      properties: { room_name: roomRes.data.name, is_owner: true }
    }, { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } });

    // PERSISTÊNCIA NO BANCO
    const queryText = `
      INSERT INTO meetings (title, host_id, guest_id, start_time, end_time, daily_room_name, daily_room_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const values = [
      title, hostId, guestId, 
      new Date(startTime), 
      new Date(new Date(startTime).getTime() + durationMinutes * 60000), 
      roomRes.data.name, 
      roomRes.data.url
    ];
    
    await pool.query(queryText, values);

    res.json({ url: roomRes.data.url, token: tokenRes.data.token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar agendamento' });
  }
});

// 5. INICIALIZAÇÃO DO SERVIDOR (Sempre no final)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));