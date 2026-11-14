import Link from "next/link";
import "../learn.css";

const PDF_HREF = "/printables/space-mission-scavenger-hunt.pdf";

export const metadata = {
  title: "Space Mission Scavenger Hunt — free printable",
  description:
    "A free printable indoor scavenger hunt for ages 6–8. 40 clue chits travel from the Sun to the edge of the universe, teaching a space fact at every stop.",
  openGraph: {
    title: "Space Mission Scavenger Hunt — free printable",
    description:
      "40 clue chits, one space fact per chit. Riddles, secret codes and scrambled words for ages 6–8.",
    url: "https://compassbyvavy.ca/learn/space-mission-scavenger-hunt",
  },
};

const FACTS = [
  { label: "Ages", value: "6–8" },
  { label: "Clue chits", value: "40" },
  { label: "Time", value: "60–90 min" },
  { label: "Where", value: "Indoors, at home" },
  { label: "Cost", value: "Free" },
];

const STAGES = [
  {
    name: "The Sun, Mercury & Venus",
    chits: "1–8",
    learns: "Why a year on Mercury lasts 88 days, and why Venus is the hottest planet.",
  },
  {
    name: "Earth & the Moon",
    chits: "9–16",
    learns: "What causes winter, why we have day and night, and where the word “month” comes from.",
  },
  {
    name: "Mars & the Asteroid Belt",
    chits: "17–22",
    learns: "Why Mars is red, its two tiny moons, and the robot rovers driving there.",
  },
  {
    name: "The Giant Planets",
    chits: "23–33",
    learns: "Jupiter’s giant storm, Saturn’s icy rings, and the planet that rolls on its side.",
  },
  {
    name: "Pluto, Stars & the Universe",
    chits: "34–40",
    learns: "Comets, constellations, galaxies and black holes.",
  },
];

const SAMPLES = [
  {
    n: 1,
    fact: "The Sun is a star. It is so big that more than a million Earths could fit inside it!",
    clue: "Riddle: I hum all day and night. When you open me, a little light turns on. Inside it’s always winter, the opposite of the Sun. What am I?",
  },
  {
    n: 4,
    fact: "Mercury goes all the way around the Sun in just 88 days, so a year there is only 88 days long!",
    clue: "Secret code: 3 - 12 - 15 - 3 - 11. Mercury would win a race against me! (A=1, B=2 … Z=26)",
  },
  {
    n: 18,
    fact: "Mars has the biggest volcano in the solar system, Olympus Mons.",
    clue: "Math mission: How many moons does Mars have? Add 1. Go to that step on the stairs, counting from the bottom.",
  },
];

const STEPS = [
  "Print the PDF and cut along the dashed lines. Fold each chit so the clue is hidden.",
  "Hide chits 2 to 40. A small note at the bottom of each chit says where it goes, and the answer key lists them all.",
  "Hand chit 1 and the Decoder Card to your astronaut. Each clue leads to the next chit. The prize waits under their bed.",
  "Read each “Did you know?” fact together before solving the clue. Too long for one go? Play one or two stages a day.",
];

export default function SpaceMissionScavengerHuntPage() {
  return (
    <section className="page-hero learn-printable">
      <div className="container narrow">
        <nav className="learn-crumb" aria-label="Breadcrumb">
          <Link href="/learn">Learn</Link>
          <span aria-hidden="true">/</span>
          <span>Free printables</span>
        </nav>
        <span className="eyebrow">Free printable · At-home activity</span>
        <h1>Space Mission Scavenger Hunt</h1>
        <p className="hero-lead">
          An indoor treasure hunt that travels from the Sun to the edge of the
          universe. Every one of the 40 clue chits teaches a space fact, then
          sets a tough clue: riddles, secret number codes, scrambled words and
          backwards words.
        </p>

        <dl className="learn-facts">
          {FACTS.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="coming-soon-actions">
          <a className="button button-primary" href={PDF_HREF} download>
            Download the PDF
          </a>
          <a className="button button-secondary" href={PDF_HREF} target="_blank" rel="noopener">
            Open to print
          </a>
        </div>
        <p className="learn-fineprint">
          9 letter-size pages: setup and Decoder Card, 40 chits, answer key and a
          mission certificate.
        </p>

        <div className="content-card">
          <h2>What your child learns</h2>
          <ol className="learn-stages">
            {STAGES.map((stage, i) => (
              <li key={stage.name}>
                <span className="learn-stage-no">Stage {i + 1}</span>
                <div>
                  <h3>{stage.name}</h3>
                  <p>
                    <span className="learn-stage-chits">Chits {stage.chits}.</span>{" "}
                    {stage.learns}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <h2>A peek at the chits</h2>
          <div className="learn-chits">
            {SAMPLES.map((chit) => (
              <article className="learn-chit" key={chit.n}>
                <header>
                  <span>Mission Control</span>
                  <span className="learn-chit-no">#{chit.n}</span>
                </header>
                <p className="learn-chit-fact">
                  <b>Did you know?</b> {chit.fact}
                </p>
                <p className="learn-chit-clue">{chit.clue}</p>
              </article>
            ))}
          </div>

          <h2>How to set it up</h2>
          <ol className="learn-steps">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="learn-fineprint">
            No board game or toque at home? Swap that spot: rewrite the chit’s
            clue and the hiding note on the chit before it.
          </p>
        </div>
      </div>
    </section>
  );
}
