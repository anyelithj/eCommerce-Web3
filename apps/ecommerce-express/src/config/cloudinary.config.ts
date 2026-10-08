// cloudinary.config.ts (Cloudinary SDK v2) => CDN de imágenes: subida, transformación (WebP/AVIF) y borrado.
import { v2 as cloudinary } from "cloudinary"; // "v2 as cloudinary" => importa la API v2 con un alias legible
import { appConfig } from "./app.config";
import { ServiceUnavailableException } from "../shared/filter/http-exception.filter";

// "let configured" => bandera para configurar el SDK una sola vez (Lazy Initialization)
let configured = false;

// getCloudinary => configura desde CLOUDINARY_URL (cloudinary://key:secret@cloud) y devuelve la API
export function getCloudinary(): typeof cloudinary {
  if (!appConfig.CLOUDINARY_URL) {
    throw new ServiceUnavailableException("Cloudinary no está configurado (CLOUDINARY_URL)");
  }
  if (!configured) {
    // El SDK lee process.env.CLOUDINARY_URL automáticamente; "secure: true" fuerza URLs https
    cloudinary.config({ secure: true });
    configured = true;
  }
  return cloudinary;
}
