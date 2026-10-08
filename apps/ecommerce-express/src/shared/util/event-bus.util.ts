// event-bus.util.ts => bus de eventos de dominio TIPADO sobre EventEmitter nativo de Node.
// Patrón Observer / Publish-Subscribe: un módulo publica "order.placed" sin conocer a quién le interesa
// (factura, fidelidad, envío, notificaciones se suscriben por su cuenta) => bajo acoplamiento (DIP entre módulos).
// Paradigma reactivo/orientado a eventos. Genérico "<Events>": el compilador verifica nombre y payload de cada evento.
import { EventEmitter, on } from "node:events";
import { logger } from "../middleware/logger.middleware";

// "Events extends Record<string, unknown>" => mapa nombreDelEvento -> tipo del payload
export class TypedEventBus<Events extends Record<string, unknown>> {
  // "private readonly" => el emitter interno no se expone (encapsulamiento)
  private readonly emitter = new EventEmitter();

  constructor(private readonly name: string) {
    // Evita el warning "MaxListenersExceeded": varios módulos se suscriben al mismo evento a propósito
    this.emitter.setMaxListeners(50);
  }

  // "K extends keyof Events & string" => solo nombres de eventos declarados; payload tipado por clave
  public emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    this.emitter.emit(event, payload);
  }

  // on => registra un handler ASÍNCRONO; sus errores se capturan y registran para que un suscriptor
  // defectuoso (ej. SMTP caído) nunca tumbe el proceso ni afecte a los demás suscriptores (aislamiento de fallos)
  public on<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K]) => Promise<void> | void
  ): void {
    this.emitter.on(event, (payload: Events[K]) => {
      // "Promise.resolve().then(...)" => ejecuta el handler en una microtarea posterior: el publicador no espera
      Promise.resolve()
        .then(() => handler(payload))
        .catch((error: unknown) =>
          logger.error("event_handler_failed", { bus: this.name, event, error })
        );
    });
  }

  // iterate => los eventos como "AsyncIterable" (paradigma reactivo con "for await"): base de las GraphQL Subscriptions.
  // "on(emitter, event)" (Node nativo) crea el iterador; al cerrarlo (el cliente cancela la suscripción) se quita
  // el listener solo => sin fugas de memoria y sin librería PubSub adicional.
  // "async function*" => generador asíncrono: "yield" entrega cada payload a quien consume el iterador.
  public async *iterate<K extends keyof Events & string>(event: K): AsyncGenerator<Events[K]> {
    // Cada evento llega como el arreglo de argumentos de "emit"; el payload es el primero
    for await (const [payload] of on(this.emitter, event)) yield payload as Events[K];
  }
}
