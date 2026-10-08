import { TypedEventBus } from "../../src/shared/util/event-bus.util";

jest.mock("../../src/shared/middleware/logger.middleware", () => ({
  logger: { error: jest.fn() },
}));

describe("TypedEventBus.iterate", () => {
  it("entrega los eventos publicados y libera el listener al cerrar", async () => {
    const bus = new TypedEventBus<{ ping: number }>("test");
    const iterator = bus.iterate("ping");
    setImmediate(() => {
      bus.emit("ping", 1);
      bus.emit("ping", 2);
    });
    expect((await iterator.next()).value).toBe(1);
    expect((await iterator.next()).value).toBe(2);
    await iterator.return(undefined);
    const emitter = (bus as unknown as { emitter: NodeJS.EventEmitter }).emitter;
    expect(emitter.listenerCount("ping")).toBe(0);
  });
});
