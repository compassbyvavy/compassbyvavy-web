import Link from "next/link";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Account privacy",
  description: "What an account will store, and the privacy notice for the site today.",
  path: "/account/privacy",
  index: false,
});

export default function AccountPrivacyPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Privacy</h1>
        <p>Accounts are not open, so there is no profile to download or delete yet.</p>
        <p>
          The site privacy notice is at <Link href="/privacy">Privacy</Link>.
        </p>
      </div>
    </section>
  );
}
