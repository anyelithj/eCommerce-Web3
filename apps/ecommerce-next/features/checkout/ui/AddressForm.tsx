"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/lib/i18n/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CheckoutSession } from "@/entities/order/model/order.types";
import { useProfile, userApi } from "@/entities/user/api/user.api";
import { useShippingRates, useUpdateCheckoutAddress } from "../api/checkout.api";
import { useCheckoutDraft } from "../model/checkout.store";
import { addressSchema, type AddressFormValues } from "../lib/checkout.validator";
import { useAuth } from "@/shared/hook/useAuth";
import { queryKeys } from "@/shared/lib/query-client";
import { useFormat } from "@/shared/hook/useFormat";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { useZodForm } from "@/shared/hook/useZodForm";
import { trackEvent } from "@/shared/lib/analytics";
import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Skeleton } from "@/shared/ui/Skeleton";

export function NewAddressForm({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useTranslations("address");
  const errorMessage = useErrorMessage();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (values: AddressFormValues) =>
      userApi.createAddress(accessToken as string, (user as { id: string }).id, values),
    onSuccess: (address) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile((user as { id: string }).id),
      });
      onCreated(address.id);
    },
  });
  const form = useZodForm({
    schema: addressSchema,
    initialValues: {
      recipientName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "CO",
      isDefault: false,
    },
    onSubmit: (values: AddressFormValues) => create.mutate(values),
  });

  return (
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
    >
      <Input
        label={t("recipient")}
        autoComplete="name"
        error={form.error("recipientName")}
        {...form.getFieldProps("recipientName")}
      />
      <Input
        label={t("phone")}
        type="tel"
        autoComplete="tel"
        error={form.error("phone")}
        {...form.getFieldProps("phone")}
      />
      <div className="sm:col-span-2">
        <Input
          label={t("line1")}
          autoComplete="address-line1"
          error={form.error("line1")}
          {...form.getFieldProps("line1")}
        />
      </div>
      <div className="sm:col-span-2">
        <Input label={t("line2")} autoComplete="address-line2" {...form.getFieldProps("line2")} />
      </div>
      <Input
        label={t("city")}
        autoComplete="address-level2"
        error={form.error("city")}
        {...form.getFieldProps("city")}
      />
      <Input
        label={t("state")}
        autoComplete="address-level1"
        error={form.error("state")}
        {...form.getFieldProps("state")}
      />
      <Input
        label={t("postalCode")}
        autoComplete="postal-code"
        error={form.error("postalCode")}
        {...form.getFieldProps("postalCode")}
      />
      <Input
        label={t("country")}
        maxLength={2}
        autoComplete="country"
        error={form.error("country")}
        {...form.getFieldProps("country")}
      />
      {create.isError && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {errorMessage(create.error)}
        </p>
      )}
      <Button type="submit" loading={create.isPending} className="sm:col-span-2">
        {t("save")}
      </Button>
    </form>
  );
}

export function AddressForm({ session }: { session: CheckoutSession }) {
  const t = useTranslations("checkout.shipping");
  const errorMessage = useErrorMessage();
  const { money } = useFormat();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { addressId, rateCode, selectAddress, selectRate } = useCheckoutDraft();
  const [adding, setAdding] = useState(false);
  const update = useUpdateCheckoutAddress(session.id);
  const weight = session.items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
  const rates = useShippingRates(addressId, weight, session.subtotalCents);

  useEffect(() => {
    if (addressId || !profile) return;
    const preferred =
      session.addressId ??
      profile.addresses.find((address) => address.isDefault)?.id ??
      profile.addresses[0]?.id;
    if (preferred) selectAddress(preferred);
  }, [addressId, profile, session.addressId, selectAddress]);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const onContinue = () => {
    if (!addressId || !rateCode) return;
    update.mutate(
      { addressId, shippingRateCode: rateCode },
      {
        onSuccess: () => {
          trackEvent("add_shipping_info", { shipping_tier: rateCode });
          router.push(routes.checkoutPayment(session.id));
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">{t("address")}</legend>
        {profile?.addresses.map((address) => (
          <label
            key={address.id}
            className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-slate-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900"
          >
            <input
              type="radio"
              name="address"
              value={address.id}
              checked={addressId === address.id}
              onChange={() => selectAddress(address.id)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="block font-medium text-slate-900">
                {address.recipientName}{" "}
                {address.label && <span className="text-slate-500">· {address.label}</span>}
              </span>
              <span className="block text-slate-600">
                {address.line1}
                {address.line2 && `, ${address.line2}`} — {address.city}, {address.state}
              </span>
            </span>
          </label>
        ))}
        {adding ? (
          <NewAddressForm
            onCreated={(id) => {
              setAdding(false);
              selectAddress(id);
            }}
          />
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)} className="self-start">
            {t("addAddress")}
          </Button>
        )}
      </fieldset>

      {addressId && (
        <fieldset className="flex flex-col gap-3" aria-busy={rates.isLoading}>
          <legend className="mb-2 text-lg font-semibold">{t("method")}</legend>
          {rates.isLoading && <Skeleton className="h-20 w-full" />}
          {rates.isError && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage(rates.error, t("noRates"))}
            </p>
          )}
          {rates.data?.map((rate) => (
            <label
              key={rate.code}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-slate-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900"
            >
              <span className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="rate"
                  value={rate.code}
                  checked={rateCode === rate.code}
                  onChange={() => selectRate(rate.code)}
                />
                <span>
                  <span className="block font-medium">
                    {rate.carrier} · {rate.service}
                  </span>
                  <span className="text-slate-600">
                    {t("arrives", { days: rate.estimatedDays })}
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold">
                {rate.costCents === 0 ? t("free") : money(rate.costCents, rate.currency)}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {update.isError && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage(update.error)}
        </p>
      )}
      <Button
        size="lg"
        onClick={onContinue}
        disabled={!addressId || !rateCode}
        loading={update.isPending}
      >
        {t("continue")}
      </Button>
    </div>
  );
}
