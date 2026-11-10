import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MSC_0007_ACTIVITY_ID,
  MSC_0007_ACTIVITY_NUMBER,
} from "@/data/camps/real/msc0007";
import { getActiveNetMappingByCandidateId } from "@/lib/camps/availability/activenet/registry";
import {
  activeNetActivityPageUrl,
  activeNetDetailApiUrl,
  activeNetEnrollUrl,
  urlUsesInternalActivityId,
  urlsForMapping,
} from "@/lib/camps/availability/activenet/urls";

describe("ActiveNet URLs use internal activity_id", () => {
  const mapping = getActiveNetMappingByCandidateId("MSC-0007");
  assert.ok(mapping);

  it("keeps public activity_number out of API and booking paths", () => {
    const urls = urlsForMapping(mapping);
    assert.equal(
      urls.apiUrl,
      `https://anc.ca.apm.activecommunities.com/activemississauga/rest/activity/detail/${MSC_0007_ACTIVITY_ID}`,
    );
    assert.match(urls.bookingUrl, /\/enroll\/145871\?locale=en-US$/);
    assert.match(urls.sourceUrl, /\/detail\/145871$/);
    for (const url of Object.values(urls)) {
      assert.equal(urlUsesInternalActivityId(url, mapping), true);
      assert.doesNotMatch(new URL(url).pathname, new RegExp(`/${MSC_0007_ACTIVITY_NUMBER}(/|$)`));
      assert.notEqual(String(MSC_0007_ACTIVITY_ID), MSC_0007_ACTIVITY_NUMBER);
    }
  });

  it("would reject a URL that used the public number", () => {
    const wrong = activeNetEnrollUrl(Number(MSC_0007_ACTIVITY_NUMBER));
    assert.equal(urlUsesInternalActivityId(wrong, mapping), false);
    assert.equal(
      activeNetDetailApiUrl(Number(MSC_0007_ACTIVITY_NUMBER)).includes("145871"),
      false,
    );
    assert.equal(activeNetActivityPageUrl(mapping.activityId).includes("145871"), true);
  });
});
