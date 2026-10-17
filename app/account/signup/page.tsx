import { SignupSync } from "@/components/account/SignupSync";

export const metadata = {
  title: "Keep your list",
  description:
    "Optional stub that copies guest state after the server confirms. No auth provider is connected.",
};

export default function SignupPage() {
  return (
    <div className="container" style={{ padding: "32px 0 72px" }}>
      <p style={{ color: "#8a5f2a", fontWeight: 700, letterSpacing: "0.08em" }}>
        ACCOUNT
      </p>
      <h1>Keep what you have gathered</h1>
      <p style={{ maxWidth: "40rem", color: "#5e6b68" }}>
        This copies the guest shortlist, recent camp views, compare ids, and
        sibling ages. The device copy stays until the sync route says it
        accepted them.
      </p>
      <SignupSync />
    </div>
  );
}
