import { AsyncLocalStorage } from 'async_hooks';

/**
 * Ambient execution context for propagating search cancellation AbortSignals
 * seamlessly through all provider calls without discarding signals.
 */
export const activeSignalContext = new AsyncLocalStorage<AbortSignal>();

let isFetchHookInstalled = false;

/**
 * Installs ambient fetch hook so that any fetch() call performed by providers
 * honors the propagated cancellation signal immediately.
 */
export function ensureAmbientFetchHook(): void {
  if (isFetchHookInstalled) return;
  isFetchHookInstalled = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const ambientSignal = activeSignalContext.getStore();
    if (!ambientSignal) {
      return originalFetch(input, init);
    }

    if (ambientSignal.aborted) {
      return Promise.reject(new Error('The operation was aborted'));
    }

    if (!init?.signal) {
      return originalFetch(input, { ...init, signal: ambientSignal });
    }

    // Combine ambient abort signal with provider's internal timeout signal
    let combinedSignal: AbortSignal;
    if (typeof (AbortSignal as any).any === 'function') {
      combinedSignal = (AbortSignal as any).any([ambientSignal, init.signal]);
    } else {
      const ctrl = new AbortController();
      const onAbort = () => ctrl.abort();
      if (ambientSignal.aborted || init.signal.aborted) {
        ctrl.abort();
      } else {
        ambientSignal.addEventListener('abort', onAbort, { once: true });
        init.signal.addEventListener('abort', onAbort, { once: true });
      }
      combinedSignal = ctrl.signal;
    }

    return originalFetch(input, { ...init, signal: combinedSignal });
  };
}

// Automatically install on module load
ensureAmbientFetchHook();
