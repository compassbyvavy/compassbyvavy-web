import { WHAT_WE_CHECK } from "@/lib/shell/questions";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "How we check",
  description: "The questions every Compass listing answers, and what Vavy-checked means.",
  path: "/how-we-check",
});

export default function HowWeCheckPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>How we check</h1>
        <p className="lede">Every listing answers the same questions. A missing fact stays unknown.</p>
        <p>
          <span className="vavy-pill">✓ Vavy-checked</span>
        </p>
        <p>Vavy-checked means Vineeta has been there in person.</p>
        <ol>
          {WHAT_WE_CHECK.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
