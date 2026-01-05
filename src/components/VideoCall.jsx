import React, { useState, useEffect } from 'react';
import { useDailyMeeting } from './useDailyMeeting';
import UsageDashboard from './UsageDashboard';

const VideoCall = () => {
  const [roomUrl, setRoomUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState(null);

  const { videoElementRef, meetingState, initCall } = useDailyMeeting(roomUrl, accessToken);

  const handleCreateRoom = async () => {
    try {
      setError(null);

      // 1. Definimos a URL base: 
      // Se existir uma variável de ambiente, usa ela. Se não, usa localhost.
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // 2. Usamos a variável na chamada fetch
      const response = await fetch(`${API_BASE_URL}/create-room`, {
        method: 'POST',
      });

    // ... restante do seu código igual

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sala');
      }

      const data = await response.json();
      setRoomUrl(data.url);
      setAccessToken(data.token || '');
    } catch (err) {
      console.error("Erro na requisição:", err);
      setError(err.message);
    }
  };

  // AJUSTE: Efeito para garantir que a DIV existe antes de iniciar o vídeo
  useEffect(() => {
    if (roomUrl && videoElementRef.current) {
      // Pequeno delay de 100ms para o React terminar de montar o DOM
      const timer = setTimeout(() => {
        initCall();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [roomUrl, initCall, videoElementRef]);

  return (
    <div className="main-layout" style={{ maxWidth: '1000px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif' }}>
      
      <UsageDashboard />

      <div style={{ marginTop: '20px' }}>
        
        {/* TELA INICIAL */}
        {!roomUrl && (
          <div style={{ textAlign: 'center', padding: '50px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
            <h2>Pronto para começar?</h2>
            <p>Clique no botão abaixo para gerar uma sala segura.</p>
            <button 
              onClick={handleCreateRoom}
              style={{ 
                padding: '15px 40px', fontSize: '18px', backgroundColor: '#22c55e', 
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              🚀 Iniciar Nova Reunião
            </button>
            {error && <p style={{ color: '#ef4444', marginTop: '15px' }}>{error}</p>}
          </div>
        )}

        {/* TELA DE VÍDEO */}
        {roomUrl && (
          <div className="video-container" style={{ width: '100%' }}>
            {meetingState === 'joining' && (
              <p style={{ textAlign: 'center', color: '#666' }}>Iniciando câmera e microfone...</p>
            )}
            
            {/* AJUSTE: Altura fixa com vh para garantir visibilidade em qualquer tela */}
            <div 
              ref={videoElementRef} 
              style={{ 
                width: '100%', 
                height: '70vh', // Ocupa 70% da altura da visão do usuário
                minHeight: '500px', 
                borderRadius: '12px', 
                overflow: 'hidden',
                background: '#1a1a1a', // Preto leve para o fundo
                display: meetingState === 'left' ? 'none' : 'block',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }} 
            />

            {meetingState === 'left' && (
              <div className="end-screen" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h2>A reunião terminou</h2>
                <button 
                  onClick={() => window.location.reload()}
                  style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
                >
                  Voltar ao início
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;