import Link from "next/link";
import { notFound } from "next/navigation";
import type { CampSource, CampSourceSnapshot } from "@/data/camps/ingestion/types";
import { getIngestionDevContext } from "@/lib/camps/ingestion/devStore";
import {
  DEFAULT_CHECK_INTERVAL_HOURS,
  freshnessLabel,
  isSourceDue,
} from "@/lib/camps/ingestion/freshness";
import { shortHash } from "@/lib/camps/ingestion/hash";
import { sourceHealthLabel } from "@/lib/camps/ingestion/qualityFlags";
import { suggestExtractorKey } from "@/lib/camps/ingestion/extractors/registry";
import { CAMP_FETCH_ALLOWLIST, isFetchAllowlisted } from "@/lib/camps/ingestion/sources/seedSources";
import styles from "../ingestion-admin.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Camps ingestion sources (dev only)",
  robots: { index: false, follow: false },
};

function healthClass(label: string): string {
  switch (label) {
    case "Healthy":
      return styles.healthHealthy;
    case "Changed":
      return styles.healthChanged;
    case "Failed":
      return styles.healthFailed;
    case "Blocked":
      return styles.healthBlocked;
    case "Manual":
      return styles.healthManual;
    case "Unsupported":
      return styles.healthUnsupported;
    default:
      return "";
  }
}

function extractorLabel(source: CampSource): string {
  if (source.extractorKey) return source.extractorKey;
  const suggested = suggestExtractorKey(source);
  return `${suggested} (resolved)`;
}

/**
 * Development-only source registry for camps ingestion.
 *
 * Shows what the scheduler and the hash gate will do next: when each source is
 * due, which extractor will read it, the last content hash the gate compares
 * against, and whether the source is allowed to be fetched at all.
 */
export default async function CampsIngestionSourcesPage() {
  const context = getIngestionDevContext();
  if (!context) {
    notFound();
  }

  const now = new Date("2026-09-12T16:30:00.000Z");
  const [sources, snapshots, extractionRuns] = await Promise.all([
    context.store.sources.listSources(),
    context.store.snapshots.listSnapshots(),
    context.store.extractions.listExtractionRuns(12),
  ]);

  const latestBySource = new Map<string, CampSourceSnapshot>();
  for (const snapshot of snapshots) {
    const existing = latestBySource.get(snapshot.sourceId);
    if (!existing || snapshot.retrievedAt > existing.retrievedAt) {
      latestBySource.set(snapshot.sourceId, snapshot);
    }
  }

  return (
    <div className={styles.page}>
      <p className={styles.banner}>
        DEV ONLY — ingestion source registry. Fixture data in a process-lifetime
        memory store. Blocked in production via the ingestion fixture gate. Only
        allowlisted sources are ever fetched over the network.
      </p>

      <nav className={styles.nav} aria-label="Ingestion admin">
        <Link href="/camps/admin/ingestion">Review queue</Link>
        <Link href="/camps/admin/ingestion/sources">Source registry</Link>
        <Link href="/camps">Public camps listing</Link>
      </nav>

      <h1>Source registry</h1>
      <p className={styles.lede}>
        Track provider sources, crawl strategy, schedule, and health. Two gates
        protect the review queue: matching <strong>content hash</strong> skips
        extraction entirely; matching <strong>fact fingerprint</strong> after a
        raw change records a non-semantic check with no candidates. Registering
        a source does not permit fetching it: the fetch allowlist is a separate
        code-level decision, currently{" "}
        <code>{CAMP_FETCH_ALLOWLIST.join(", ") || "empty"}</code>.
      </p>

      <section className={styles.section}>
        <h2>Sources ({sources.length})</h2>
        {sources.map((source) => {
          const latest = latestBySource.get(source.id) ?? null;
          const health = sourceHealthLabel(source, latest);
          const fresh = freshnessLabel(source.lastCheckedAt, now);
          return (
            <article key={source.id} className={styles.sourceRow}>
              <div>
                <strong>{source.id}</strong> · {source.sourceType} ·{" "}
                <span className={`${styles.health} ${healthClass(health)}`}>
                  {health}
                </span>
              </div>
              <div className={styles.meta}>
                <span>
                  Provider: <code>{source.providerId}</code>
                </span>
                <span>
                  Strategy: <code>{source.crawlStrategy}</code>
                </span>
                <span>
                  Frequency: <code>{source.crawlFrequency}</code>
                </span>
                <span>Active: {source.isActive ? "yes" : "no"}</span>
                <span>Freshness: {fresh}</span>
              </div>
              <div className={styles.meta}>
                <span>
                  URL: <code>{source.sourceUrl}</code>
                </span>
                <span>
                  Canonical: <code>{source.canonicalUrl}</code>
                </span>
              </div>
              <div className={styles.meta}>
                <span>
                  Extractor: <code>{extractorLabel(source)}</code>
                </span>
                <span>
                  Interval:{" "}
                  <code>
                    {source.checkIntervalHours ?? DEFAULT_CHECK_INTERVAL_HOURS}h
                  </code>
                </span>
                <span>
                  Next check: <code>{source.nextCheckAt ?? "—"}</code>
                  {isSourceDue(source, now) ? " (due)" : null}
                </span>
                <span>
                  Fetch allowlisted: {isFetchAllowlisted(source.id) ? "yes" : "no"}
                </span>
              </div>
              <div className={styles.meta}>
                <span>
                  Last checked: <code>{source.lastCheckedAt ?? "—"}</code>
                </span>
                <span>
                  Last success: <code>{source.lastSuccessfulAt ?? "—"}</code>
                </span>
                <span>
                  Last changed: <code>{source.lastChangedAt ?? "—"}</code>
                </span>
                <span>
                  Content hash: <code>{shortHash(source.lastContentHash)}</code>
                </span>
                <span>
                  Fact fingerprint:{" "}
                  <code>{shortHash(source.lastFactFingerprint)}</code>
                </span>
                <span>
                  Latest snapshot: <code>{latest?.id ?? "—"}</code>
                  {latest ? ` (${latest.fetchStatus})` : null}
                  {latest?.factFingerprint
                    ? ` · facts ${shortHash(latest.factFingerprint)}`
                    : null}
                </span>
              </div>
              {source.lastError ? (
                <p className={styles.flags}>
                  Last error ({source.lastErrorAt ?? "unknown time"}):{" "}
                  {source.lastError}
                </p>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className={styles.section}>
        <h2>Recent extraction runs</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Snapshot</th>
                <th>Status</th>
                <th>Extractor</th>
                <th>Error / warnings</th>
              </tr>
            </thead>
            <tbody>
              {extractionRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <code>{run.id}</code>
                  </td>
                  <td>
                    <code>{run.snapshotId}</code>
                  </td>
                  <td>{run.status}</td>
                  <td>
                    <code>{run.extractorVersion}</code>
                  </td>
                  <td>
                    {run.error ?? (run.warnings.length ? run.warnings.join("; ") : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
