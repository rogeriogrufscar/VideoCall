const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors());

// --- CONEXÃO COM O BANCO (SUPABASE) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Diagnóstico de inicialização no log do Render
console.log("--- 🚀 INICIALIZANDO BACKEND ---");
console.log("Conexão Supabase:", process.env.DATABASE_URL ? "✅ OK" : "❌ FALTANDO");
console.log("Daily API Key:", process.env.DAILY_API_KEY ? "✅ OK" : "❌ FALTANDO");

// --- ROTA: CRIAR REUNIÃO ---
app.post('/create-room', async (req, res) => {
  const { durationMinutes = 30 } = req.body || {};
  const monthYear = new Date().toISOString().slice(0, 7); // Ex: "2026-01"
  const LIMITE_SEGURANCA = 9500;

  try {
    // 1. Verificar uso atual
    const statsRes = await pool.query(
      'SELECT total_minutes_consumed FROM monthly_stats WHERE month_year = $1',
      [monthYear]
    );

    const minutosConsumidos = statsRes.rows.length > 0 
      ? parseFloat(statsRes.rows[0].total_minutes_consumed) 
      : 0;

    // 2. Trava de segurança
    if (minutosConsumidos >= LIMITE_SEGURANCA) {
      console.log(`🚫 BLOQUEIO: Limite atingido (${minutosConsumidos} min)`);
      return res.status(403).json({ error: 'Limite mensal atingido.' });
    }

    // 3. Criar sala na Daily.co
    const exp = Math.floor(Date.now() / 1000) + (durationMinutes * 60);
    
    const roomRes = await axios.post('https://api.daily.co/v1/rooms', {
      privacy: 'public',
      properties: { 
        enable_chat: true,
        lang: 'pt',
        exp: exp 
      }
    }, { 
      headers: { 
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      } 
    });

    console.log(`✅ Sala criada com sucesso: ${roomRes.data.url}`);
    res.json({ url: roomRes.data.url });

  } catch (error) {
    console.error('❌ Erro ao criar sala:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao gerar sala de reunião' });
  }
});

// --- ROTA: WEBHOOK DA DAILY ---
app.post('/webhooks/daily', async (req, res) => {
  console.log("🔔 [WEBHOOK RECEBIDO]:", JSON.stringify(req.body));

  // 1. Ajuste: A Daily pode mandar 'type' ou 'event'
  const eventType = req.body.type || req.body.event;
  const payload = req.body.payload;

  if (eventType === 'meeting.ended') {
    // 2. Ajuste: Calcular duração (fim - início) caso o campo 'duration' não venha pronto
    const start = payload.start_ts;
    const end = payload.end_ts;
    const durationSeconds = payload.duration || (end - start) || 0;
    
    const minutesUsed = durationSeconds / 60;
    const monthYear = new Date().toISOString().slice(0, 7);
    const sessionId = payload.meeting_id || 'sem-id';

    console.log(`⏱️ Calculado: ${durationSeconds.toFixed(2)}s (${minutesUsed.toFixed(2)} min)`);

    try {
      // Registrar log individual
      try {
        await pool.query(
          `INSERT INTO usage_logs (duration_seconds, daily_session_id) VALUES ($1, $2)`,
          [durationSeconds, sessionId]
        );
      } catch (logErr) {
        console.warn('⚠️ Falha ao inserir usage_log:', logErr.message);
      }

      // Atualizar estatística mensal
      const updateRes = await pool.query(
        `INSERT INTO monthly_stats (month_year, total_minutes_consumed)
         VALUES ($1, $2)
         ON CONFLICT (month_year) 
         DO UPDATE SET 
            total_minutes_consumed = monthly_stats.total_minutes_consumed + $2,
            last_updated = NOW()
         RETURNING total_minutes_consumed`,
        [monthYear, minutesUsed]
      );
      
      console.log(`📈 [SUCESSO] +${minutesUsed.toFixed(2)} min registrados. Novo total: ${updateRes.rows[0].total_minutes_consumed}`);

    } catch (err) {
      console.error('❌ [ERRO NO BANCO]:', err.message);
    }
  }

  res.status(200).json({ received: true });
});

// --- ROTA: ESTATÍSTICAS (DASHBOARD) ---
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
    console.error('❌ Erro ao buscar stats:', err.message);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});