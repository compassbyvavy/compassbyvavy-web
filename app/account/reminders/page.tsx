import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Reminders",
  description: "Reminders will live in your Compass account. They are not on yet.",
  path: "/account/reminders",
  index: false,
});

export default function RemindersPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Reminders</h1>
        <p>Reminders for registration dates and PA days will live here once accounts open. None are set up yet.</p>
      </div>
    </section>
  );
}
