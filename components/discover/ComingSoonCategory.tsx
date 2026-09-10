import type { DiscoverCategory } from "@/lib/discover/categories";

export function ComingSoonCategory({
  category,
}: {
  category: DiscoverCategory;
}) {
  return (
    <section className="page-hero coming-soon-page">
      <div className="container narrow">
        <span className="eyebrow">Discover</span>
        <p className="coming-soon-icon" aria-hidden="true">
          {category.icon}
        </p>
        <h1>{category.title}</h1>
        <p className="hero-lead">{category.blurb}</p>
        <div className="content-card">
          <p className="coming-soon-kicker">Coming soon</p>
          <p>
            This category is on the Compass map, but listings are not live
            yet. We will not show placeholder camps, parks, or shops here.
          </p>
          {category.groupingNote ? <p>{category.groupingNote}</p> : null}
          <p>
            Camps is the live wedge today — Mississauga sessions you can
            check without an account. Weekend clarity first; citywide
            completeness is not a claim we make.
          </p>
          <div className="coming-soon-actions">
            <a className="button button-primary" href="/camps">
              Browse camps
            </a>
            <a className="button button-secondary" href="/#discover">
              Back to Discover
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
