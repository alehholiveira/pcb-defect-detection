import { describe, it, expect } from 'vitest';
import { processImageBuffer } from '../../src/utils/imageUtils.js';

const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('imageUtils Unit Tests', () => {
  it('should extract dimensions and base64Data for valid PNG buffer', () => {
    const result = processImageBuffer(TINY_PNG_BUFFER, 'board.png');
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.base64Data).toContain('image/png;base64,');
  });

  it('should normalize jpg extension to jpeg MIME type', () => {
    const result = processImageBuffer(TINY_PNG_BUFFER, 'photo.jpg');
    expect(result.base64Data).toContain('image/jpeg;base64,');
  });

  it('should fallback dimensions if buffer is unparseable', () => {
    const invalidBuffer = Buffer.from('not an image');
    const result = processImageBuffer(invalidBuffer, 'corrupt.png');
    expect(result.width).toBe(800);
    expect(result.height).toBe(800);
  });
});
