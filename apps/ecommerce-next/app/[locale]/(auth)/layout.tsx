import type { ReactNode } from "react";
import { config } from "@/shared/constants/config";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-muted px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl bg-background p-6 shadow-sm sm:p-8">
        <a href={config.cmsUrl} className="text-2xl font-semibold text-foreground">
          {config.siteName}
        </a>
        {children}
      </div>
    </main>
  );
}
