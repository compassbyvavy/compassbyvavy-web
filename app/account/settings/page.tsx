import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Settings",
  description: "Account settings will live here when accounts open.",
  path: "/account/settings",
  index: false,
});

export default function SettingsPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Settings</h1>
        <p>School board, ages, and email preferences will be settings on an account. There is no account to edit yet.</p>
      </div>
    </section>
  );
}
