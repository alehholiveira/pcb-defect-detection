// Sequelize models barrel export & associations

import { Inference } from './Inference.js';
import { InferenceImage } from './InferenceImage.js';
import { Detection } from './Detection.js';
import { SystemSetting } from './SystemSetting.js';
import { RecipientEmail } from './RecipientEmail.js';

/**
 * Registers all Sequelize models and defines their relationships.
 * 
 * Association Graph:
 * Inference (1) <---> (N) InferenceImage (1) <---> (N) Detection
 * 
 * Deletion Behavior:
 * Both `InferenceImage` and `Detection` have `onDelete: 'CASCADE'` set in their migrations.
 * This means deleting an `Inference` will automatically cascade and delete all associated
 * `InferenceImage` records, which in turn cascades to all their associated `Detection` records.
 */
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

  console.log('📦 Models registered (Inference, InferenceImage, Detection, SystemSetting, RecipientEmail).');
}

export { Inference, InferenceImage, Detection, SystemSetting, RecipientEmail };
