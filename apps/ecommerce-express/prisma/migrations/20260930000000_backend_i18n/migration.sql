-- 20260930000000_backend_i18n => textos generados por el backend en el idioma del usuario (es/en).
-- Generada con "prisma migrate diff" + restricción CHECK manual (Prisma no modela CHECK).

-- Idioma preferido del usuario: lo usan emails, push y notificaciones
ALTER TABLE "users" ADD COLUMN     "locale" VARCHAR(5) NOT NULL DEFAULT 'es';
-- Solo idiomas soportados por la tienda (la base protege el dato aunque falle la validación de la API)
ALTER TABLE "users" ADD CONSTRAINT "users_locale_check" CHECK ("locale" IN ('es', 'en'));

-- Concepto de los movimientos de puntos como código + parámetros (se traduce al leer); "reason" queda para auditoría
ALTER TABLE "loyalty_transactions" ADD COLUMN     "reasonCode" VARCHAR(40),
ADD COLUMN     "reasonParams" JSONB;
