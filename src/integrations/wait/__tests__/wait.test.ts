import { afterEach, expect, test } from 'bun:test';
import { type WaitStatus, websocket } from '..';

class FakeSocket {
  static last: FakeSocket;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeSocket.last = this;
  }
  close() {
    this.closed = true;
    this.onclose?.(); // a real socket reports the close
  }
}

const realWebSocket = globalThis.WebSocket;
afterEach(() => {
  globalThis.WebSocket = realWebSocket;
});

const open = () => {
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  const seen: WaitStatus[] = [];
  const stop = websocket('ws://x', { timeout: 0 }).subscribe(
    (s) => seen.push(s),
    { values: {}, signal: new AbortController().signal },
  );
  return { seen, stop, socket: FakeSocket.last };
};

test('an unknown status fails instead of waiting for the timeout', () => {
  const { seen, socket } = open();
  socket.onmessage?.({ data: JSON.stringify({ status: 'in_progress' }) });
  expect(seen).toEqual([{ status: 'failed' }]);
});

test('a socket that closes before a final status fails once', () => {
  const { seen, socket } = open();
  socket.onclose?.();
  socket.onerror?.();
  expect(seen).toEqual([{ status: 'failed' }]);
});

test('closing after success or on unsubscribe is not a failure', () => {
  const done = open();
  done.socket.onmessage?.({ data: JSON.stringify({ status: 'success' }) });
  expect(done.seen).toEqual([{ status: 'success' }]);

  const left = open();
  left.stop();
  expect(left.seen).toEqual([]);
});
