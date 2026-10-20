export const metadata = {
  title: "Account",
  description:
    "Compass works without an account. Your saved list stays on this device.",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <section className="page-hero coming-soon-page">
      <div className="container narrow">
        <span className="eyebrow">Account</span>
        <h1>No account needed</h1>
        <p className="hero-lead">
          You can browse, save and compare without signing up. Your saved list
          and tracker live on this device only.
        </p>
        <div className="content-card">
          <p className="coming-soon-kicker">Accounts are coming later</p>
          <p>
            When accounts arrive, they&apos;ll let you keep your list across
            devices and add your children&apos;s ages and interests. Our
            commitments won&apos;t change:
          </p>
          <ul>
            <li>You can delete your data at any time.</li>
            <li>Your data is never sold.</li>
            <li>There are no public child profiles.</li>
            <li>
              Nothing about your family is shared with a provider unless you
              choose to share it.
            </li>
          </ul>
          <div className="coming-soon-actions">
            <a className="button button-primary" href="/saved">
              Go to your saved list
            </a>
            <a className="button button-secondary" href="/privacy">
              Read our privacy notes
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
