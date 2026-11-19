import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Privacy",
  description: "What Compass by Vavy collects on the waitlist, and what it does not.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Privacy</h1>
        <p>
          Compass by Vavy is in pre-launch. There are no accounts yet. The waitlist, Notify me, and newsletter forms store your email, the page you used, and any category, subcategory, and city attached to that form. A shop Notify me form stores the product id in the subcategory field. They also store the time you ticked the consent box.
        </p>
        <p>The consent box starts unticked. We use the address to send the note you asked for. We do not sell it.</p>
        <p>
          Email you send to <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a> is used to reply to you.
        </p>
        <p>Saves and a school-board choice stay in your browser, on that device. They are not sent to us.</p>
        <p>This notice will be expanded before accounts, payments, and analytics are introduced.</p>
      </div>
    </section>
  );
}
