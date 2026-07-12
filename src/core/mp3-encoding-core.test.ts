import { describe, expect, it } from 'vitest';
import { encodePcmToMp3, float32ToInt16, peakNormalize } from './mp3-encoding-core.ts';

describe('peakNormalize', () => {
  it('scales quiet audio up so the cross-channel peak reaches the target', () => {
    const left = new Float32Array([0.05, -0.1, 0.08]);
    const right = new Float32Array([0.02, 0.04, -0.06]);

    const factor = peakNormalize([left, right], 0.9);

    // 全チャンネル横断のピークは left の -0.1 → 0.9 になる係数
    expect(factor).toBeCloseTo(9, 5);
    expect(left[1]).toBeCloseTo(-0.9, 5);
    // 同一係数が両チャンネルに適用され、相対バランスは保たれる
    expect(right[0]).toBeCloseTo(0.18, 5);
  });

  it('attenuates hot audio down to the target peak', () => {
    const ch = new Float32Array([0.5, -1.5, 1.0]);

    const factor = peakNormalize([ch], 0.9);

    expect(factor).toBeCloseTo(0.6, 5);
    expect(ch[1]).toBeCloseTo(-0.9, 5);
  });

  it('leaves silent buffers untouched (no divide-by-zero)', () => {
    const ch = new Float32Array([0, 0, 0]);

    const factor = peakNormalize([ch], 0.9);

    expect(factor).toBe(1);
    expect(Array.from(ch)).toEqual([0, 0, 0]);
  });

  it('does nothing when target peak is non-positive', () => {
    const ch = new Float32Array([0.1, 0.2]);

    expect(peakNormalize([ch], 0)).toBe(1);
    expect(ch[0]).toBeCloseTo(0.1, 6);
    expect(ch[1]).toBeCloseTo(0.2, 6);
  });
});

describe('float32ToInt16', () => {
  it('clamps and scales float32 samples to int16', () => {
    const input = new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]);
    const result = float32ToInt16(input);

    expect(Array.from(result)).toEqual([
      -32768,
      -32768,
      -16384,
      0,
      16383,
      32767,
      32767,
    ]);
  });
});

describe('encodePcmToMp3', () => {
  it('encodes by chunks, reports progress, and merges encoded bytes', () => {
    const progress: number[] = [];
    const chunkSamples: Array<{ left: number[]; right: number[] }> = [];

    const result = encodePcmToMp3({
      leftChannel: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
      rightChannel: new Float32Array([-0.1, -0.2, -0.3, -0.4, -0.5]),
      sampleRate: 44100,
      bitrate: 128,
      chunkSize: 2,
      onProgress: (percent) => progress.push(percent),
      encoderFactory: () => ({
        encodeBuffer: (left, right) => {
          chunkSamples.push({
            left: Array.from(left),
            right: Array.from(right),
          });
          return [left.length, right.length];
        },
        flush: () => [9, 9],
      }),
    });

    expect(chunkSamples).toHaveLength(3);
    expect(chunkSamples[0].left).toHaveLength(2);
    expect(chunkSamples[1].left).toHaveLength(2);
    expect(chunkSamples[2].left).toHaveLength(1);
    expect(progress).toEqual([40, 80, 100]);
    expect(Array.from(result)).toEqual([2, 2, 2, 2, 1, 1, 9, 9]);
  });

  it('returns only flush result when encodeBuffer emits empty chunks', () => {
    const result = encodePcmToMp3({
      leftChannel: new Float32Array([0.1, 0.2]),
      rightChannel: new Float32Array([0.1, 0.2]),
      sampleRate: 44100,
      bitrate: 128,
      chunkSize: 1,
      encoderFactory: () => ({
        encodeBuffer: () => [],
        flush: () => [4, 5, 6],
      }),
    });

    expect(Array.from(result)).toEqual([4, 5, 6]);
  });
});
