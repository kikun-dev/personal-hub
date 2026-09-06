// Local-only fault owner, separate from the Playwright worker: assertion failures,
// test timeouts and worker termination all restore grants via dispose/disconnect.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "about:blank");
if (process.env.E2E_LOCAL_SUPABASE !== "1" || url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)) {
  throw new Error("Error retry fault injection requires local Supabase.");
}
const container = process.env.E2E_LOCAL_SUPABASE_DB_CONTAINER ?? "supabase_db_oshikatsu-web";
if (!/^supabase_db_[a-zA-Z0-9_-]+$/.test(container)) {
  throw new Error("Expected a local Supabase Docker DB container.");
}
const lock = join(tmpdir(), `${container}-error-retry.lock`);
mkdirSync(lock); // Fail before mutation if another fault owner exists.
const ids = { song: randomUUID(), release: randomUUID(), live: randomUUID(), performance: randomUUID() };
let activeTable;
let isDisposed = false;

function sql(statement) {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres",
    "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], {
    input: statement, encoding: "utf8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function restore() {
  if (!activeTable) return;
  sql(`GRANT SELECT ON public.${activeTable} TO service_role;`);
  if (sql(`SELECT has_table_privilege('service_role', 'public.${activeTable}', 'SELECT');`) !== "t") {
    throw new Error("SELECT restoration verification failed.");
  }
  activeTable = undefined;
}

function dispose() {
  if (isDisposed) return;
  // Restore first, even if fixture deletion fails. Keep the lock on failure so a
  // later run cannot silently hide a failed cleanup.
  restore();
  sql(`BEGIN;
    DELETE FROM public.orbit_lives WHERE id = '${ids.live}';
    DELETE FROM public.orbit_tracks WHERE id = '${ids.song}';
    DELETE FROM public.orbit_releases WHERE id = '${ids.release}';
    COMMIT;`);
  const remaining = sql(`SELECT
    (SELECT count(*) FROM public.orbit_lives WHERE id='${ids.live}') +
    (SELECT count(*) FROM public.orbit_tracks WHERE id='${ids.song}') +
    (SELECT count(*) FROM public.orbit_releases WHERE id='${ids.release}');`);
  if (remaining !== "0") throw new Error("Fixture cleanup verification failed.");
  rmdirSync(lock);
  isDisposed = true;
}

function exitWithCleanup() {
  try {
    dispose();
    process.exit(0);
  } catch (error) {
    console.error("Error retry DB cleanup FAILED; inspect local grants:", error.message);
    process.exit(1);
  }
}

process.on("disconnect", exitWithCleanup);
process.on("SIGTERM", exitWithCleanup);
process.on("SIGINT", exitWithCleanup);
// A hung worker must not leave a permission fault behind indefinitely.
const watchdog = setTimeout(exitWithCleanup, 90_000);
watchdog.unref();

function reply(message) {
  if (!process.connected) {
    exitWithCleanup();
    return;
  }
  // The worker can die while docker/psql is executing synchronously. Treat an
  // IPC send failure exactly like disconnect, instead of exiting before restore.
  process.send(message, (error) => {
    if (error) exitWithCleanup();
  });
}

process.on("message", ({ command, id }) => {
  try {
    let result;
    if (command === "prepare") {
      // UUIDs are unique per test, so successful shared-cache entries from a
      // previous test cannot mask the next read failure. No URL nonce is used.
      sql(`BEGIN;
        INSERT INTO public.orbit_releases (id, title, group_id, release_type)
          SELECT '${ids.release}', 'E2E Retry Release', id, 'other' FROM public.orbit_groups ORDER BY id LIMIT 1;
        INSERT INTO public.orbit_tracks (id, title, group_id)
          SELECT '${ids.song}', 'E2E Retry Song', id FROM public.orbit_groups ORDER BY id LIMIT 1;
        INSERT INTO public.orbit_release_tracks (release_id, track_id, track_number)
          VALUES ('${ids.release}', '${ids.song}', 1);
        INSERT INTO public.orbit_lives (id, name, live_type)
          VALUES ('${ids.live}', 'E2E Retry Live', 'single');
        INSERT INTO public.orbit_live_performances (id, live_id, performance_date)
          VALUES ('${ids.performance}', '${ids.live}', '2026-08-23');
        INSERT INTO public.orbit_setlist_items (performance_id, position, item_type, track_id)
          VALUES ('${ids.performance}', 1, 'song', '${ids.song}');
        COMMIT;`);
      result = ids;
    } else if (command === "fail-song" || command === "fail-live") {
      restore();
      const table = command === "fail-song" ? "orbit_tracks" : "orbit_lives";
      // Only alter a direct, non-grantable SELECT. This allows exact restoration
      // without changing role inheritance or grant options.
      if (sql(`SELECT is_grantable FROM information_schema.role_table_grants
        WHERE table_schema='public' AND table_name='${table}'
          AND grantee='service_role' AND privilege_type='SELECT';`) !== "NO") {
        throw new Error("Unexpected initial SELECT grant; refusing injection.");
      }
      activeTable = table; // Set before I/O: even partial failure must restore.
      sql(`REVOKE SELECT ON public.${table} FROM service_role;`);
      if (sql(`SELECT has_table_privilege('service_role', 'public.${table}', 'SELECT');`) !== "f") {
        throw new Error("Fault injection did not remove SELECT.");
      }
    } else if (command === "restore") {
      restore();
    } else if (command === "dispose") {
      dispose();
      result = { selectRestored: true, fixtureRowsRemaining: 0 };
    } else {
      throw new Error("Unknown fault command.");
    }
    reply({ id, result });
  } catch (error) {
    reply({ id, error: error.message });
  }
});
