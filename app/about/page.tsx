import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "About",
  description: "Compass by Vavy is built by Vineeta, an Ontario parent of two.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>About Compass by Vavy</h1>
        <p className="lede">
          Compass by Vavy is built by Vineeta, an Ontario parent of two. It is for families across Ontario: places, camps, classes and events, checked by a parent.
        </p>
        <p>
          The longer story is Vineeta&apos;s to write. Listings are not on the site yet.
        </p>
        <p>
          Contact <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a>.
        </p>
      </div>
    </section>
  );
}
