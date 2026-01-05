import React, { useEffect } from 'react';
import { useDailyMeeting } from './useDailyMeeting';

const VideoCall = ({ roomUrl, accessToken }) => {
  const { videoElementRef, meetingState, initCall } = useDailyMeeting(roomUrl, accessToken);

  useEffect(() => {
    initCall();
  }, [initCall]);

  return (
    <div className="video-container" style={{ height: '80vh', width: '100%' }}>
      {meetingState === 'joining' && <p>Conectando à chamada...</p>}
      
      {/* O container onde o Daily Prebuilt será injetado */}
      <div 
        ref={videoElementRef} 
        style={{ width: '100%', height: '100%', display: meetingState === 'left' ? 'none' : 'block' }} 
      />

      {meetingState === 'left' && (
        <div className="end-screen">
          <h2>A reunião terminou</h2>
          <button onClick={() => window.location.reload()}>Voltar ao início</button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;