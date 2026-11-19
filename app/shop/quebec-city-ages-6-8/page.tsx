import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Québec City with Kids, ages 6–8",
  description: "An activity book for a family trip to Québec City. Not for sale yet.",
  path: "/shop/quebec-city-ages-6-8",
});

const INSIDE = [
  "Puzzles and mazes",
  "Fun facts",
  "French words to try",
  "A checklist of sights",
  "Car-trip pages",
  "A trip journal",
];

export default function QuebecBookPage() {
  return (
    <article className="band">
      <div className="shell-wrap book-layout">
        <div className="book-cover" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={72} height={72} />
          <p>Québec City with Kids</p>
          <span>Ages 6–8</span>
        </div>
        <div className="prose">
          <p className="kicker">Activity book</p>
          <h1>Québec City with Kids</h1>
          <p className="lede">Written for ages 6–8. The book is not for sale yet, so there is no price and no buy button.</p>
          <h2>What&apos;s inside</h2>
          <ul className="type-list">
            {INSIDE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2>Questions</h2>
          <dl className="fact-list">
            <div>
              <dt>Ages</dt>
              <dd>Written for ages 6–8.</dd>
            </div>
            <div>
              <dt>Print at home</dt>
              <dd>A PDF is planned, for printing at home. It is not ready yet.</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Nothing ships today.</dd>
            </div>
            <div>
              <dt>Refunds</dt>
              <dd>The refund policy will be published when the book is for sale.</dd>
            </div>
          </dl>
          <h2>Notify me</h2>
          <WaitlistForm
            idPrefix="book-quebec"
            sourcePage="/shop/quebec-city-ages-6-8"
            category="shop"
            buttonLabel="Notify me"
            consentLabel="Email me when this book is ready."
          />
        </div>
      </div>
    </article>
  );
}
