import { describe, it, expect, vi } from 'vitest';
import { PptxGenerator } from '../../src/utils/pptxGenerator.js';

describe('PptxGenerator Unit Tests', () => {
  it('should initialize presentation metadata correctly', () => {
    const generator = new PptxGenerator('2026-07-31');
    expect(generator.targetDate).toBe('2026-07-31');
    expect(generator.pres).toBeDefined();
    expect(generator.pres.title).toBe('Relatório de Inspeção - 2026-07-31');
  });

  it('should add a summary slide with defect details', () => {
    const generator = new PptxGenerator('2026-07-31');
    const stats = { totalInferences: 5, totalImages: 10, totalDefects: 2 };
    const defectSummary = { missing_hole: 1, short: 1 };

    expect(() => generator.addSummarySlide(stats, defectSummary)).not.toThrow();
  });

  it('should add an image slide with bounding box shapes and labels', () => {
    const generator = new PptxGenerator('2026-07-31');
    const dimensions = {
      width: 1000,
      height: 800,
      base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };
    const detections = [
      { class_name: 'missing_hole', confidence: 0.95, x1: 100, y1: 100, x2: 200, y2: 200 }
    ];

    expect(() => generator.addImageSlide('inf-123', 'board1.png', 1, dimensions, detections)).not.toThrow();
  });

  it('should generate a valid buffer', async () => {
    const generator = new PptxGenerator('2026-07-31');
    generator.addSummarySlide({ totalInferences: 0, totalImages: 0, totalDefects: 0 }, {});
    const buffer = await generator.generateBuffer();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
