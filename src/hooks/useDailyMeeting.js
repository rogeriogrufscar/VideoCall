import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';

export const useDailyMeeting = (url, token) => {
  const [callFrame, setCallFrame] = useState(null);
  const [meetingState, setMeetingState] = useState('new'); // new, joining, joined, left
  const videoElementRef = useRef(null);

  const initCall = useCallback(() => {
    if (!url || !videoElementRef.current) return;

    const frame = DailyIframe.createFrame(videoElementRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px',
      },
      showLeaveButton: true,
    });

    frame
      .on('joining-meeting', () => setMeetingState('joining'))
      .on('joined-meeting', () => setMeetingState('joined'))
      .on('left-meeting', () => {
        setMeetingState('left');
        frame.destroy();
      });

    frame.join({ url, token });
    setCallFrame(frame);
  }, [url, token]);

  const leaveCall = () => {
    if (callFrame) callFrame.leave();
  };

  return {
    videoElementRef,
    meetingState,
    leaveCall,
    initCall
  };
};