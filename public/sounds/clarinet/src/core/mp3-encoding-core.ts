import { Mp3Encoder } from '@breezystack/lamejs';
import { MP3_CHUNK_SIZE } from './constants.ts';

interface Mp3EncoderLike {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array | Uint8Array | number[];
  flush(): Int8Array | Uint8Array | number[];
}

export interface EncodePcmOptions {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  sampleRate: number;
  bitrate: number;
  onProgress?: (percent: number) => void;
  chunkSize?: number;
  encoderFactory?: (channels: number, sampleRate: number, bitrate: number) => Mp3EncoderLike;
}

/**
 * 複数チャンネルをまとめてピーク正規化する（in-place）。
 * 全チャンネル横断の絶対最大値を targetPeak に合わせる同一係数を全サンプルへ適用し、
 * チャンネル間・パート間の相対バランス（ステレオ像やミックス比）は保つ。
 *
 * @returns 実際に適用したスケール係数（無音時は 1）
 */
export function peakNormalize(channels: Float32Array[], targetPeak: number): number {
  if (targetPeak <= 0) return 1;
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      const abs = Math.abs(channel[i]);
      if (abs > peak) peak = abs;
    }
  }
  // 完全な無音（またはチャンネルなし）はスケールしない（0除算回避）
  if (peak === 0) return 1;

  const factor = targetPeak / peak;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      channel[i] *= factor;
    }
  }
  return factor;
}

/** Float32Array → Int16Array 変換（-1.0〜1.0 → -32768〜32767） */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16;
}

/** Stereo PCMをMP3バイト列へエンコードする（Worker非依存） */
export function encodePcmToMp3(options: EncodePcmOptions): Uint8Array {
  const {
    leftChannel,
    rightChannel,
    sampleRate,
    bitrate,
    onProgress,
    chunkSize = MP3_CHUNK_SIZE,
    encoderFactory = (channels, rate, kbps) => new Mp3Encoder(channels, rate, kbps),
  } = options;

  const encoder = encoderFactory(2, sampleRate, bitrate);
  const leftInt16 = float32ToInt16(leftChannel);
  const rightInt16 = float32ToInt16(rightChannel);

  const mp3Chunks: Uint8Array[] = [];
  const totalSamples = leftInt16.length;
  let offset = 0;

  while (offset < totalSamples) {
    const end = Math.min(offset + chunkSize, totalSamples);
    const leftChunk = leftInt16.subarray(offset, end);
    const rightChunk = rightInt16.subarray(offset, end);

    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) {
      mp3Chunks.push(new Uint8Array(encoded));
    }

    offset = end;
    onProgress?.(Math.round((offset / totalSamples) * 100));
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    mp3Chunks.push(new Uint8Array(flushed));
  }

  const totalLength = mp3Chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const mp3Data = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of mp3Chunks) {
    mp3Data.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return mp3Data;
}
