import Link from "next/link";

const HREF = "/guides/printables/space-mission-scavenger-hunt";
const PDF = "/printables/space-mission-scavenger-hunt.pdf";

export function PrintableCard() {
  return (
    <article className="printable-card">
      <Link className="printable-thumb" href={HREF}>
        <img
          src="/printables/space-mission-cover.png"
          alt="First page of the Space Mission Scavenger Hunt printable"
          width={575}
          height={763}
        />
      </Link>
      <div className="printable-copy">
        <p className="printable-label">Free printable · Ages 6–8</p>
        <h3>
          <Link href={HREF}>Space Mission Scavenger Hunt</Link>
        </h3>
        <p>40 clue chits, from the Sun to the edge of the universe.</p>
        <a className="button" href={PDF} download>
          Download free
        </a>
      </div>
    </article>
  );
}
