import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Terms",
  description: "Terms for the Compass by Vavy pre-launch website.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Terms</h1>
        <p>
          This pre-launch website describes Compass by Vavy. Features, categories, and launch plans may change. Listings, prices, and bookings are not on the site yet.
        </p>
        <p>
          Nothing here is a substitute for confirming hours, safety, prices, or policies with a provider once listings exist.
        </p>
        <p>The activity book is not for sale. There is no price and no checkout.</p>
      </div>
    </section>
  );
}
