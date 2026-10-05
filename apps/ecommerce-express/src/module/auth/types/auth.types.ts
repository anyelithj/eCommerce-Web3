import type { Locale } from "../../../shared/util/i18n.util";

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  roles: string[];
  locale: Locale;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedRequestUser {}
  }
}
