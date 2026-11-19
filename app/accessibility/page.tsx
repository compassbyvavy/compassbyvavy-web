import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Accessibility",
  description: "How Compass by Vavy approaches accessibility on this website.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Accessibility</h1>
        <p className="lede">
          The site is built to work with a keyboard, a screen reader, and a phone. Text is meant to meet WCAG AA contrast, and buttons and links are at least 44 pixels tall.
        </p>
        <p>
          If something gets in the way, write to <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a>.
        </p>
      </div>
    </section>
  );
}
