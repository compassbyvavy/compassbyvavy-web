import Link from "next/link";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Guides",
  description: "Free printables for families. Age guides are not published yet.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <p className="kicker">Guides</p>
        <h1>Guides and printables</h1>
        <p className="lede">Only what is really ready. Empty shelves stay hidden.</p>
        <h2>Free printables</h2>
        <Link className="guide-card" href="/guides/printables/space-mission-scavenger-hunt">
          <span className="kicker">Ages 6–8 · 40 clue chits</span>
          <strong>Space Mission Scavenger Hunt</strong>
          <span>An indoor hunt from the Sun to the edge of the universe.</span>
        </Link>
      </div>
    </section>
  );
}
