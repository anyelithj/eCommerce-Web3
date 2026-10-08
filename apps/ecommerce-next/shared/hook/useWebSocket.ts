"use client";

import { useRef } from "react";
import type { TypedDocumentNode } from "@apollo/client";
import { useSubscription } from "@apollo/client/react";

export function useWebSocket<TData>(
  document: TypedDocumentNode<TData, Record<string, never>>,
  enabled: boolean,
  onMessage: (data: TData) => void
): void {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useSubscription(document, {
    skip: !enabled,
    onData: ({ data }) => {
      if (data.data) handlerRef.current(data.data);
    },
  });
}
