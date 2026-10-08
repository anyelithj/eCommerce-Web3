// event-bus.spec.ts => "iterate" (base de las GraphQL Subscriptions): entrega los eventos en orden y,
// al cancelar la suscripción, quita el listener (sin fugas de memoria por conexiones cerradas).
import { TypedEventBus } from "../../src/shared/util/event-bus.util";

// "jest.mock" => el bus importa el logger, que lee la configuración del entorno; aquí no se necesita
jest.mock("../../src/shared/middleware/logger.middleware", () => ({
  logger: { error: jest.fn() },
}));

describe("TypedEventBus.iterate", () => {
  it("entrega los eventos publicados y libera el listener al cerrar", async () => {
    const bus = new TypedEventBus<{ ping: number }>("test");
    const iterator = bus.iterate("ping");
    // "setImmediate" => se publica después de que el iterador empezó a escuchar
    setImmediate(() => {
      bus.emit("ping", 1);
      bus.emit("ping", 2);
    });
    expect((await iterator.next()).value).toBe(1);
    expect((await iterator.next()).value).toBe(2);
    await iterator.return(undefined); // Lo que hace graphql-ws cuando el cliente cancela
    // "as unknown as" => acceso a la propiedad privada solo para verificar que no quedó el listener
    const emitter = (bus as unknown as { emitter: NodeJS.EventEmitter }).emitter;
    expect(emitter.listenerCount("ping")).toBe(0);
  });
});
