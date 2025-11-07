const sharp = require('sharp');

class MotionDetector {
  constructor(threshold = 60, minChangedPixels = 1500) {
    this.previousFrame = null;
    this.threshold = threshold;
    this.minChangedPixels = minChangedPixels;
    this.frameCount = 0;
    this.motionCount = 0;
  }

  async detectMotion(frameBuffer) {
    try {
      this.frameCount++;
      
      // Convertir a escala de grises, aplicar blur y redimensionar
      const currentFrame = await sharp(frameBuffer)
        .resize(320, 240)
        .blur(1.5) // Reducir ruido de cámara
        .greyscale()
        .raw()
        .toBuffer();

      if (!this.previousFrame) {
        this.previousFrame = currentFrame;
        console.log(`[Motion] Frame inicial establecido`);
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

      const hasMotion = changedPixels > this.minChangedPixels;
      const changePercent = ((changedPixels / currentFrame.length) * 100).toFixed(2);
      
      if (hasMotion) {
        this.motionCount++;
        console.log(`[Motion] ✅ DETECTADO - Pixels cambiados: ${changedPixels} (${changePercent}%)`);
      } else {
        console.log(`[Motion] ⏭️  Sin movimiento - Pixels cambiados: ${changedPixels} (${changePercent}%)`);
      }
      
      // Log estadísticas cada 20 frames
      if (this.frameCount % 20 === 0) {
        const motionRate = ((this.motionCount / this.frameCount) * 100).toFixed(1);
        console.log(`[Motion] 📊 Stats: ${this.motionCount}/${this.frameCount} frames con movimiento (${motionRate}%)`);
      }

      return hasMotion;
    } catch (error) {
      console.error('[Motion] ❌ Error detecting motion:', error);
      return true; // En caso de error, procesar el frame
    }
  }

  reset() {
    this.previousFrame = null;
  }
}

module.exports = MotionDetector;
