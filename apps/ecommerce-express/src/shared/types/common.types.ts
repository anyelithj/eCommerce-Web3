// common.types.ts => tipos utilitarios de uso transversal (TypeScript puro, sin runtime).

// "Brand types" (tipos nominales): un string marcado como UUID no se confunde con cualquier otro string
// "& { readonly __brand: B }" => intersección con una propiedad fantasma que solo existe para el compilador
export type Branded<T, B extends string> = T & { readonly __brand: B };

// Montos monetarios SIEMPRE en unidad mínima (centavos) — ver convención en schema.prisma
export type Cents = number;

// Hace opcionales y "undefined-able" las propiedades de T: compatible con "exactOptionalPropertyTypes"
// "[K in keyof T]?" => tipo mapeado (itera sobre las claves de T)
export type PartialUpdate<T> = { [K in keyof T]?: T[K] | undefined };
