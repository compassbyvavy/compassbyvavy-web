"use client";

import { useMemo, useState } from "react";
import { SaveControl } from "@/components/shortlist/SaveControl";
import type { BuiltCampPage } from "@/lib/camps/pages/view";
import { seasonTag } from "@/lib/camps/pages/view";
import { parentCopy } from "@/lib/voice/copy";

type Selection = { id: string; label: string; price: number; day: string; exclusiveKey?: string; registerUrl?: string };

function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function CampListingPage({ page, banner = null }: { page: BuiltCampPage; banner?: string | null }) {
  const [selected, setSelected] = useState<Selection[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [lengthId, setLengthId] = useState<"week" | "three" | "two">("week");
  const [care, setCare] = useState<Record<string, boolean>>({});

  const bar = useMemo(() => summarize(page, selected, locationId, lengthId, care), [page, selected, locationId, lengthId, care]);

  function toggleDay(next: Selection, dayId: string) {
    setSelected((current) => {
      const exists = current.some((item) => item.id === next.id);
      const without = current.filter((item) => item.id !== next.id);
      if (exists) return without;
      const exclusive = next.exclusiveKey
        ? without.filter((item) => item.day !== dayId || item.exclusiveKey === next.exclusiveKey)
        : without;
      return [...exclusive, next];
    });
  }

  return (
    <article className="listing">
      {banner ? <div className="listing-banner">{banner}</div> : null}
      <div className="listing-wrap">
        <div className="listing-crumbs">
          <a href="/">{parentCopy.discover}</a> › <a href="/camps">{parentCopy.camps}</a> › {page.breakLabel}
        </div>
        <h1>{page.title}</h1>
        <p className="listing-provider">{page.providerLine}</p>
        {page.confirmed ? <p className="listing-confirmed">{page.confirmed}</p> : null}
        {page.summary ? <div className="listing-summary">{page.summary}</div> : null}
        <div className="listing-facts">
          {page.facts.map((fact) => (
            <div className="listing-fact" key={fact.label}>
              <div className="k">{fact.label}</div>
              <div className={fact.missing ? "v is-missing" : "v"}>
                {fact.value}
                {fact.stale ? <span className="listing-tag"> {seasonTag()}</span> : null}
              </div>
              {fact.detail ? <div className="s">{fact.detail}</div> : null}
              {fact.label === "Price" && page.deal ? <div className="listing-deal">{page.deal}</div> : null}
            </div>
          ))}
        </div>
        <div className={`listing-status is-${page.status.tone}`}>
          <div className="listing-dot" />
          <div>
            <b>{page.status.headline}</b>
            {page.status.detail ? page.status.detail : null}
            {page.status.checked ? (
              <>
                <br />
                <span>{page.status.checked}</span>
              </>
            ) : null}
          </div>
        </div>
        {page.catchLine ? <p className="listing-summary">{page.catchLine}</p> : null}
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
          <h2>{page.sessionsTitle}</h2>
          <p className="listing-sub">{page.picker.intro}</p>
          {page.picker.kind === "day-options" ? (
            <>
              {page.picker.weeks.map((week) => (
                <div key={week.label}>
                  <div className="listing-week">{week.label}</div>
                  <div className="listing-days">
                    {week.days.map((day) => (
                      <div className="listing-day" key={day.id}>
                        <h3>{day.title}</h3>
                        {day.options.map((option) => {
                          const on = selected.some((item) => item.id === option.id);
                          return (
                            <label className={on ? "listing-opt is-sel" : "listing-opt"} key={option.id}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  toggleDay(
                                    {
                                      id: option.id,
                                      label: day.title,
                                      price: option.price,
                                      day: day.id,
                                      exclusiveKey: option.exclusiveKey,
                                    },
                                    day.id,
                                  )
                                }
                              />
                              <div style={{ flex: 1 }}>
                                <div className="l1">{option.name}</div>
                                <div className="l2">
                                  {option.time} · {option.spots}
                                </div>
                              </div>
                              <div className="price">{money(option.price)}</div>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {page.picker.footnote ? <p className="listing-note">{page.picker.footnote}</p> : null}
            </>
          ) : null}

          {page.picker.kind === "theme-days"
            ? page.picker.days.map((day) => {
                const on = selected.some((item) => item.id === day.id);
                return (
                  <div className="listing-day" key={day.id}>
                    <label className={on ? "listing-opt is-sel" : "listing-opt"}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          toggleDay(
                            {
                              id: day.id,
                              label: day.dateLabel,
                              price: day.price,
                              day: day.id,
                              registerUrl: day.registerUrl,
                            },
                            day.id,
                          )
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div className="l2">
                          {day.dow}, {day.dateLabel} · {day.hours}
                        </div>
                        <div className="l1">{day.title}</div>
                        <div className="desc">{day.description}</div>
                        <div className="l2">{day.spots}</div>
                      </div>
                      <div className="price">{money(day.price)}</div>
                    </label>
                  </div>
                );
              })
            : null}

          {page.picker.kind === "location" ? (
            <LocationPicker
              page={page}
              locationId={locationId}
              lengthId={lengthId}
              care={care}
              onLocation={setLocationId}
              onLength={setLengthId}
              onCare={(id, on) => setCare((current) => ({ ...current, [id]: on }))}
            />
          ) : null}
        </section>

        {page.costRows?.length ? (
          <section id="cost">
            <h2>{parentCopy.cost}</h2>
            <dl>
              {page.costRows.map((row) => (
                <div className="listing-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.text}
                    {row.note ? (
                      <>
                        <br />
                        <span className="listing-note">{row.note}</span>
                      </>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            {page.costNote ? <p className="listing-note">{page.costNote}</p> : null}
          </section>
        ) : null}

        {page.activities && (page.activities.quote || page.activities.bullets.length) ? (
          <section id="about">
            <h2>{parentCopy.whatKidsDo}</h2>
            {page.activities.quote ? (
              <blockquote className="listing-quote">
                “{page.activities.quote}”
                {page.activities.cite ? <cite>{page.activities.cite}</cite> : null}
              </blockquote>
            ) : null}
            {page.activities.bullets.length ? (
              <ul className="listing-plain">
                {page.activities.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {page.week?.length ? (
          <section id="week">
            <h2>{parentCopy.theWeek}</h2>
            <p className="listing-sub">{parentCopy.theWeekIntro}</p>
            <div className="listing-days5">
              {page.week.map((day) => (
                <div className="listing-d5" key={day.label}>
                  <b>{day.label}</b> {day.text}
                </div>
              ))}
            </div>
            {page.weekNote ? <p className="listing-note">{page.weekNote}</p> : null}
          </section>
        ) : null}

        {page.beforeYouGo.length ? (
          <section id="logistics">
            <h2>{parentCopy.beforeYouGo}</h2>
            <dl>
              {page.beforeYouGo.map((row) => (
                <div className="listing-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {page.refunds.length ? (
          <section id="money">
            <h2>{parentCopy.refunds}</h2>
            <dl>
              {page.refunds.map((row) => (
                <div className="listing-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section id="checked">
          <h2>{parentCopy.howWeChecked}</h2>
          <ul className="listing-plain listing-src">
            {page.approved ? <li>{page.approved}</li> : null}
            {page.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url}>{source.label}</a>
                {source.checked ? `, checked ${source.checked}` : null}
              </li>
            ))}
            {!page.sources.length ? <li>{parentCopy.noSource}</li> : null}
          </ul>
        </section>
      </div>

      <div className="listing-bar">
        <div className="listing-wrap">
          <div className="listing-sum">
            <b>{bar.title}</b>
            {bar.detail}
          </div>
          <div className="listing-btns">
            <SaveControl refToSave={{ kind: "camp_program", programId: page.slug }} label={page.title} variant="button" />
            <a className="listing-btn pri" href={bar.registerUrl ?? "#sessions"} aria-disabled={bar.registerUrl ? undefined : true}>
              {parentCopy.register}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function LocationPicker({
  page,
  locationId,
  lengthId,
  care,
  onLocation,
  onLength,
  onCare,
}: {
  page: BuiltCampPage;
  locationId: string | null;
  lengthId: "week" | "three" | "two";
  care: Record<string, boolean>;
  onLocation: (id: string) => void;
  onLength: (id: "week" | "three" | "two") => void;
  onCare: (id: string, on: boolean) => void;
}) {
  if (page.picker.kind !== "location") return null;
  const picker = page.picker;
  const location = picker.locations.find((item) => item.id === locationId) ?? null;
  const length = picker.lengths.find((item) => item.id === lengthId) ?? picker.lengths[0];
  return (
    <>
      <div className="listing-lbl">{parentCopy.locationStep}</div>
      <div>
        {picker.locations.map((item) => (
          <label className={locationId === item.id ? "listing-opt is-sel" : "listing-opt"} key={item.id}>
            <input type="radio" name="location" checked={locationId === item.id} onChange={() => onLocation(item.id)} />
            <div style={{ flex: 1 }}>
              <div className="l1">{item.name}</div>
              <div className="l2">{item.address}</div>
            </div>
            <div className="price">
              {money(item.prices.week)}
              <small>{parentCopy.aWeek}</small>
            </div>
          </label>
        ))}
      </div>
      <div className="listing-lbl">{parentCopy.daysStep}</div>
      <div>
        {picker.lengths.map((item) => {
          const price = location ? location.prices[item.id] : Math.min(...picker.locations.map((loc) => loc.prices[item.id]));
          const unit = item.id === "week" ? parentCopy.aWeek : item.id === "three" ? parentCopy.for3Days : parentCopy.for2Days;
          return (
            <label className={lengthId === item.id ? "listing-opt is-sel" : "listing-opt"} key={item.id}>
              <input type="radio" name="length" checked={lengthId === item.id} onChange={() => onLength(item.id)} />
              <div style={{ flex: 1 }}>
                <div className="l1">{item.name}</div>
                <div className="l2">{item.sub}</div>
              </div>
              <div className="price">{location ? money(price) : `from ${money(price)} ${unit}`}</div>
            </label>
          );
        })}
      </div>
      <div className="listing-lbl">{parentCopy.careStep}</div>
      <div>
        {picker.care.map((item) => {
          const amount = length.days === 5 ? item.weekPrice : item.dayPrice * length.days;
          return (
            <label className={care[item.id] ? "listing-opt is-sel" : "listing-opt"} key={item.id}>
              <input type="checkbox" checked={Boolean(care[item.id])} onChange={(event) => onCare(item.id, event.target.checked)} />
              <div style={{ flex: 1 }}>
                <div className="l1">{item.name}</div>
                <div className="l2">{item.hours}</div>
              </div>
              <div className="price">
                {money(amount)}
                <small>{length.days === 5 ? parentCopy.aWeek : `$${item.dayPrice} ${parentCopy.aDay}`}</small>
              </div>
            </label>
          );
        })}
      </div>
      <div className="listing-lbl">{parentCopy.themeStep}</div>
      {picker.themes.map((theme) => (
        <div className="listing-prog" key={theme.name}>
          <b>{theme.name}</b> <span className="a">· {theme.ages}</span>
          <div className="a">{theme.blurb}</div>
        </div>
      ))}
      {picker.footnote ? <p className="listing-note">{picker.footnote}</p> : null}
    </>
  );
}

function summarize(
  page: BuiltCampPage,
  selected: Selection[],
  locationId: string | null,
  lengthId: "week" | "three" | "two",
  care: Record<string, boolean>,
): { title: string; detail: string; registerUrl: string | null } {
  if (page.picker.kind === "location") {
    const location = page.picker.locations.find((item) => item.id === locationId);
    if (!location) return { title: parentCopy.pickYourCamp, detail: page.priceFrom, registerUrl: null };
    const length = page.picker.lengths.find((item) => item.id === lengthId) ?? page.picker.lengths[0];
    let total = location.prices[length.id];
    for (const item of page.picker.care) {
      if (!care[item.id]) continue;
      total += length.days === 5 ? item.weekPrice : item.dayPrice * length.days;
    }
    const careOn = page.picker.care.some((item) => care[item.id]);
    return {
      title: `${location.name} · ${money(total)} ${parentCopy.plusTax}`,
      detail: `${length.name}${careOn ? " + care" : ""}`,
      registerUrl: location.registerUrl,
    };
  }
  if (!selected.length) {
    const prompt = page.picker.kind === "none" ? parentCopy.askTheCamp : parentCopy.pickADay;
    return { title: prompt, detail: page.priceFrom, registerUrl: page.registerUrl };
  }
  const total = selected.reduce((sum, item) => sum + item.price, 0);
  const days = new Set(selected.map((item) => item.day)).size;
  if (page.picker.kind === "theme-days") {
    return {
      title: `${selected.length} day${selected.length > 1 ? "s" : ""} · ${money(total)}`,
      detail: selected.map((item) => item.label).join(", "),
      registerUrl: selected[0].registerUrl ?? page.registerUrl,
    };
  }
  return {
    title: `${selected.length} option${selected.length > 1 ? "s" : ""} · ${days} day${days > 1 ? "s" : ""} · ${money(total)}`,
    detail: parentCopy.beforeFees,
    registerUrl: page.registerUrl,
  };
}
