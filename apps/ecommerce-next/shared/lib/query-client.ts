// query-client.ts => clientes de consultas del frontend (Factory):
//   - Apollo Client => GraphQL: Queries/Mutations por HTTP y Subscriptions por WebSocket (graphql-ws).
//   - TanStack Query => cache y estado de las lecturas REST que hace api-client (Axios).
// Claves de cache centralizadas al final (DRY).
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { OperationTypeNode } from "graphql";
import { createClient } from "graphql-ws";
import { ApiError } from "./api-client";
import { config } from "../constants/config";

// makeQueryClient => Factory: una instancia por pestaña del navegador (se crea en providers.tsx).
// "onError" => aviso global cuando una lectura falla SIN datos previos (antes la sección quedaba vacía o con su
// esqueleto para siempre). Los 401 se omiten: la sesión vencida ya la maneja AuthBanner/middleware.
export function makeQueryClient(onError?: (error: unknown) => void): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data === undefined && !(error instanceof ApiError && error.status === 401))
          onError?.(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // Datos "frescos" 60 s: evita refetch al navegar entre páginas
        // No reintentar errores 4xx (son definitivos: no autorizado, no encontrado); sí errores de red/5xx
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// TokenProvider => de dónde sale el access token (sesión next-auth); "undefined" => petición anónima
type TokenProvider = () => Promise<string | undefined>;

// makeApolloClient => Factory del cliente GraphQL.
// Servidor (RSC): solo HTTP y sin cache propia (la cache la pone el Data Cache de Next con "fetchOptions.next").
// Navegador: "split" (Strategy por tipo de operación) => Subscriptions por WebSocket; Queries/Mutations por HTTP.
export function makeApolloClient(getToken?: TokenProvider): ApolloClient {
  const httpLink = new HttpLink({ uri: config.graphqlUrl });
  // SetContextLink => agrega "Authorization: Bearer" a cada operación HTTP si hay sesión
  const authLink = new SetContextLink(async (prevContext) => {
    const token = await getToken?.();
    return token ? { headers: { ...prevContext.headers, Authorization: `Bearer ${token}` } } : {};
  });
  const http = authLink.concat(httpLink); // Cadena de links (Chain of Responsibility): auth -> http

  if (typeof window === "undefined")
    return new ApolloClient({ link: http, cache: new InMemoryCache(), ssrMode: true });

  // createClient (graphql-ws) => conexión perezosa: se abre con la primera suscripción y se cierra con la última.
  // El token viaja en "connectionParams" del handshake (no en la URL, que queda en logs de proxies)
  const wsLink = new GraphQLWsLink(
    createClient({
      url: config.graphqlWsUrl,
      lazy: true,
      connectionParams: async () => ({ token: await getToken?.() }),
    })
  );
  const link = ApolloLink.split(
    ({ operationType }) => operationType === OperationTypeNode.SUBSCRIPTION,
    wsLink,
    http
  );
  return new ApolloClient({ link, cache: new InMemoryCache() });
}

// toApiErrorFromGraphql => error de Apollo -> ApiError: la UI traduce el mismo "code" que en REST (DRY con useErrorMessage)
export function toApiErrorFromGraphql(error: unknown): ApiError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    // "extensions" => código y status que fija el formatError del backend (mismo contrato que REST)
    const extensions = (first?.extensions ?? {}) as {
      code?: string;
      status?: number;
      details?: unknown;
    };
    return new ApiError(
      extensions.status ?? 400,
      extensions.code ?? "GRAPHQL_ERROR",
      first?.message ?? "Error",
      extensions.details
    );
  }
  return new ApiError(0, "NETWORK_ERROR", "No se pudo completar la solicitud");
}

// queryKeys => claves jerárquicas (Factory de keys): invalidar ["cart"] invalida todo lo del carrito (DRY)
export const queryKeys = {
  cart: ["cart"] as const,
  checkout: (id: string) => ["checkout", id] as const,
  orders: (params: object) => ["orders", params] as const,
  order: (id: string) => ["order", id] as const,
  search: (params: object) => ["search", params] as const,
  suggestions: (q: string) => ["suggestions", q] as const,
  reviews: (params: object) => ["reviews", params] as const,
  reviewSummary: (productId: string) => ["review-summary", productId] as const,
  loyalty: ["loyalty"] as const,
  badges: (accountId: string) => ["badges", accountId] as const,
  notifications: (params: object) => ["notifications", params] as const,
  unreadCount: ["notifications", "unread"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  wishlist: (userId: string) => ["wishlist", userId] as const,
  preferences: ["notification-preferences"] as const,
  socialFeed: (params: object) => ["social-feed", params] as const,
  llmConversations: ["llm-conversations"] as const,
  llmConversation: (id: string) => ["llm-conversation", id] as const,
  // Panel admin (Fase 7): ["admin", recurso, parámetros] => invalidar ["admin", "inventory"] refresca solo inventario
  admin: (resource: string, params: object = {}) => ["admin", resource, params] as const,
} as const;
