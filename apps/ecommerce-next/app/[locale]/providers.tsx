// providers.tsx => agrupa TODOS los Context Providers en un solo Client Component, para mantener el
// app/layout.tsx raíz como Server Component limpio (mejor performance por defecto).
// Estado de la app (regla del proyecto):
//   - Server State (datos del backend) => TanStack Query (lecturas con useQuery, escrituras con useMutation).
//   - Client State global (UI)         => Redux Toolkit (store armado aquí con los slices de cada feature).
//   - Estado local de un componente    => useState.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { Provider as ReduxProvider } from "react-redux";
import { SessionProvider, getSession } from "next-auth/react";
import { makeApolloClient, makeQueryClient } from "@/shared/lib/query-client";
import { persistSlices, registerBrowserStore } from "@/shared/lib/store";
import { cartUiSlice } from "@/shared/hook/useCart";
import { toast, Toaster, toastSlice } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { authFlowSlice } from "@/features/auth/model/auth.store";
import { cartCouponSlice } from "@/features/cart/model/cart.store";
import { checkoutDraftSlice } from "@/features/checkout/model/checkout.store";
import { liveNotificationSlice } from "@/features/notification/model/notification.store";
import { orderFilterSlice } from "@/features/order/model/order.store";
import { recentlyViewedSlice } from "@/features/product/model/product.store";
import { adminDashboardSlice } from "@/features/admin-dashboard/model/dashboard.store";
import AnalyticsTracker from "@/widgets/analytics/AnalyticsTracker";
import {
  applyToDocument,
  displayPreferencesSlice,
  type DisplayPreferencesState,
} from "@/features/settings/model/settings.store";

// "combineSlices" => reducer raíz; cada slice queda bajo la clave de su "name" (la que lee createSliceHook)
const rootReducer = combineSlices(
  cartUiSlice,
  toastSlice,
  authFlowSlice,
  cartCouponSlice,
  checkoutDraftSlice,
  liveNotificationSlice,
  orderFilterSlice,
  recentlyViewedSlice,
  displayPreferencesSlice,
  adminDashboardSlice
);

// makeStore => Factory: un store por pestaña del navegador (y uno por petición en el render del servidor)
function makeStore() {
  const store = configureStore({ reducer: rootReducer });
  registerBrowserStore(store); // toast.success(...) despacha a este store
  return store;
}

// Slices que sobreviven a una recarga (mismas claves que usaba la versión anterior)
const PERSISTED = [
  {
    name: displayPreferencesSlice.name,
    key: "ecommerce-display-preferences",
    storage: "local",
    hydrate: displayPreferencesSlice.actions.hydrate,
  },
  {
    name: recentlyViewedSlice.name,
    key: "ecommerce-recently-viewed",
    storage: "local",
    hydrate: recentlyViewedSlice.actions.hydrate,
  },
  {
    name: cartCouponSlice.name,
    key: "ecommerce-cart-coupon",
    storage: "session",
    hydrate: cartCouponSlice.actions.hydrate,
  },
] as const;

// sessionToken => access token vigente de next-auth (renovado por la sesión); lo piden Apollo HTTP y WebSocket
async function sessionToken(): Promise<string | undefined> {
  const session = (await getSession()) as { accessToken?: string } | null;
  return session?.accessToken;
}

export function Providers({ children }: { children: ReactNode }) {
  // "useState(() => ...)" => inicialización perezosa: UN cliente de cada tipo por pestaña (no uno por render)
  const errorMessage = useErrorMessage();
  const [queryClient] = useState(() =>
    makeQueryClient((error) => toast.error(errorMessage(error)))
  );
  const [apolloClient] = useState(() => makeApolloClient(sessionToken));
  const [store] = useState(makeStore);

  // Solo en el navegador y después de hidratar: restaura lo guardado y aplica las preferencias de visualización
  // en TODAS las páginas (antes solo se aplicaban al abrir Configuraciones)
  useEffect(() => {
    const unsubscribePersist = persistSlices(store, [...PERSISTED]);
    const apply = () =>
      applyToDocument(store.getState()[displayPreferencesSlice.name] as DisplayPreferencesState);
    apply();
    const unsubscribeApply = store.subscribe(apply);
    return () => {
      unsubscribePersist();
      unsubscribeApply();
    };
  }, [store]);

  return (
    // "SessionProvider" (next-auth) DEBE envolver todo lo que use useSession()/signIn()/signOut().
    // "refetchInterval" => revisa la sesión cada 5 min: dispara la renovación del access token antes de vencer
    <SessionProvider refetchInterval={5 * 60}>
      {/* "ReduxProvider" (react-redux) habilita los hooks de los slices (Client State) en toda la app */}
      <ReduxProvider store={store}>
        {/* "ApolloProvider" (Apollo Client) habilita useMutation/useSubscription de GraphQL en toda la app */}
        <ApolloProvider client={apolloClient}>
          {/* "QueryClientProvider" (TanStack Query) habilita useQuery/useMutation sobre la API REST (Server State) */}
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
            {/* Analítica propia (Fase 7): page_view + eventos de e-commerce en lotes hacia Express */}
            <AnalyticsTracker />
          </QueryClientProvider>
        </ApolloProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
