export type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; errors: E };
