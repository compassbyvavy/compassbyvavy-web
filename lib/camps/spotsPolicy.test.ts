import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261113120000_camp_session_spots.sql"),
  "utf8",
);

function policy(name: string): string {
  const marker = `create policy ${name}`;
  const start = migration.indexOf(marker);
  assert.ok(start >= 0, name);
  const next = migration.indexOf("create policy", start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe("camp spot tables", () => {
  it("lets anon read spots only for a published session", () => {
    const body = policy("camp_session_spots_public_read");
    assert.match(body, /for select/);
    assert.match(body, /to anon, authenticated/);
    assert.match(body, /publication_state = 'published'/);
    assert.match(body, /published_at is not null/);
    assert.match(migration, /grant select on table public\.camp_session_spots to anon, authenticated/);
    assert.doesNotMatch(migration, /grant insert on table public\.camp_session_spots/);
    assert.doesNotMatch(migration, /grant update on table public\.camp_session_spots/);
    assert.doesNotMatch(migration, /grant delete on table public\.camp_session_spots/);
  });

  it("gives anon no access to booking refs or check runs", () => {
    for (const table of ["camp_session_booking_refs", "camp_spot_check_runs"]) {
      assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated, public`));
      assert.doesNotMatch(migration, new RegExp(`grant .+ on table public\\.${table}`));
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    }
    const policies = migration.match(/create policy /g) ?? [];
    assert.deepEqual(policies, ["create policy "]);
    assert.match(migration, /create policy camp_session_spots_public_read/);
  });
});
