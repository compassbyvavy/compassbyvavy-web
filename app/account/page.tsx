import Link from "next/link";
import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Account",
  description: "A preview of a Compass account. Sign-in is not open yet.",
  path: "/account",
});

export default function AccountPage() {
  return (
    <section className="band">
      <div className="shell-wrap account-layout">
        <aside className="account-nav">
          <Link href="/account">Account</Link>
          <Link href="/account/reminders">Reminders</Link>
          <Link href="/account/purchases">Purchases</Link>
          <Link href="/account/settings">Settings</Link>
          <Link href="/privacy">Privacy</Link>
        </aside>
        <div className="prose">
          <h1>Your family, your way</h1>
          <p className="lede">
            An account will hold the ages, the school board, and the reminders you choose. It is not open yet, and this page does not sign you in.
          </p>
          <ul>
            <li>Details you add make suggestions more useful. None are filled in for you.</li>
            <li>Saves on this device stay on this device until you have an account.</li>
            <li>We will email you when accounts open.</li>
          </ul>
          <WaitlistForm idPrefix="account-waitlist" sourcePage="/account" buttonLabel="Notify me" />
        </div>
      </div>
    </section>
  );
}
