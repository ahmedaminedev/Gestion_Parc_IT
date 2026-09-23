// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  dataUrlToFile,
  SUPPORTED_BARCODE_FORMATS,
  isNativeBarcodeDetectorSupported,
  playBarcodeBeep,
  decodeBarcodeFromImage,
  detectBarcodeRealtime
} from '../services/barcodeService';

describe('Barcode High Performance Service Tests', () => {
  it('supports major 1D and 2D inventory formats', () => {
    expect(SUPPORTED_BARCODE_FORMATS.length).toBeGreaterThanOrEqual(10);
  });

  it('converts dataURL to standard File object properly', () => {
    // 1x1 transparent PNG data url
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const file = dataUrlToFile(dataUrl, 'test_barcode.png');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test_barcode.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBeGreaterThan(0);
  });

  it('runs playBarcodeBeep without error in browser environments', () => {
    expect(() => playBarcodeBeep()).not.toThrow();
  });

  it('gracefully checks native BarcodeDetector API capability', () => {
    const supported = isNativeBarcodeDetectorSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('handles empty or blank image decoding gracefully', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await decodeBarcodeFromImage(dataUrl);
    expect(res).toBeNull();
  });

  it('handles realtime frame detection when video is not ready yet', async () => {
    const mockCanvas = document.createElement('canvas');
    const mockVideo = document.createElement('video');
    const res = await detectBarcodeRealtime(mockVideo, mockCanvas);
    expect(res).toBeNull();
  });
});
