/**
 * Cancellation token for async operations
 * Based on microsoft/autogen CancellationToken
 */
export class CancellationToken {
  private _cancelled: boolean = false;
  private _callbacks: Array<() => void> = [];

  /**
   * Check if cancellation has been requested
   */
  get isCancelled(): boolean {
    return this._cancelled;
  }

  /**
   * Request cancellation
   */
  cancel(): void {
    if (this._cancelled) {
      return;
    }

    this._cancelled = true;

    // Execute all registered callbacks
    for (const callback of this._callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    }

    // Clear callbacks
    this._callbacks = [];
  }

  /**
   * Register a callback to be called when cancellation is requested
   */
  onCancelled(callback: () => void): void {
    if (this._cancelled) {
      // If already cancelled, execute immediately
      callback();
    } else {
      this._callbacks.push(callback);
    }
  }

  /**
   * Throw an error if cancellation has been requested
   */
  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error('Operation was cancelled');
    }
  }

  /**
   * Create an AbortSignal from this cancellation token
   */
  toAbortSignal(): AbortSignal {
    const controller = new AbortController();
    
    if (this._cancelled) {
      controller.abort();
    } else {
      this.onCancelled(() => controller.abort());
    }

    return controller.signal;
  }

  /**
   * Create a CancellationToken from an AbortSignal
   */
  static fromAbortSignal(signal: AbortSignal): CancellationToken {
    const token = new CancellationToken();
    
    if (signal.aborted) {
      token.cancel();
    } else {
      signal.addEventListener('abort', () => token.cancel());
    }

    return token;
  }
}
