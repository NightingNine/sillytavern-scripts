type TimerHandle = ReturnType<typeof setTimeout>;
type ScheduleTimer = (callback: () => void, delay: number) => TimerHandle;
type CancelTimer = (handle: TimerHandle) => void;

export class AutoDismissTimer {
  readonly #durationMs: number;
  readonly #onElapsed: () => void;
  readonly #schedule: ScheduleTimer;
  readonly #cancelTimer: CancelTimer;
  #handle: TimerHandle | null = null;

  constructor(
    durationMs: number,
    onElapsed: () => void,
    schedule: ScheduleTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    cancelTimer: CancelTimer = (handle) => globalThis.clearTimeout(handle),
  ) {
    this.#durationMs = durationMs;
    this.#onElapsed = onElapsed;
    this.#schedule = schedule;
    this.#cancelTimer = cancelTimer;
  }

  restart(): void {
    this.cancel();
    this.#handle = this.#schedule(() => {
      this.#handle = null;
      this.#onElapsed();
    }, this.#durationMs);
  }

  cancel(): void {
    if (this.#handle === null) return;
    this.#cancelTimer(this.#handle);
    this.#handle = null;
  }
}
