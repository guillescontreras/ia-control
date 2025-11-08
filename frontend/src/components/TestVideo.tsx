import React, { useRef, useEffect } from 'react';

const TestVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('Video test iniciado');
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };
    startVideo();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: 'red' }}>
      <h1>TEST VIDEO</h1>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '640px', height: '480px', border: '5px solid yellow' }}
      />
    </div>
  );
};

export default TestVideo;
