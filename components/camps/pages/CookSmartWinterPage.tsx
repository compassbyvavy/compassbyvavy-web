"use client";

import { useMemo, useState } from "react";
import { parentCopy } from "@/lib/voice/copy";
import {
  COOKSMART_DAYS,
  COOKSMART_OPTION_NAME,
  COOKSMART_PRICE,
  COOKSMART_WINTER_SLUG,
  cooksmartBookingUrl,
  cooksmartOptionId,
  cooksmartTaxTotal,
  cooksmartWinter,
  summarizeCooksmartBar,
  withCooksmartExclusivePick,
  type CooksmartOptionKind,
  type CooksmartPick,
} from "@/lib/camps/pages/cooksmartWinter";

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CookSmartWinterPage({ banner = null }: { banner?: string | null }) {
  const page = cooksmartWinter;
  const [selected, setSelected] = useState<CooksmartPick[]>([]);
  const bar = useMemo(() => summarizeCooksmartBar(selected), [selected]);

  function toggle(dayId: string, kind: CooksmartOptionKind) {
    setSelected((current) => withCooksmartExclusivePick(current, { dayId, kind }));
  }

  const bookingItems = bar.showBookingList
    ? selected.map((pick) => {
        const day = COOKSMART_DAYS.find((row) => row.id === pick.dayId)!;
        const price = COOKSMART_PRICE[pick.kind];
        return {
          key: cooksmartOptionId(pick.dayId, pick.kind),
          title: day.title,
          name: COOKSMART_OPTION_NAME[pick.kind],
          price,
          url: cooksmartBookingUrl(pick.kind, day.iso),
        };
      })
    : [];

  return (
    <article className="listing cooksmart" data-camp={COOKSMART_WINTER_SLUG}>
      {banner ? <div className="listing-banner">{banner}</div> : null}
      <div className="listing-wrap">
        <div className="listing-crumbs">
          <a href="/">{parentCopy.discover}</a> › <a href="/camps">{parentCopy.camps}</a> ›{" "}
          {parentCopy.breaks.winter}
        </div>
        <h1>{page.title}</h1>
        <p className="listing-provider">{page.providerLine}</p>
        <div className="cooksmart-badge">{page.badge}</div>
        <div className="listing-summary">
          <Html html={page.summaryHtml} />
        </div>
        <div className="listing-facts">
          {page.facts.map((fact) => (
            <div className="listing-fact" key={fact.label}>
              <div className="k">{fact.label}</div>
              {fact.values.map((value) => (
                <div className={fact.missing ? "v is-missing" : "v"} key={value}>
                  {value}
                </div>
              ))}
              {fact.detail ? <div className="s">{fact.detail}</div> : null}
            </div>
          ))}
        </div>
        <div className="listing-status is-open">
          <div className="listing-dot" />
          <div>
            <b>{page.statusHeadline}</b>
            {page.statusDetail}
            <br />
            <span>{page.statusChecked}</span>
          </div>
        </div>
        <div className="cooksmart-catch">
          <h2>{parentCopy.isThisRight}</h2>
          <ul>
            {page.catchLines.map((line) => (
              <li key={line.html}>
                <Html html={line.html} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <nav className="listing-pills listing-wrap" aria-label="Sections">
        {page.pills.map((pill) => (
          <a key={pill.href} href={pill.href}>
            {pill.label}
          </a>
        ))}
      </nav>

      <div className="listing-wrap">
        <section id="sessions">
          <h2>{parentCopy.pickYourDays}</h2>
          <div className="cooksmart-key">
            {page.optionKeys.map((key) => (
              <div key={key.title}>
                <b>{key.title}</b> · {key.meta}
                <br />
                <span>{key.blurb}</span>
              </div>
            ))}
          </div>
          <p className="listing-sub">
            <Html html={page.sessionsIntroHtml} />
          </p>
          <div className="cooksmart-days">
            {COOKSMART_DAYS.map((day) => (
              <div className="cooksmart-dcard" key={day.id}>
                <h3>{day.title}</h3>
                {(
                  [
                    ["full", day.fullSpots],
                    ["half", day.halfSpots],
                  ] as const
                ).map(([kind, spots]) => {
                  const on = selected.some((item) => item.dayId === day.id && item.kind === kind);
                  return (
                    <label className={on ? "listing-opt is-sel" : "listing-opt"} key={kind}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(day.id, kind)}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="l1">{COOKSMART_OPTION_NAME[kind]}</div>
                        <div className="l2">
                          {spots} spots on Nov 21
                        </div>
                      </div>
                      <div className="price">${COOKSMART_PRICE[kind]}</div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          {bar.showBookingList ? (
            <div id="booklist" className="cooksmart-booklist">
              <h3>{parentCopy.yourBookingList}</h3>
              <p className="listing-note" style={{ margin: "0 0 6px" }}>
                {page.bookingListNote}
              </p>
              {bookingItems.map((item) => (
                <div className="cooksmart-brow" key={item.key}>
                  <div>
                    <b>{item.title}</b> · {item.name}
                    <small>
                      ${item.price} + HST = ${cooksmartTaxTotal(item.price)}
                    </small>
                  </div>
                  <a className="cooksmart-bk" href={item.url} target="_blank" rel="noopener">
                    {parentCopy.bookArrow}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div id="booklist" hidden />
          )}
          <p className="listing-note">{page.siblingsNote}</p>
        </section>

        <section id="about">
          <h2>{parentCopy.whatKidsDo}</h2>
          <p className="listing-sub">{page.timelineIntro}</p>
          <dl>
            {page.timeline.map((row) => (
              <div className="listing-row" key={row.time}>
                <dt>{row.time}</dt>
                <dd>
                  <Html html={row.html} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="listing-note">{page.timelineNote}</p>
          <h3 className="cooksmart-learn-title">{page.learnTitle}</h3>
          <dl>
            {page.learn.map((row) => (
              <div className="listing-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.text}</dd>
              </div>
            ))}
          </dl>
          <p className="listing-note">{page.learnNote}</p>
        </section>

        <section id="questions">
          <h2>{parentCopy.parentQuestions}</h2>
          <p className="listing-sub">{page.questionsIntro}</p>
          {page.questions.map((q) => (
            <details className="cooksmart-q" key={q.question}>
              <summary>
                <span>{q.question}</span>
                <span className={q.askTheCamp ? "a ask" : "a"}>
                  {q.askTheCamp ? parentCopy.askTheCamp : q.shortAnswer}
                </span>
              </summary>
              <div className="ans">
                <Html html={q.answer} />
                {q.sourceLine ? <span className="lvl">{q.sourceLine}</span> : null}
              </div>
            </details>
          ))}
        </section>

        <section id="where">
          <h2>{parentCopy.where}</h2>
          <dl>
            {page.where.map((row) => (
              <div className="listing-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <Html html={row.html} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="say">
          <h2>{parentCopy.whatParentsSay}</h2>
          <p className="cooksmart-say-head">
            <Html html={page.parentsSayHeadlineHtml} />
          </p>
          <ul className="listing-plain">
            {page.parentsSayThemes.map((theme) => (
              <li key={theme}>{theme}</li>
            ))}
          </ul>
          <p className="listing-note">{page.parentsSayNote}</p>
        </section>

        <section id="checked">
          <h2>{parentCopy.howWeChecked}</h2>
          <ul className="listing-plain listing-src">
            {page.sourcesHtml.map((html) => (
              <li key={html}>
                <Html html={html} />
              </li>
            ))}
          </ul>
          <div className="cooksmart-links">
            {page.footerLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="listing-bar">
        <div className="listing-wrap">
          <div className="listing-sum">
            <b>{bar.title}</b>
            {bar.detail}
          </div>
          <div className="listing-btns">
            <a
              className="listing-btn pri"
              href={bar.href}
              {...(bar.openInNewTab ? { target: "_blank", rel: "noopener" } : {})}
            >
              {bar.buttonLabel}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
