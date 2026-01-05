import React, { useState, useEffect } from 'react';

const UsageDashboard = () => {
  const [stats, setStats] = useState({ consumed: 0, limit: 10000 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca os dados do seu backend
    fetch('http://localhost:3001/usage-stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error("Erro ao carregar stats:", err));
  }, []);

  const percentage = Math.min((stats.consumed / stats.limit) * 100, 100).toFixed(1);

  // Define a cor da barra com base no consumo
  const getBarColor = () => {
    if (percentage < 50) return '#22c55e'; // Verde
    if (percentage < 85) return '#eab308'; // Amarelo
    return '#ef4444'; // Vermelho
  };

  if (loading) return <p>Carregando estatísticas...</p>;

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '12px', maxWidth: '400px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ marginTop: 0 }}>📊 Consumo do Plano</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>{stats.consumed} / {stats.limit} min</span>
        <strong>{percentage}%</strong>
      </div>

      {/* Barra de Fundo */}
      <div style={{ width: '100%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
        {/* Barra de Progresso Dinâmica */}
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          backgroundColor: getBarColor(), 
          transition: 'width 0.5s ease-in-out' 
        }} />
      </div>

      {percentage >= 95 && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px', fontWeight: 'bold' }}>
          ⚠️ Atenção: Limite de segurança atingido! Novas salas estão bloqueadas.
        </p>
      )}
    </div>
  );
};

export default UsageDashboard;