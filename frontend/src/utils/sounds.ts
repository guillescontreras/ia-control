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

export const speakText = (text: string) => {
  try {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech no soportado en este navegador');
      return;
    }

    // Cancelar cualquier speech en progreso
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Error en text-to-speech:', error);
  }
};
