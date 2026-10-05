import { v2 as cloudinary } from "cloudinary";
import { appConfig } from "./app.config";
import { ServiceUnavailableException } from "../shared/filter/http-exception.filter";

let configured = false;

export function getCloudinary(): typeof cloudinary {
  if (!appConfig.CLOUDINARY_URL) {
    throw new ServiceUnavailableException("Cloudinary no está configurado (CLOUDINARY_URL)");
  }
  if (!configured) {
    cloudinary.config({ secure: true });
    configured = true;
  }
  return cloudinary;
}
