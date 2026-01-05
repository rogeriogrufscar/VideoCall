import { useState, useCallback, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';

export const useDailyMeeting = (roomUrl, accessToken) => {
  const [meetingState, setMeetingState] = useState('new');
  const videoElementRef = useRef(null);
  const callFrameRef = useRef(null);

  const initCall = useCallback(() => {
    // Se não houver URL ou a chamada já tiver iniciado, não faz nada
    if (!roomUrl || callFrameRef.current) return;

    // Cria a interface da Daily dentro da sua div
    const frame = DailyIframe.createFrame(videoElementRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px'
      },
      showLeaveButton: true,
    });

    callFrameRef.current = frame;

    // Gerencia os estados da reunião
    frame
      .on('joining-meeting', () => setMeetingState('joining'))
      .on('joined-meeting', () => setMeetingState('joined'))
      .on('left-meeting', () => setMeetingState('left'));

    // Entra na sala
    frame.join({ url: roomUrl, token: accessToken });
  }, [roomUrl, accessToken]);

  return {
    videoElementRef,
    meetingState,
    initCall,
  };
};