import { describe, it, expect } from 'vitest';
import { getInferences, getInferenceById, deleteInference, runInference } from '../../../services/inferenceService';
import { mockInferences } from '../../mocks/handlers';

describe('inferenceService Unit/Integration Tests (with MSW)', () => {
  it('should fetch paginated inferences list from API', async () => {
    const response = await getInferences({ page: 1, limit: 10 });
    expect(response).toBeDefined();
    expect(response.data).toEqual(mockInferences);
    expect(response.total).toBe(2);
  });

  it('should fetch single inference details by ID', async () => {
    const inference = await getInferenceById(1);
    expect(inference).toBeDefined();
    expect(inference.id).toBe(1);
    expect(inference.model_name).toBe('yolov8');
  });

  it('should delete inference by ID', async () => {
    await expect(deleteInference(1)).resolves.not.toThrow();
  });

  it('should send multipart prediction request successfully', async () => {
    const file = new File(['fake-image-content'], 'board.png', { type: 'image/png' });
    const response = await runInference([file], 'yolo11', 0.5);

    expect(response).toBeDefined();
    expect(response.inference_id).toBe(99);
    expect(response.images.length).toBe(1);
  });

  it('should throw validation error when runInference is called with invalid parameters', async () => {
    const file = new File(['text-file'], 'document.txt', { type: 'text/plain' });
    await expect(runInference([file], 'yolo11')).rejects.toThrow();
  });
});
