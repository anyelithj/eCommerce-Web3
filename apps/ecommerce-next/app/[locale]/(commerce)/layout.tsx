import type { Metadata } from "next";
import type { ReactNode } from "react";
import { initPage } from "@/shared/lib/i18n/server";
import { SiteChrome } from "../_components/SiteChrome";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CommerceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await initPage(params);
  return <SiteChrome>{children}</SiteChrome>;
}
