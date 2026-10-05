import { localizedPath, parseLocale } from "../../src/shared/util/i18n.util";
import { MESSAGES, renderLoyaltyReason, renderNotification, renderStoredNotification } from "../../src/shared/constants/messages.constants";

describe("parseLocale / localizedPath", () => {
  it("toma el primer idioma soportado de Accept-Language y usa español por defecto", () => {
    expect(parseLocale("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(parseLocale("fr-FR,es;q=0.5")).toBe("es");
    expect(parseLocale(undefined)).toBe("es");
  });

  it("agrega el prefijo /en solo al inglés (el español no lleva prefijo)", () => {
    expect(localizedPath("es", "/account")).toBe("/account");
    expect(localizedPath("en", "/account")).toBe("/en/account");
  });
});

describe("notificaciones traducidas", () => {
  it("redacta la misma clave en cada idioma con sus parámetros", () => {
    const params = { orderNumber: "ORD-1", status: "SHIPPED" as const };
    expect(renderNotification("es", "orderStatus", params).body).toBe("Tu pedido fue enviado.");
    expect(renderNotification("en", "orderStatus", params).body).toBe("Your order has shipped.");
  });

  it("los registros guardados se traducen al leer; una clave desconocida devuelve null (se usa el texto guardado)", () => {
    expect(renderStoredNotification("en", "tierUpgraded", { tier: "GOLD" })?.title).toBe("You reached the Gold tier!");
    expect(renderStoredNotification("en", "claveInexistente", {})).toBeNull();
    expect(renderStoredNotification("en", null, {})).toBeNull();
  });

  it("ambos idiomas definen las mismas claves de notificación", () => {
    expect(Object.keys(MESSAGES.en.notifications).sort()).toEqual(Object.keys(MESSAGES.es.notifications).sort());
  });
});

describe("concepto de los puntos", () => {
  it("traduce los códigos del sistema y deja intacto el texto libre de un administrador", () => {
    expect(renderLoyaltyReason("en", "PURCHASE", { orderNumber: "ORD-7" }, "Compra ORD-7")).toBe("Purchase ORD-7");
    expect(renderLoyaltyReason("es", "EXPIRATION", {}, "x")).toBe("Vencimiento de puntos");
    expect(renderLoyaltyReason("en", null, null, "Bono por evento")).toBe("Bono por evento");
  });
});
