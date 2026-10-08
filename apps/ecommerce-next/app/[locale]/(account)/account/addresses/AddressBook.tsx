// AddressBook.tsx (Client Component) => libreta de direcciones: listar, marcar predeterminada, eliminar y agregar.
// Reutiliza NewAddressForm del checkout (DRY) y las operaciones de userApi (entities/user).
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useProfile, userApi } from "@/entities/user/api/user.api";
import { NewAddressForm } from "@/features/checkout/ui/AddressForm";
import { useAuth } from "@/shared/hook/useAuth";
import { queryKeys } from "@/shared/lib/query-client";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { toast } from "@/shared/ui/Toast";

export function AddressBook() {
  const t = useTranslations("account.addresses");
  const errorMessage = useErrorMessage();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [adding, setAdding] = useState(false);
  const userId = user?.id ?? "";

  // Invalida el perfil (fuente de las direcciones) tras cualquier cambio => lista siempre consistente
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  const onError = (error: unknown) => toast.error(errorMessage(error));
  const setDefault = useMutation({
    mutationFn: (id: string) =>
      userApi.updateAddress(accessToken as string, userId, id, { isDefault: true }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => userApi.deleteAddress(accessToken as string, userId, id),
    onSuccess: refresh,
    onError,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const addresses = profile?.addresses ?? [];

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !adding && (
        <EmptyState icon="📦" title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-900">
                {address.label ?? address.recipientName}
              </span>
              {address.isDefault && <Badge tone="success">{t("default")}</Badge>}
            </div>
            {/* <address> => semántica HTML para datos de contacto */}
            <address className="not-italic text-slate-600">
              {address.recipientName} · {address.phone}
              <br />
              {address.line1}
              {address.line2 && `, ${address.line2}`}
              <br />
              {address.city}, {address.state} {address.postalCode} — {address.country}
            </address>
            <div className="flex flex-wrap gap-2">
              {!address.isDefault && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={setDefault.isPending && setDefault.variables === address.id}
                  onClick={() => setDefault.mutate(address.id)}
                >
                  {t("makeDefault")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                loading={remove.isPending && remove.variables === address.id}
                // "confirm" nativo => evita borrados accidentales sin dependencia extra
                onClick={() => window.confirm(t("confirmDelete")) && remove.mutate(address.id)}
                aria-label={t("deleteLabel", { line: address.line1 })}
              >
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <NewAddressForm
          onCreated={() => {
            setAdding(false);
            toast.success(t("saved"));
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)} className="self-start">
          {t("add")}
        </Button>
      )}
    </div>
  );
}
