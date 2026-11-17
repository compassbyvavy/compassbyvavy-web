import { DiscoverHub } from "@/components/shell/DiscoverViews";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Discover",
  description: "Everything to do with kids in Ontario. Nine categories. Listings open as each place is checked.",
  path: "/discover",
});

export default function DiscoverPage() {
  return <DiscoverHub city="ontario" cityName="Ontario" />;
}
