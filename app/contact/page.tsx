import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Contact",
  description: "Write to Compass by Vavy at hello@compassbyvavy.ca.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Contact</h1>
        <p className="lede">
          Write to <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a>.
        </p>
      </div>
    </section>
  );
}
