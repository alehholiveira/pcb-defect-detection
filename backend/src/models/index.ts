// Sequelize models barrel export & associations

import { Inference } from './Inference.js';
import { InferenceImage } from './InferenceImage.js';
import { Detection } from './Detection.js';

export function registerModels(): void {
  // --- Associations ---

  // Inference 1:N InferenceImage
  Inference.hasMany(InferenceImage, {
    foreignKey: 'inference_id',
    as: 'images',
  });
  InferenceImage.belongsTo(Inference, {
    foreignKey: 'inference_id',
    as: 'inference',
  });

  // InferenceImage 1:N Detection
  InferenceImage.hasMany(Detection, {
    foreignKey: 'inference_image_id',
    as: 'detections',
  });
  Detection.belongsTo(InferenceImage, {
    foreignKey: 'inference_image_id',
    as: 'inferenceImage',
  });

  console.log('📦 Models registered (Inference, InferenceImage, Detection).');
}

export { Inference, InferenceImage, Detection };
