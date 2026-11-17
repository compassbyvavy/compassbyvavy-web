import { PrintableCard } from "@/components/shell/PrintableCard";
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
        <h1>For the parenting learning curve</h1>
        <p className="lede">Only what is really ready. Empty shelves stay hidden.</p>
        <h2>Free printables</h2>
        <PrintableCard />
      </div>
    </section>
  );
}
