// http.constants.ts => códigos HTTP con nombre (Clean Code: sin "números mágicos" en los controllers).
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
} as const; // "as const" => propiedades readonly con tipos literales (200, no number)

// "typeof X[keyof typeof X]" => unión de los valores del objeto: 200 | 201 | 202 | 204
export type SuccessStatus = (typeof HttpStatus)[keyof typeof HttpStatus];
