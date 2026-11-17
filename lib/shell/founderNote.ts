import { isCloudflareWorkersPreviewHostname } from "@/lib/camps/reviewPreviewGate";

/**
 * The founder note is Vineeta's to write. Until she does, a marked
 * placeholder is shown only on local and Cloudflare preview hosts.
 * Production renders no founder section, so stand-in words never ship as hers.
 */
export function founderNoteVisibility(
  hostname: string | null | undefined,
): "placeholder" | "hidden" {
  const host = hostname?.split(":")[0]?.trim().toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return "placeholder";
  if (isCloudflareWorkersPreviewHostname(host)) return "placeholder";
  return "hidden";
}
