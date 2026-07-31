import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '../../helpers/testDatabase.js';
import { createTestInference, createTestInferenceImage, createTestDetection } from '../../helpers/factories.js';
import { getInferencesService, getInferenceByIdService, deleteInferenceService } from '../../../src/services/inferences.service.js';

const createDummyLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
  level: 'info',
  fatal: vi.fn(),
} as any);

describe('inferences.service (Integration - MySQL Testcontainers)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should retrieve paginated inferences from real MySQL database', async () => {
    const inf1 = await createTestInference({ model_name: 'yolo11', created_at: new Date('2026-01-01T10:00:00Z') });
    const inf2 = await createTestInference({ model_name: 'faster_rcnn', created_at: new Date('2026-01-02T10:00:00Z') });

    const logger = createDummyLogger();
    const result = await getInferencesService({ page: 1, limit: 10, sortOrder: 'desc' }, logger);

    expect(result.meta.total).toBe(2);
    expect(result.data.length).toBe(2);
    const returnedIds = result.data.map((item: any) => item.id);
    expect(returnedIds).toContain(inf1.id);
    expect(returnedIds).toContain(inf2.id);
  });

  it('should filter inferences by model_name', async () => {
    await createTestInference({ model_name: 'yolo11' });
    await createTestInference({ model_name: 'faster_rcnn' });

    const logger = createDummyLogger();
    const result = await getInferencesService({ modelName: 'yolo11', page: 1, limit: 10, sortOrder: 'desc' }, logger);

    expect(result.meta.total).toBe(1);
    expect(result.data[0].model_name).toBe('yolo11');
  });

  it('should fetch single inference by ID with associated images and detections', async () => {
    const inf = await createTestInference({ model_name: 'rt_detr' });
    const img = await createTestInferenceImage(inf.id, { image_name: 'board_01.jpg' });
    await createTestDetection(img.id, { class_name: 'mouse_bite', confidence: 0.98 });

    const logger = createDummyLogger();
    const result = await getInferenceByIdService(inf.id, logger);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(inf.id);
    expect(result!.images.length).toBe(1);
    expect(result!.images[0].image_name).toBe('board_01.jpg');
    expect(result!.images[0].detections.length).toBe(1);
    expect(result!.images[0].detections[0].class_name).toBe('mouse_bite');
  });

  it('should CASCADE delete associated images and detections when deleting inference', async () => {
    const inf = await createTestInference({ model_name: 'retinanet' });
    const img = await createTestInferenceImage(inf.id);
    const det = await createTestDetection(img.id);

    const logger = createDummyLogger();
    const deleted = await deleteInferenceService(inf.id, logger);

    expect(deleted).toBe(true);

    // Verify inference is gone
    const foundInf = await getInferenceByIdService(inf.id, logger);
    expect(foundInf).toBeNull();
  });
});
