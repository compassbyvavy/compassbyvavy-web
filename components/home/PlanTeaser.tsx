const chips = ["Rainy Saturday", "Ages 4 and 7", "10 am – 3 pm", "Under $50"];
const rows = ["Indoor play", "A park", "A class"];

export function PlanTeaser() {
  return (
    <section className="home-section" id="plan">
      <div className="container">
        <div className="home-plan">
          <div>
            <p className="home-eyebrow">PLAN</p>
            <h2>Tell us your day. Get a short list.</h2>
          </div>
          <div className="home-plan-card">
            <p className="home-plan-note">Example</p>
            <div className="home-chips">
              {chips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
            <ul className="home-plan-rows">
              {rows.map((row) => (
                <li key={row}>
                  <span>{row}</span>
                  <button type="button" disabled>
                    Save
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
