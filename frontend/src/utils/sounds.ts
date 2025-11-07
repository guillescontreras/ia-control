let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};

export const playAlertSound = () => {
  try {
    const ctx = getAudioContext();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    playTone(600, ctx.currentTime, 0.15);
    playTone(600, ctx.currentTime + 0.2, 0.15);
    playTone(600, ctx.currentTime + 0.4, 0.15);
  } catch (error) {
    console.error('Error playing alert sound:', error);
  }
};

let currentAudio: HTMLAudioElement | null = null;

export const speakText = async (text: string) => {
  try {
    // Detener audio anterior si existe
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Llamar a Lambda para generar audio con Polly
    const response = await fetch('https://bx2rwg4ogk.execute-api.us-east-1.amazonaws.com/prod/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error('Error generando audio:', response.status);
      return;
    }

    const data = await response.json();
    
    // Reproducir audio
    currentAudio = new Audio(data.audioUrl);
    currentAudio.play();
  } catch (error) {
    console.error('Error en text-to-speech:', error);
  }
};
