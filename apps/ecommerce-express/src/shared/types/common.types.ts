export type Branded<T, B extends string> = T & { readonly __brand: B };

export type Cents = number;

export type PartialUpdate<T> = { [K in keyof T]?: T[K] | undefined };
