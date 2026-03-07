// Types
export type {
  SupabaseClient,
  AuthRouteMergeMode,
  AuthMiddlewareConfig,
  AuthCallbackConfig,
} from "./types";

// Client utilities
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";

// Factory functions
export { createAuthMiddleware } from "./middleware";
export { createAuthCallbackHandler } from "./auth-callback";
