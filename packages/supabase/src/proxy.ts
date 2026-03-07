import { createAuthMiddleware } from "./middleware";
import type { AuthMiddlewareConfig } from "./types";

export function createAuthProxy(config: AuthMiddlewareConfig = {}) {
  return createAuthMiddleware(config);
}
