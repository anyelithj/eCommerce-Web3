import { EventEmitter, on } from "node:events";
import { logger } from "../middleware/logger.middleware";

export class TypedEventBus<Events extends Record<string, unknown>> {
  private readonly emitter = new EventEmitter();

  constructor(private readonly name: string) {
    this.emitter.setMaxListeners(50);
  }

  public emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    this.emitter.emit(event, payload);
  }

  public on<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => Promise<void> | void): void {
    this.emitter.on(event, (payload: Events[K]) => {
      Promise.resolve()
        .then(() => handler(payload))
        .catch((error: unknown) => logger.error("event_handler_failed", { bus: this.name, event, error }));
    });
  }

  public async *iterate<K extends keyof Events & string>(event: K): AsyncGenerator<Events[K]> {
    for await (const [payload] of on(this.emitter, event)) yield payload as Events[K];
  }
}
