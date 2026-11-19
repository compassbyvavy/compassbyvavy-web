import Link from "next/link";
import { SaveButton } from "@/components/shell/SaveButton";
import { shellMeta } from "@/lib/shell/meta";

const PDF = "/printables/space-mission-scavenger-hunt.pdf";

export const metadata = shellMeta({
  title: "Space Mission Scavenger Hunt",
  description: "A free printable indoor scavenger hunt for ages 6–8. 40 clue chits, one space fact each.",
  path: "/guides/printables/space-mission-scavenger-hunt",
});

const FACTS = [
  ["Ages", "6–8"],
  ["Clue chits", "40"],
  ["Time", "60–90 min"],
  ["Where", "Indoors, at home"],
  ["Cost", "Free"],
];

export default function SpaceMissionPage() {
  return (
    <article className="band">
      <div className="shell-wrap prose">
        <p className="kicker">
          <Link href="/guides">Guides</Link> · Free printable
        </p>
        <div className="title-row">
          <h1>Space Mission Scavenger Hunt</h1>
          <SaveButton
            item={{
              id: "guide-space-mission",
              title: "Space Mission Scavenger Hunt",
              href: "/guides/printables/space-mission-scavenger-hunt",
            }}
          />
        </div>
        <p className="lede">
          Forty clue chits travel from the Sun to the edge of the universe. Each one teaches a space fact before the next clue.
        </p>
        <dl className="fact-list">
          {FACTS.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p>
          <a className="button" href={PDF}>
            Download the PDF
          </a>
        </p>
        <h2>How to play</h2>
        <ol>
          <li>Print the PDF and cut along the dashed lines. Fold each chit so the clue is hidden.</li>
          <li>Hide chits 2 to 40. A small note on each chit says where it goes.</li>
          <li>Hand chit 1 and the decoder card to your astronaut. Each clue leads to the next.</li>
          <li>Read each fact together before solving the clue.</li>
        </ol>
      </div>
    </article>
  );
}
