/**
 * workers/mp3-encoder.worker.ts — MP3エンコード Web Worker
 * SPEC.md §3 準拠
 *
 * Float32Array PCM → MP3 Uint8Array に変換
 * lamejs (@breezystack/lamejs) を使用
 */

/// <reference lib="webworker" />

import { Mp3Encoder } from '@breezystack/lamejs';
import type { EncodeRequest, WorkerMessage } from '../core/types.ts';
import { MP3_CHUNK_SIZE, NORMALIZE_TARGET_PEAK } from '../core/constants.ts';
import { encodePcmToMp3, peakNormalize } from '../core/mp3-encoding-core.ts';

self.onmessage = (e: MessageEvent<EncodeRequest>) => {
  const { type, leftChannel, rightChannel, sampleRate, bitrate } = e.data;

  if (type !== 'encode') {
    self.postMessage({ type: 'error', message: `Unknown message type: ${type}` } satisfies WorkerMessage);
    return;
  }

  try {
    // 音源が低レベルなため、エンコード直前に出力を実用音量までピーク正規化する。
    // 左右まとめて同一係数でスケールし、ステレオ像とミックス比を保つ。
    peakNormalize([leftChannel, rightChannel], NORMALIZE_TARGET_PEAK);

    const mp3Data = encodePcmToMp3({
      leftChannel,
      rightChannel,
      sampleRate,
      bitrate,
      chunkSize: MP3_CHUNK_SIZE,
      encoderFactory: (channels, rate, kbps) => new Mp3Encoder(channels, rate, kbps),
      onProgress: (percent) => {
        self.postMessage({ type: 'progress', percent } satisfies WorkerMessage);
      },
    });

    // Transferable で転送（コピー回避）
    self.postMessage(
      { type: 'complete', mp3Data } satisfies WorkerMessage,
      [mp3Data.buffer]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message } satisfies WorkerMessage);
  }
};

export {};
