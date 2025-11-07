const sharp = require('sharp');

class MotionDetector {
  constructor(threshold = 30, minChangedPixels = 1000) {
    this.previousFrame = null;
    this.threshold = threshold;
    this.minChangedPixels = minChangedPixels;
  }

  async detectMotion(frameBuffer) {
    try {
      // Convertir a escala de grises y redimensionar para performance
      const currentFrame = await sharp(frameBuffer)
        .resize(320, 240)
        .greyscale()
        .raw()
        .toBuffer();

      if (!this.previousFrame) {
        this.previousFrame = currentFrame;
        return false;
      }

      // Calcular diferencia pixel por pixel
      let changedPixels = 0;
      for (let i = 0; i < currentFrame.length; i++) {
        const diff = Math.abs(currentFrame[i] - this.previousFrame[i]);
        if (diff > this.threshold) {
          changedPixels++;
        }
      }

      this.previousFrame = currentFrame;

      // Retornar true si hay suficiente movimiento
      return changedPixels > this.minChangedPixels;
    } catch (error) {
      console.error('Error detecting motion:', error);
      return true; // En caso de error, procesar el frame
    }
  }

  reset() {
    this.previousFrame = null;
  }
}

module.exports = MotionDetector;
