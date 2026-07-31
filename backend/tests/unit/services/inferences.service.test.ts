import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInference } = vi.hoisted(() => ({
  mockInference: {
    findAndCountAll: vi.fn(),
    findByPk: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock('../../../src/models/index.js', () => ({
  Inference: mockInference,
  InferenceImage: {},
  Detection: {},
}));

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

describe('inferences.service (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInferencesService', () => {
    it('should return paginated inferences result', async () => {
      const dummyRows = [
        { id: 1, model_name: 'yolo11', total_detections: 3 },
        { id: 2, model_name: 'faster_rcnn', total_detections: 1 },
      ];
      mockInference.findAndCountAll.mockResolvedValue({
        rows: dummyRows,
        count: 2,
      });

      const logger = createDummyLogger();
      const result = await getInferencesService({ page: 1, limit: 10, sortOrder: 'desc' }, logger);

      expect(result.data).toEqual(dummyRows);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
      expect(mockInference.findAndCountAll).toHaveBeenCalledOnce();
    });
  });

  describe('getInferenceByIdService', () => {
    it('should return single inference when found', async () => {
      const dummyInference = { id: 5, model_name: 'yolo11', images: [] };
      mockInference.findByPk.mockResolvedValue(dummyInference);

      const logger = createDummyLogger();
      const result = await getInferenceByIdService(5, logger);

      expect(result).toEqual(dummyInference);
      expect(mockInference.findByPk).toHaveBeenCalledWith(5, expect.any(Object));
    });

    it('should return null when inference is not found', async () => {
      mockInference.findByPk.mockResolvedValue(null);

      const logger = createDummyLogger();
      const result = await getInferenceByIdService(999, logger);

      expect(result).toBeNull();
    });
  });

  describe('deleteInferenceService', () => {
    it('should return true when inference is deleted', async () => {
      mockInference.destroy.mockResolvedValue(1);

      const logger = createDummyLogger();
      const result = await deleteInferenceService(5, logger);

      expect(result).toBe(true);
      expect(mockInference.destroy).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('should return false when inference to delete is not found', async () => {
      mockInference.destroy.mockResolvedValue(0);

      const logger = createDummyLogger();
      const result = await deleteInferenceService(999, logger);

      expect(result).toBe(false);
    });
  });
});
