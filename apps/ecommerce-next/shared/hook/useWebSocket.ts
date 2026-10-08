// useWebSocket.ts (Apollo Client + graphql-ws) => GraphQL Subscription por WebSocket, autenticada con el access
// token de la sesión (lo pone el link WebSocket de query-client.ts en el handshake).
// Patrón Observer en el cliente: los componentes reciben cada evento sin conocer la conexión.
"use client";

import { useRef } from "react";
import type { TypedDocumentNode } from "@apollo/client";
import { useSubscription } from "@apollo/client/react";

// "<TData>" => forma de cada mensaje de la suscripción; "enabled" => sin sesión no se abre el canal privado
export function useWebSocket<TData>(
  document: TypedDocumentNode<TData, Record<string, never>>,
  enabled: boolean,
  onMessage: (data: TData) => void
): void {
  // useRef guarda el callback más reciente sin re-suscribirse en cada render
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useSubscription(document, {
    skip: !enabled, // "skip" => no suscribe (y cierra la suscripción activa) mientras no haya sesión
    // "onData" => se ejecuta con cada mensaje que empuja el servidor
    onData: ({ data }) => {
      if (data.data) handlerRef.current(data.data);
    },
  });
}
