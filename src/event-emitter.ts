export type EventListener = (...args: any[]) => void;

export class EventEmitter {
  private events: Record<string, EventListener[]> = {};

  on(event: string, listener: EventListener): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(listener);

    return () => this.off(event, listener);
  }

  off(event: string, listener: EventListener): void {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(
      (registeredListener) => registeredListener !== listener
    );

    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;

    this.events[event].forEach((listener) => {
      listener(...args);
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}
