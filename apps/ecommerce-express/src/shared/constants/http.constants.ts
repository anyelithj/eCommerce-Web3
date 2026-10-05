export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
} as const;

export type SuccessStatus = (typeof HttpStatus)[keyof typeof HttpStatus];
