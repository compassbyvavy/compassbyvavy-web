export const metadata = {
  title: "About",
  description: "The story and purpose behind Compass by Vavy.",
};

export default function AboutPage() {
  return (
    <section className="page-hero">
      <div className="container narrow">
        <span className="eyebrow">Our story</span>
        <h1>Built from one parent’s search for better family experiences</h1>
        <p className="hero-lead">
          Compass by Vavy is being created to help families discover, compare
          and plan meaningful experiences without searching across dozens of
          websites and social accounts.
        </p>
        <div className="content-card">
          <h2>Our purpose</h2>
          <p>
            Childhood moves quickly. We want to make it easier for parents to
            find experiences that bring families together, support children’s
            interests and make weekends feel less stressful.
          </p>
          <h2>Our first focus</h2>
          <p>
            We are starting in the Greater Toronto Area with thoughtfully
            organized parks, splash pads, indoor play, events, camps, classes,
            food stops and family getaways.
          </p>
          <h2>Contact</h2>
          <p>
            Reach us at <a href="mailto:hello@compassbyvavy.ca">hello@compassbyvavy.ca</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
