export type Cents = number;

export interface Ref {
  id: string;
  name: string;
  slug: string;
}

export type LoadState = "idle" | "loading" | "success" | "error";
