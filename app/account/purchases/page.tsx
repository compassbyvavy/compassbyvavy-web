import { shellMeta } from "@/lib/shell/meta";

export const metadata = shellMeta({
  title: "Purchases",
  description: "Purchases will appear here when something is for sale.",
  path: "/account/purchases",
  index: false,
});

export default function PurchasesPage() {
  return (
    <section className="band">
      <div className="shell-wrap prose">
        <h1>Purchases</h1>
        <p>Nothing is for sale yet, so this list is empty.</p>
      </div>
    </section>
  );
}
