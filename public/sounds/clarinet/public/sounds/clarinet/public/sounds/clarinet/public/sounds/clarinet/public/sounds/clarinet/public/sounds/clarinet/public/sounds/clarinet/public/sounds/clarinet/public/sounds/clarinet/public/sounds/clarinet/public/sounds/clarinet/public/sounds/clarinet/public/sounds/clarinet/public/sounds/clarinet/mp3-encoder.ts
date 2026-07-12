/**
 * core/mp3-encoder.ts — Web Worker通信ラッパー
 * Worker (mp3-encoder.worker.ts) を管理し、Promise APIを提供する
 */

import type { EncodeRequest, WorkerMessage } from './types.ts';
import { DEFAULT_MP3_BITRATE } from './constants.ts';

/**
 * AudioBuffer を MP3 の Blob に変換する
 * MP3エンコードはWeb Workerで実行し、メインスレッドをブロックしない
 *
 * @param audioBuffer - レンダリング済みAudioBuffer
 * @param bitrate - MP3ビットレート (kbps) デフォルト128
 * @param onProgress - 進捗コールバック (0-100)
 * @returns MP3データのBlob
 */
export async function encodeToMp3(
  audioBuffer: AudioBuffer,
  bitrate: number = DEFAULT_MP3_BITRATE,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // new URL パターン（Viteの静的解析が必須）
    const worker = new Worker(
      new URL('../workers/mp3-encoder.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const leftChannel = audioBuffer.getChannelData(0);
    // モノラルの場合は左チャンネルを右にも使う
    const rightChannel = audioBuffer.numberOfChannels > 1
      ? audioBuffer.getChannelData(1)
      : audioBuffer.getChannelData(0);

    // Transferableで転送するため、コピーを作成
    const leftCopy = new Float32Array(leftChannel);
    const rightCopy = new Float32Array(rightChannel);

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.percent);
          break;
        case 'complete':
          worker.terminate();
          resolve(new Blob([msg.mp3Data.buffer as ArrayBuffer], { type: 'audio/mpeg' }));
          break;
        case 'error':
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message}`));
    };

    const request: EncodeRequest = {
      type: 'encode',
      leftChannel: leftCopy,
      rightChannel: rightCopy,
      sampleRate: audioBuffer.sampleRate,
      bitrate,
    };

    // Transferable で転送（コピー回避）
    worker.postMessage(request, [leftCopy.buffer, rightCopy.buffer]);
  });
}
