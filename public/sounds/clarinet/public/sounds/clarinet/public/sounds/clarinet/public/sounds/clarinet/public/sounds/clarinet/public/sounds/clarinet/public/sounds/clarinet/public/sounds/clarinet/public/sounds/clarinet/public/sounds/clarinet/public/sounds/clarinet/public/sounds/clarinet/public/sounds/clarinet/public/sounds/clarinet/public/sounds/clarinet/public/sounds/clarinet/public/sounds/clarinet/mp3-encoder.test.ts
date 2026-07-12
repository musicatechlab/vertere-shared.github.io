import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeToMp3 } from './mp3-encoder.ts';

type WorkerMessageHandler = ((event: MessageEvent) => void) | null;
type WorkerErrorHandler = ((event: ErrorEvent) => void) | null;

class MockWorker {
  onmessage: WorkerMessageHandler = null;
  onerror: WorkerErrorHandler = null;
  terminated = false;
  postedMessages: Array<{ payload: unknown; transfer: Transferable[] | undefined }> = [];

  postMessage(payload: unknown, transfer?: Transferable[]): void {
    this.postedMessages.push({ payload, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

interface MockAudioBuffer {
  numberOfChannels: number;
  sampleRate: number;
  getChannelData: (channel: number) => Float32Array;
}

function makeAudioBuffer(channels: Float32Array[], sampleRate = 44100): MockAudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    getChannelData: (channel: number) => channels[channel],
  };
}

describe('encodeToMp3', () => {
  const originalWorker = globalThis.Worker;
  let workers: MockWorker[] = [];

  afterEach(() => {
    workers = [];
    globalThis.Worker = originalWorker;
  });

  it('posts encode request, reports progress, and resolves mp3 blob', async () => {
    const progress = vi.fn();

    globalThis.Worker = vi.fn(() => {
      const worker = new MockWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    }) as unknown as typeof Worker;

    const left = new Float32Array([0.1, 0.2]);
    const right = new Float32Array([0.3, 0.4]);
    const audioBuffer = makeAudioBuffer([left, right], 48000);

    const pending = encodeToMp3(audioBuffer as unknown as AudioBuffer, 192, progress);
    const worker = workers[0];

    expect(worker.postedMessages).toHaveLength(1);
    const posted = worker.postedMessages[0];
    const request = posted.payload as {
      type: string;
      leftChannel: Float32Array;
      rightChannel: Float32Array;
      sampleRate: number;
      bitrate: number;
    };
    expect(request.type).toBe('encode');
    expect(request.sampleRate).toBe(48000);
    expect(request.bitrate).toBe(192);
    expect(request.leftChannel).not.toBe(left);
    expect(request.rightChannel).not.toBe(right);
    expect(request.leftChannel[0]).toBeCloseTo(0.1, 6);
    expect(request.leftChannel[1]).toBeCloseTo(0.2, 6);
    expect(request.rightChannel[0]).toBeCloseTo(0.3, 6);
    expect(request.rightChannel[1]).toBeCloseTo(0.4, 6);
    expect(posted.transfer).toEqual([request.leftChannel.buffer, request.rightChannel.buffer]);

    worker.emitMessage({ type: 'progress', percent: 55 });
    worker.emitMessage({ type: 'complete', mp3Data: new Uint8Array([1, 2, 3]) });

    const result = await pending;
    expect(progress).toHaveBeenCalledWith(55);
    expect(result.type).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(await result.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(worker.terminated).toBe(true);
  });

  it('duplicates left channel for mono audio input', async () => {
    globalThis.Worker = vi.fn(() => {
      const worker = new MockWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    }) as unknown as typeof Worker;

    const left = new Float32Array([0.5, -0.5]);
    const channelCalls: number[] = [];
    const audioBuffer: MockAudioBuffer = {
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: (channel) => {
        channelCalls.push(channel);
        return left;
      },
    };

    const pending = encodeToMp3(audioBuffer as unknown as AudioBuffer);
    const worker = workers[0];
    const request = worker.postedMessages[0].payload as {
      leftChannel: Float32Array;
      rightChannel: Float32Array;
    };

    expect(channelCalls).toEqual([0, 0]);
    expect(Array.from(request.rightChannel)).toEqual([0.5, -0.5]);

    worker.emitMessage({ type: 'complete', mp3Data: new Uint8Array([7]) });
    await expect(pending).resolves.toBeInstanceOf(Blob);
  });

  it('rejects when worker returns an error message', async () => {
    globalThis.Worker = vi.fn(() => {
      const worker = new MockWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    }) as unknown as typeof Worker;

    const audioBuffer = makeAudioBuffer([new Float32Array([0]), new Float32Array([0])]);
    const pending = encodeToMp3(audioBuffer as unknown as AudioBuffer);
    const worker = workers[0];

    worker.emitMessage({ type: 'error', message: 'encoding failed' });

    await expect(pending).rejects.toThrow('encoding failed');
    expect(worker.terminated).toBe(true);
  });

  it('rejects when worker runtime error occurs', async () => {
    globalThis.Worker = vi.fn(() => {
      const worker = new MockWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    }) as unknown as typeof Worker;

    const audioBuffer = makeAudioBuffer([new Float32Array([0]), new Float32Array([0])]);
    const pending = encodeToMp3(audioBuffer as unknown as AudioBuffer);
    const worker = workers[0];

    worker.emitError('boom');

    await expect(pending).rejects.toThrow('Worker error: boom');
    expect(worker.terminated).toBe(true);
  });
});
