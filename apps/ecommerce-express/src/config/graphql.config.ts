import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import type { RequestHandler } from "express";
import { ApolloServer, HeaderMap } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import { ZodError } from "zod";
import { isProduction } from "./app.config";
import { productService } from "../module/product/service/product.service";
import { liveNotifications } from "../module/notification/service/notification.service";
import { ListProductsQuerySchema } from "../module/product/schema/product.schema";
import type { ProductDetailDto } from "../module/product/dto/product.dto";
import type { AuthenticatedRequestUser } from "../module/auth/types/auth.types";
import { resolveAccessToken } from "../module/auth/strategy/jwt.strategy";
import { AppException, UnauthorizedException } from "../shared/filter/http-exception.filter";
import { logger } from "../shared/middleware/logger.middleware";

interface GraphqlContext {
  viewer: AuthenticatedRequestUser | undefined;
  ip: string;
}

export const GRAPHQL_PATH = "/graphql";

const typeDefs = `#graphql
  scalar DateTime

  type Ref { id: ID! name: String! slug: String! }
  type Attribute { name: String! value: String! }
  type Variant {
    id: ID! sku: String! name: String! attributes: [Attribute!]!
    priceCents: Int! compareAtPriceCents: Int available: Int! weightGrams: Int! isActive: Boolean!
  }
  type Image { id: ID! url: String! alt: String! width: Int height: Int position: Int! variantId: ID }
  type ProductCard {
    id: ID! name: String! slug: String! status: String! currency: String!
    minPriceCents: Int! maxPriceCents: Int! compareAtPriceCents: Int
    ratingAvg: Float! ratingCount: Int! imageUrl: String imageAlt: String inStock: Boolean!
    brand: Ref category: Ref
  }
  type Product {
    id: ID! name: String! slug: String! status: String! description: String! currency: String! vendorId: ID
    minPriceCents: Int! maxPriceCents: Int! compareAtPriceCents: Int ratingAvg: Float! ratingCount: Int! inStock: Boolean!
    brand: Ref category: Ref collections: [Ref!]! variants: [Variant!]! images: [Image!]!
    createdAt: DateTime! updatedAt: DateTime!
  }
  type PageMeta { page: Int! limit: Int! total: Int! totalPages: Int! }
  type ProductPage { items: [ProductCard!]! meta: PageMeta! }
  type Notification { id: ID! type: String! title: String! body: String! url: String read: Boolean! createdAt: DateTime! }

  input ProductFilter {
    q: String category: String brand: String collection: String
    minPrice: Int maxPrice: Int inStock: Boolean sort: String page: Int limit: Int
  }

  type Query {
    products(filter: ProductFilter): ProductPage!
    product(idOrSlug: String!): Product
  }

  type Subscription {
    "Notificaciones in-app del usuario autenticado, en tiempo real"
    notificationReceived: Notification!
  }
`;

const DateTime = new GraphQLScalarType<Date, string>({
  name: "DateTime",
  serialize: (value) => (value instanceof Date ? value : new Date(String(value))).toISOString(),
  parseValue: (value) => new Date(String(value)),
  parseLiteral: (ast) => {
    if (ast.kind !== Kind.STRING) throw new GraphQLError("DateTime debe ser un texto ISO 8601");
    return new Date(ast.value);
  },
});

function requireViewer(context: GraphqlContext): AuthenticatedRequestUser {
  if (!context.viewer) throw new UnauthorizedException();
  return context.viewer;
}

const resolvers = {
  DateTime,
  Query: {
    products: async (_parent: unknown, args: { filter?: Record<string, unknown> | null }, context: GraphqlContext) =>
      productService.listProducts(
        ListProductsQuerySchema.parse({ ...args.filter, inStock: args.filter?.["inStock"] == null ? undefined : String(args.filter["inStock"]) }),
        context.viewer
      ),

    product: async (_parent: unknown, args: { idOrSlug: string }, context: GraphqlContext) => {
      const product: ProductDetailDto = await productService.getProductById(args.idOrSlug, context.viewer);
      return {
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          attributes: Object.entries(variant.attributes).map(([name, value]) => ({ name, value })),
        })),
      };
    },
  },

  Subscription: {
    notificationReceived: {
      subscribe: async function* (_parent: unknown, _args: unknown, context: GraphqlContext) {
        const viewer = requireViewer(context);
        for await (const event of liveNotifications.iterate("notification.created")) {
          if (event.userId === viewer.id) yield { notificationReceived: event.notification };
        }
      },
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const apollo = new ApolloServer<GraphqlContext>({
  schema,
  introspection: !isProduction,
  formatError: (formatted, error) => {
    const original = error instanceof GraphQLError ? error.originalError : error;
    if (original instanceof AppException) {
      return { ...formatted, message: original.message, extensions: { code: original.code, status: original.statusCode, details: original.details } };
    }
    if (original instanceof ZodError) {
      return { ...formatted, message: "Datos inválidos", extensions: { code: "VALIDATION_ERROR", status: 400, details: original.flatten().fieldErrors } };
    }
    return formatted;
  },
});

export async function createGraphqlHandler(): Promise<RequestHandler> {
  await apollo.start();

  return (req, res, next) => {
    const headers = new HeaderMap();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    apollo
      .executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          method: req.method.toUpperCase(),
          headers,
          search: new URL(req.originalUrl, "http://localhost").search,
          body: req.body as unknown,
        },
        context: async () => ({ viewer: req.user, ip: req.ip ?? "unknown" }),
      })
      .then(async (response) => {
        for (const [key, value] of response.headers) res.setHeader(key, value);
        res.status(response.status ?? 200);
        if (response.body.kind === "complete") {
          res.send(response.body.string);
          return;
        }
        for await (const chunk of response.body.asyncIterator) res.write(chunk);
        res.end();
      })
      .catch(next);
  };
}

type SocketExtra = {
  request: IncomingMessage;
  viewer?: AuthenticatedRequestUser;
};

export function attachGraphqlSubscriptions(httpServer: HttpServer): void {
  const wsServer = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (new URL(request.url ?? "/", "http://localhost").pathname !== GRAPHQL_PATH) return;
    wsServer.handleUpgrade(request, socket, head, (client) => wsServer.emit("connection", client, request));
  });

  useServer<Record<string, unknown> | undefined, SocketExtra>(
    {
      schema,
      onConnect: async (ctx) => {
        const token = ctx.connectionParams?.["token"];
        const viewer = typeof token === "string" ? await resolveAccessToken(token) : null;
        if (!viewer) return false;
        ctx.extra.viewer = viewer;
        return true;
      },
      context: (ctx): GraphqlContext => ({ viewer: ctx.extra.viewer, ip: ctx.extra.request.socket.remoteAddress ?? "unknown" }),
      onError: (_ctx, _id, _payload, errors) => {
        logger.warn("graphql_ws_error", { errors: errors.map((error) => error.message) });
      },
    },
    wsServer
  );
}
