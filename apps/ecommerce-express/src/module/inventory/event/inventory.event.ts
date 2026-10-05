import { TypedEventBus } from "../../../shared/util/event-bus.util";
import type { MovementType, StockLevel } from "../model/inventory.model";
import { invalidateCatalog } from "../../../shared/interceptor/cache.interceptor";
import { redis } from "../../../config/redis.config";
import { prisma } from "../../../config/database.config";
import { Roles } from "../../../shared/constants/roles.constants";
import { notificationService } from "../../notification/service/notification.service";
import { logger } from "../../../shared/middleware/logger.middleware";

export type InventoryEvents = {
  "inventory.adjusted": StockLevel & { movementType: MovementType; delta: number };
  "inventory.low": StockLevel & { threshold: number };
};

export const inventoryEvents = new TypedEventBus<InventoryEvents>("inventory");

const LOW_ALERT_TTL_SECONDS = 6 * 60 * 60;

export function registerInventorySubscribers(): void {
  inventoryEvents.on("inventory.adjusted", () => invalidateCatalog("product"));

  inventoryEvents.on("inventory.low", async (level) => {
    const first = await redis.set(`inventory:low-alert:${level.variantId}`, "1", "EX", LOW_ALERT_TTL_SECONDS, "NX").catch(() => "OK");
    if (first !== "OK") return;
    logger.warn("inventory_low_stock", { sku: level.sku, available: level.available, threshold: level.threshold });
    const admins = await prisma.user.findMany({ where: { isActive: true, roles: { some: { role: { name: Roles.ADMIN } } } }, select: { id: true } });
    await notificationService.broadcast(
      admins.map((admin) => admin.id),
      {
        type: "SYSTEM",
        message: { title: `Stock bajo: ${level.sku}`, body: `${level.productName} (${level.variantName}) tiene ${level.available} unidades disponibles.` },
        url: `/dashboard/inventory?q=${encodeURIComponent(level.sku)}`,
        channels: ["IN_APP"],
      }
    );
  });
}
