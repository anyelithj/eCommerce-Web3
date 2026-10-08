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

function makeStore() {
  const store = configureStore({ reducer: rootReducer });
  registerBrowserStore(store);
  return store;
}

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

async function sessionToken(): Promise<string | undefined> {
  const session = (await getSession()) as { accessToken?: string } | null;
  return session?.accessToken;
}

export function Providers({ children }: { children: ReactNode }) {
  const errorMessage = useErrorMessage();
  const [queryClient] = useState(() =>
    makeQueryClient((error) => toast.error(errorMessage(error)))
  );
  const [apolloClient] = useState(() => makeApolloClient(sessionToken));
  const [store] = useState(makeStore);

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
    <SessionProvider refetchInterval={5 * 60}>
      <ReduxProvider store={store}>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
            <AnalyticsTracker />
          </QueryClientProvider>
        </ApolloProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
