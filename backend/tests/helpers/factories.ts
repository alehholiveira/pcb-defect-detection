import { Inference } from '../../src/models/Inference.js';
import { InferenceImage } from '../../src/models/InferenceImage.js';
import { Detection } from '../../src/models/Detection.js';
import { RecipientEmail } from '../../src/models/RecipientEmail.js';

export async function createTestInference(overrides: Partial<Inference> = {}) {
  return await Inference.create({
    model_name: overrides.model_name || 'yolo11',
    inference_time_ms: overrides.inference_time_ms ?? 120.5,
    total_detections: overrides.total_detections ?? 2,
    ...overrides,
  });
}

export async function createTestInferenceImage(inferenceId: number, overrides: Partial<InferenceImage> = {}) {
  return await InferenceImage.create({
    inference_id: inferenceId,
    image_name: overrides.image_name || 'pcb_test_01.jpg',
    total_detections: overrides.total_detections ?? 2,
    image_url: overrides.image_url || '/uploads/pcb_test_01.jpg',
    ...overrides,
  });
}

export async function createTestDetection(inferenceImageId: number, overrides: Partial<Detection> = {}) {
  return await Detection.create({
    inference_image_id: inferenceImageId,
    class_name: overrides.class_name || 'mouse_bite',
    confidence: overrides.confidence ?? 0.95,
    x1: overrides.x1 ?? 10.5,
    y1: overrides.y1 ?? 20.0,
    x2: overrides.x2 ?? 50.2,
    y2: overrides.y2 ?? 60.8,
    ...overrides,
  });
}

export async function createTestRecipientEmail(overrides: Partial<RecipientEmail> = {}) {
  return await RecipientEmail.create({
    email: overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
    ...overrides,
  });
}
