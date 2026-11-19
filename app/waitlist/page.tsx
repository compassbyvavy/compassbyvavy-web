import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { requestCity } from "@/lib/shell/city";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Join the waitlist",
  description: "Get one email when Compass by Vavy opens.",
  path: "/waitlist",
});

export default async function WaitlistPage() {
  const city = await requestCity();
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Join the waitlist</h1>
        <p className="lede">One email when Compass opens. The box starts unticked, and you can unsubscribe any time.</p>
        <WaitlistForm idPrefix="waitlist-page" sourcePage="/waitlist" city={city.name} />
      </div>
    </section>
  );
}
