const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Conexão com o Banco (Supabase/PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Diagnóstico de inicialização
console.log("--- CONFIGURAÇÃO DO SERVIDOR ---");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ CONECTADO" : "❌ FALTANDO");
console.log("DAILY_API_KEY:", process.env.DAILY_API_KEY ? "✅ CONFIGURADA" : "❌ FALTANDO");
console.log("--------------------------------");

/**
 * ROTA: Criar Reunião
 * Alterada para /create-room para coincidir com o Frontend
 */
app.post('/create-room', async (req, res) => {
  const { startTime, durationMinutes = 30 } = req.body || {}; // Alterado para 30 minutos
  const monthYear = new Date().toISOString().slice(0, 7); 
  const LIMITE_SEGURANCA = 9500;

  try {
    // 1. Verificar uso atual no banco de dados
    const statsRes = await pool.query(
      'SELECT total_minutes_consumed FROM monthly_stats WHERE month_year = $1',
      [monthYear]
    );

    const minutosConsumidos = statsRes.rows.length > 0 
      ? parseFloat(statsRes.rows[0].total_minutes_consumed) 
      : 0;

    console.log(`[Verificação] Mês: ${monthYear} | Uso: ${minutosConsumidos.toFixed(2)} min`);

    // 2. Trava de segurança
    if (minutosConsumidos >= LIMITE_SEGURANCA) {
      console.log("🚫 Bloqueio: Limite de 9.500 minutos atingido.");
      return res.status(403).json({ error: 'Limite mensal de minutos atingido.' });
    }

    // 3. Configurar tempo de expiração da sala
    const agora = Math.floor(Date.now() / 1000);
    const nbf = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : agora;
    const exp = nbf + (durationMinutes * 60);

    // 4. Criar sala na Daily.co
// Dentro de app.post('/create-room')
    const roomRes = await axios.post('https://api.daily.co/v1/rooms', {
      privacy: 'public', // ✅ Mude para cá (fora de properties)
      properties: { 
        enable_chat: true,
        lang: 'pt'
        // Se quiser usar nbf ou exp, eles ficam aqui dentro
      }
    }, { 
      headers: { 
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      } 
    });

    console.log(`✅ Sala criada: ${roomRes.data.url}`);
    res.json({ url: roomRes.data.url });

  } catch (error) {
    console.error('❌ Erro ao criar sala:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro interno ao gerar sala de reunião' });
  }
});

/**
 * ROTA: Webhook da Daily
 * Recebe o evento de fim de reunião e atualiza o banco
 */
app.post('/webhooks/daily', async (req, res) => {
  const { event, payload } = req.body;

  if (event === 'meeting.ended') {
    const roomName = payload.room;
    const durationSeconds = payload.duration;
    const minutesUsed = durationSeconds / 60;
    const monthYear = new Date().toISOString().slice(0, 7);

    try {
      // Registrar log individual
      await pool.query(
        `INSERT INTO usage_logs (duration_seconds, daily_session_id) 
         VALUES ($1, $2)`,
        [durationSeconds, payload.meeting_id]
      );

      // Atualizar estatística mensal (Upsert)
      await pool.query(
        `INSERT INTO monthly_stats (month_year, total_minutes_consumed)
         VALUES ($1, $2)
         ON CONFLICT (month_year) 
         DO UPDATE SET total_minutes_consumed = monthly_stats.total_minutes_consumed + $2,
                       last_updated = NOW()`,
        [monthYear, minutesUsed]
      );
      
      console.log(`📈 [Webhook] +${minutesUsed.toFixed(2)} min registrados para ${monthYear}`);
    } catch (err) {
      console.error('❌ [Webhook Error]:', err.message);
    }
  }
  res.status(200).json({ received: true });
});

/**
 * ROTA: Estatísticas (Dashboard)
 */
app.get('/usage-stats', async (req, res) => {
  const monthYear = new Date().toISOString().slice(0, 7);
  try {
    const result = await pool.query(
      'SELECT total_minutes_consumed FROM monthly_stats WHERE month_year = $1',
      [monthYear]
    );
    const consumed = result.rows.length > 0 ? parseFloat(result.rows[0].total_minutes_consumed) : 0;
    res.json({ consumed, limit: 10000 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Inicialização
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`);
});