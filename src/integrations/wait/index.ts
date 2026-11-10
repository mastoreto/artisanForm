export type WaitStatus =
  | { status: 'pending'; message?: string }
  | { status: 'success'; data?: unknown }
  | { status: 'failed'; message?: string };

export interface WaitContext {
  values: Record<string, unknown>;
  /** Aborted when the step unmounts or the user leaves it. */
  signal: AbortSignal;
}

/**
 * How a `pending` step finds out that something finished. Implement it to use
 * any mechanism; `subscribe` reports statuses and returns a cleanup function.
 */
export interface WaitStrategy {
  subscribe: (
    onStatus: (status: WaitStatus) => void,
    ctx: WaitContext,
  ) => () => void;
}

/** Calls `check` every `interval` ms (growing by `backoff`) until it settles. */
export const polling = (
  check: (ctx: WaitContext) => Promise<WaitStatus>,
  {
    interval = 2000,
    timeout = 120_000,
    backoff = 1,
    timeoutMessage,
  }: {
    interval?: number;
    timeout?: number;
    backoff?: number;
    timeoutMessage?: string;
  } = {},
): WaitStrategy => ({
  subscribe: (onStatus, ctx) => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = interval;
    const started = Date.now();
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
    };
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started > timeout) {
        stop();
        return onStatus({ status: 'failed', message: timeoutMessage });
      }
      try {
        const result = await check(ctx);
        if (stopped) return;
        onStatus(result);
        if (result.status !== 'pending') return stop();
      } catch (e) {
        if (stopped) return;
        stop();
        return onStatus({
          status: 'failed',
          message: e instanceof Error ? e.message : undefined,
        });
      }
      delay *= backoff;
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 0);
    return stop;
  },
});

const STATUSES = new Set<string>(['pending', 'success', 'failed']);

const toStatus = (raw: string): WaitStatus => {
  try {
    const parsed = JSON.parse(raw) as WaitStatus;
    if (parsed && typeof parsed.status === 'string')
      // An unknown status would leave the step waiting until the timeout.
      return STATUSES.has(parsed.status) ? parsed : { status: 'failed' };
  } catch {
    // fall through: plain text is treated as a progress message
  }
  return { status: 'pending', message: raw };
};

type Url = string | ((values: Record<string, unknown>) => string);
const resolveUrl = (url: Url, values: Record<string, unknown>) =>
  typeof url === 'function' ? url(values) : url;

interface StreamOptions {
  /** Turn a raw message into a status (default: JSON `{ status, … }`). */
  parse?: (raw: string) => WaitStatus;
  timeout?: number;
}

const withTimeout = (
  onStatus: (s: WaitStatus) => void,
  timeout: number | undefined,
  close: () => void,
) => {
  if (!timeout) return () => {};
  const timer = setTimeout(() => {
    close();
    onStatus({ status: 'failed' });
  }, timeout);
  return () => clearTimeout(timer);
};

/** Server-Sent Events: each message is a status (JSON by default). */
export const sse = (
  url: Url,
  { parse = toStatus, timeout = 120_000 }: StreamOptions = {},
): WaitStrategy => ({
  subscribe: (onStatus, { values }) => {
    const source = new EventSource(resolveUrl(url, values));
    const stopTimer = withTimeout(onStatus, timeout, () => source.close());
    source.onmessage = (e) => {
      const status = parse(String(e.data));
      onStatus(status);
      if (status.status !== 'pending') {
        stopTimer();
        source.close();
      }
    };
    source.onerror = () => {
      stopTimer();
      source.close();
      onStatus({ status: 'failed' });
    };
    return () => {
      stopTimer();
      source.close();
    };
  },
});

/** WebSocket: each message is a status (JSON by default). */
export const websocket = (
  url: Url,
  { parse = toStatus, timeout = 120_000 }: StreamOptions = {},
): WaitStrategy => ({
  subscribe: (onStatus, { values }) => {
    const socket = new WebSocket(resolveUrl(url, values));
    // Closing it ourselves (final status, timeout, unsubscribe) is not a failure.
    let finished = false;
    const stopTimer = withTimeout(onStatus, timeout, () => {
      finished = true;
      socket.close();
    });
    const fail = () => {
      if (finished) return;
      finished = true;
      stopTimer();
      onStatus({ status: 'failed' });
    };
    socket.onmessage = (e) => {
      const status = parse(String(e.data));
      onStatus(status);
      if (status.status !== 'pending') {
        finished = true;
        stopTimer();
        socket.close();
      }
    };
    socket.onerror = fail;
    socket.onclose = fail;
    return () => {
      finished = true;
      stopTimer();
      socket.close();
    };
  },
});

/** You decide when it is done: call `resolve`/`fail` (e.g. from your own webhook handler). */
export const callback = () => {
  const listeners = new Set<(s: WaitStatus) => void>();
  let last: WaitStatus | undefined;
  const emit = (status: WaitStatus) => {
    last = status;
    for (const l of listeners) l(status);
  };
  const strategy: WaitStrategy = {
    subscribe: (onStatus) => {
      listeners.add(onStatus);
      if (last) onStatus(last);
      return () => {
        listeners.delete(onStatus);
      };
    },
  };
  return {
    strategy,
    update: (message?: string) => emit({ status: 'pending', message }),
    resolve: (data?: unknown) => emit({ status: 'success', data }),
    fail: (message?: string) => emit({ status: 'failed', message }),
  };
};
