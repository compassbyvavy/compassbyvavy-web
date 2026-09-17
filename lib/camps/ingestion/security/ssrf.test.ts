/**
 * Tests for the camp source fetch SSRF guard.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPASS_CAMP_FETCH_USER_AGENT,
  UnsafeFetchTargetError,
  assertSafeHttpUrl,
  assertSafeRedirectTarget,
  assertSafeResolvedHost,
  classifyFetchHost,
  isSafeFetchHost,
} from "@/lib/camps/ingestion/security/ssrf";

function refusalReason(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof UnsafeFetchTargetError) return error.reason;
    throw error;
  }
  throw new Error("expected the target to be refused");
}

describe("assertSafeHttpUrl", () => {
  it("allows ordinary public provider URLs", () => {
    const url = assertSafeHttpUrl("https://www.creativekidsplace.com/summer-camp");
    assert.equal(url.hostname, "www.creativekidsplace.com");
    assert.equal(assertSafeHttpUrl("http://example.com:80/camps").host, "example.com");
  });

  it("blocks localhost by name", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://localhost/camps")), "blocked_hostname");
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://LOCALHOST:80/camps")),
      "blocked_hostname",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://admin.localhost/camps")),
      "blocked_hostname",
    );
  });

  it("blocks loopback addresses", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://127.0.0.1/camps")), "loopback_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://127.1.2.3/")), "loopback_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://[::1]/")), "loopback_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://0.0.0.0/")), "unspecified_address");
  });

  it("blocks loopback written as a decimal or hex integer host", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://2130706433/")), "loopback_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://0x7f000001/")), "loopback_address");
  });

  it("blocks private ranges", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://10.0.0.5/camps")), "private_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://10.255.255.254/")), "private_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://172.16.4.9/")), "private_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://192.168.1.1/")), "private_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://100.100.0.1/")), "private_address");
  });

  it("allows public addresses adjacent to private ranges", () => {
    assert.doesNotThrow(() => assertSafeHttpUrl("http://172.32.0.1/"));
    assert.doesNotThrow(() => assertSafeHttpUrl("http://11.0.0.1/"));
    assert.doesNotThrow(() => assertSafeHttpUrl("http://192.167.1.1/"));
  });

  it("blocks the cloud metadata endpoint specifically", () => {
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://169.254.169.254/latest/meta-data/")),
      "metadata_address",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://169.254.1.1/")),
      "link_local_address",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://metadata.google.internal/computeMetadata/")),
      "blocked_hostname",
    );
  });

  it("blocks IPv6 private, link-local, and IPv4-mapped forms", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://[fd00::1]/")), "unique_local_address");
    assert.equal(refusalReason(() => assertSafeHttpUrl("http://[fe80::1]/")), "link_local_address");
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://[::ffff:10.0.0.1]/")),
      "private_address",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://[::ffff:169.254.169.254]/")),
      "metadata_address",
    );
    assert.doesNotThrow(() => assertSafeHttpUrl("http://[2606:4700::1111]/"));
  });

  it("blocks non-http schemes", () => {
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("file:///etc/passwd")),
      "unsupported_scheme",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("ftp://example.com/camps.csv")),
      "unsupported_scheme",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("manual://provider/notes")),
      "unsupported_scheme",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("data:text/html,<p>camp</p>")),
      "unsupported_scheme",
    );
  });

  it("blocks unusual ports and embedded credentials", () => {
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("http://example.com:8080/camps")),
      "blocked_port",
    );
    assert.equal(
      refusalReason(() => assertSafeHttpUrl("https://user:secret@example.com/camps")),
      "embedded_credentials",
    );
  });

  it("rejects unparseable targets", () => {
    assert.equal(refusalReason(() => assertSafeHttpUrl("not a url")), "invalid_url");
    assert.equal(refusalReason(() => assertSafeHttpUrl("")), "invalid_url");
  });
});

describe("classifyFetchHost", () => {
  it("classifies hosts without needing a full URL", () => {
    assert.equal(classifyFetchHost("example.com"), null);
    assert.equal(isSafeFetchHost("example.com"), true);
    assert.equal(classifyFetchHost("192.168.0.10"), "private_address");
    assert.equal(classifyFetchHost("db.internal"), "blocked_hostname");
    assert.equal(classifyFetchHost("printer.lan"), "blocked_hostname");
    assert.equal(classifyFetchHost("example.com."), null);
    assert.equal(classifyFetchHost(""), "missing_host");
    assert.equal(isSafeFetchHost("127.0.0.1"), false);
  });
});

describe("assertSafeResolvedHost", () => {
  it("rejects a public name that resolves to a private address", () => {
    assert.doesNotThrow(() => assertSafeResolvedHost("93.184.216.34"));
    assert.equal(
      refusalReason(() => assertSafeResolvedHost("10.1.2.3", "https://camps.example.com")),
      "private_address",
    );
    assert.equal(
      refusalReason(() => assertSafeResolvedHost("169.254.169.254")),
      "metadata_address",
    );
  });
});

describe("assertSafeRedirectTarget", () => {
  it("resolves relative redirects against the current URL", () => {
    const url = assertSafeRedirectTarget(
      "https://example.com/camps",
      "/camps/summer?utm_source=x",
    );
    assert.equal(url.toString(), "https://example.com/camps/summer?utm_source=x");
  });

  it("refuses a redirect that leaves the public internet", () => {
    assert.equal(
      refusalReason(() =>
        assertSafeRedirectTarget("https://example.com/camps", "http://169.254.169.254/"),
      ),
      "metadata_address",
    );
    assert.equal(
      refusalReason(() =>
        assertSafeRedirectTarget("https://example.com/camps", "file:///etc/passwd"),
      ),
      "unsupported_scheme",
    );
  });
});

describe("COMPASS_CAMP_FETCH_USER_AGENT", () => {
  it("identifies Compass and offers a contact path", () => {
    assert.match(COMPASS_CAMP_FETCH_USER_AGENT, /CompassByVavyCampsBot/);
    assert.match(COMPASS_CAMP_FETCH_USER_AGENT, /contact:/);
  });
});
