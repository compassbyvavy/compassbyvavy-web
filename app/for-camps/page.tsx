import { WaitlistForm } from "@/components/shell/WaitlistForm";
import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "For camps",
  description: "List a camp or venue on Compass by Vavy when listings open.",
  path: "/for-camps",
});

export default function ForCampsPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>For camps and venues</h1>
        <p className="lede">Listings are not open yet. Leave your email and we will write when camps and venues can be added.</p>
        <WaitlistForm
          idPrefix="for-camps"
          sourcePage="/for-camps"
          category="camps"
          buttonLabel="Email me"
          consentLabel="Email me when Compass is ready for camp and venue listings."
        />
        <h2 id="update">Update a listing</h2>
        <p>
          Updates are not open yet. For anything else, write to{" "}
          <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a>.
        </p>
      </div>
    </section>
  );
}
