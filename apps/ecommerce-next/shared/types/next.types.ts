export interface PageProps<P extends Record<string, string> = Record<string, never>> {
  params: Promise<P & { locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
