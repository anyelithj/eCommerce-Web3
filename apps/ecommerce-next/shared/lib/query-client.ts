import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { OperationTypeNode } from "graphql";
import { createClient } from "graphql-ws";
import { ApiError } from "./api-client";
import { config } from "../constants/config";

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
        staleTime: 60 * 1000,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

type TokenProvider = () => Promise<string | undefined>;

export function makeApolloClient(getToken?: TokenProvider): ApolloClient {
  const httpLink = new HttpLink({ uri: config.graphqlUrl });
  const authLink = new SetContextLink(async (prevContext) => {
    const token = await getToken?.();
    return token ? { headers: { ...prevContext.headers, Authorization: `Bearer ${token}` } } : {};
  });
  const http = authLink.concat(httpLink);

  if (typeof window === "undefined")
    return new ApolloClient({ link: http, cache: new InMemoryCache(), ssrMode: true });

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

export function toApiErrorFromGraphql(error: unknown): ApiError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
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
  admin: (resource: string, params: object = {}) => ["admin", resource, params] as const,
} as const;
