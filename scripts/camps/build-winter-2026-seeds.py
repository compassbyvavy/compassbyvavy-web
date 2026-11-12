"""Builds draft + publish SQL for the private winter-break camps checked on 2026-11-11.

Facts come only from each camp's own page (source_url), re-opened on the check date.
Anything a page doesn't state stays NULL / 'unknown'. Run: python3 -I scripts/camps/build-winter-2026-seeds.py
"""
import os

CHECKED = "2026-11-11"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "seeds", "camps")
CITY = ("coalesce((select id from public.cities where id = 'mississauga'), "
        "(select id from public.cities where lower(city_town) = 'mississauga' and province_state = 'Ontario' limit 1))")


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        return "array[" + ", ".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def upsert(table, row, casts=None):
    casts = casts or {}
    cols = list(row)
    vals = []
    for c in cols:
        v = row[c]
        if isinstance(v, tuple) and v[0] == "sql":
            vals.append(v[1])
        else:
            vals.append(q(v) + (f"::public.{casts[c]}" if c in casts and v is not None else ""))
    upd = ", ".join(f"{c} = excluded.{c}" for c in cols if c != "id")
    return (f"insert into public.{table} ({', '.join(cols)})\nvalues ({', '.join(vals)})\n"
            f"on conflict (id) do update set {upd}, updated_at = timezone('utc', now());\n")


SESSION_CASTS = {"schedule_format": "camp_session_schedule_format", "stay_type": "camp_stay_type",
                 "delivery_mode": "camp_delivery_mode", "before_care_offered": "confirmed_tri_state",
                 "before_care_separate_booking": "confirmed_tri_state", "after_care_offered": "confirmed_tri_state",
                 "after_care_separate_booking": "confirmed_tri_state", "price_unit": "price_unit",
                 "currency": "camp_currency", "registration_status": "camp_registration_status",
                 "seat_availability": "seat_availability_fact", "age_assessment_rule": "camp_age_assessment_rule"}


def session(sid, program, venue, start, end, label, hours, price, unit, fee_notes, reg_url, source, ages,
            reg_status="availability_unknown", before=None, after=None, care_included=False, notes=None,
            care_separate=False, seats="unknown",
            schedule_format="short_session"):
    b_off = "yes" if before else "unknown"
    a_off = "yes" if after else "unknown"
    sep = "no" if care_included else ("yes" if care_separate else "unknown")
    return {
        "id": sid, "program_id": program, "venue_id": venue, "start_date": start, "end_date": end,
        "timing_label": label, "schedule_format": schedule_format, "stay_type": "day", "delivery_mode": "in_person",
        "core_hours_start": hours[0], "core_hours_end": hours[1],
        "before_care_offered": b_off, "before_care_start_time": before[0] if before else None,
        "before_care_end_time": before[1] if before else None,
        "before_care_separate_booking": sep if before else "unknown",
        "after_care_offered": a_off, "after_care_start_time": after[0] if after else None,
        "after_care_end_time": after[1] if after else None,
        "after_care_separate_booking": sep if after else "unknown",
        "price_amount": price, "price_unit": unit, "currency": "CAD" if price is not None else None,
        "fee_notes": fee_notes, "registration_status": reg_status, "registration_url": reg_url,
        "source_url": source, "source_checked_date": CHECKED, "provider_confirmed": False,
        "seat_availability": seats, "age_min": ages[0], "age_max": ages[1],
        "age_min_inclusive": True if ages[0] is not None else None,
        "age_max_inclusive": True if ages[1] is not None else None,
        "age_assessed_at_date": None, "age_assessment_rule": "unknown", "notes": notes,
    }


CAMPS = []

# --- COOKSMART (MSC-0381) -------------------------------------------------
# Reviewed with Vineeta 2026-11-11 (Winter camp review sheet): tag Cooking only, their own line as the
# description, + HST from the booking pages, sibling code, cancellation policy, spots open on every date.
src = "https://www.cooksmart.ca/programs/camps-hub/winter-camp"
full = "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99733065"
half = "https://cooksmartscheduling.as.me/schedule/7b98e4f9/?appointmentTypeIds[]=99732924"
full_fee = ("$98 + HST per day (CA$110.74 with tax). Snacks and lunch included, which the kids make themselves. "
            "Siblings: book a quantity of 2 and use code CSFAMILY2. Pick only the days you want.")
half_fee = ("$67 + HST per half day (CA$75.71 with tax). Snacks and lunch included, which the kids make themselves. "
            "Pick only the days you want.")
spots = "Every date had spots on Nov 11, 2026."
CAMPS.append(dict(
    slug="msc-0381-cooksmart-winter-2026", label="COOKSMART winter holiday cooking camp",
    provider=dict(id="prov-cooksmart", name="COOKSMART", website_url="https://www.cooksmart.ca/",
                  registration_info_url=src, organization_type="business", source_url=src),
    venue=dict(id="venue-cooksmart-clarkson", name="COOKSMART Clarkson", neighbourhood="Clarkson",
               address_line="1700 Mazo Crescent", postal_code="L5J 1Y8"),
    program=dict(id="MSC-0381", slug="cooksmart-winter-holiday-cooking-camp",
                 name="Winter Holiday Cooking Camp",
                 description="\u201cHolidays are for fun and learning essential life skills!\u201d \u2014 COOKSMART",
                 primary_category="Culinary", secondary_themes=["Cooking"],
                 typical_age_min=5, typical_age_max=12, audience="child_only",
                 experience_summary="A full day (9:00\u20134:00) or a half day (9:00\u20131:30) of cooking, "
                                    "where the kids make their own healthy snacks and lunch.",
                 policies_summary="Cancel in writing. More than a month before: refund minus $60. 2\u20134 weeks: "
                                  "minus $100. 2 weeks or less: 50% charge. Within 72 hours or once camp starts: "
                                  "no refund. Rescheduling when possible; a child sick 3+ days may be offered other dates."),
    sessions=[
        session("MSC-0381-2026-12-21-full", "MSC-0381", "venue-cooksmart-clarkson", "2026-12-21", "2026-12-23",
                "Full day, Dec 21, 22, 23", ("09:00", "16:00"), 98, "per_day", full_fee, full, full, (5, 12),
                reg_status="registration_open", seats="confirmed_available", notes=spots),
        session("MSC-0381-2026-12-28-full", "MSC-0381", "venue-cooksmart-clarkson", "2026-12-28", "2026-12-30",
                "Full day, Dec 28, 29, 30", ("09:00", "16:00"), 98, "per_day", full_fee, full, full, (5, 12),
                reg_status="registration_open", seats="confirmed_available", notes=spots),
        session("MSC-0381-2026-12-21-half", "MSC-0381", "venue-cooksmart-clarkson", "2026-12-21", "2026-12-23",
                "Half day, Dec 21, 22, 23", ("09:00", "13:30"), 67, "per_day", half_fee, half, half, (5, 12),
                reg_status="registration_open", seats="confirmed_available", notes=spots),
        session("MSC-0381-2026-12-28-half", "MSC-0381", "venue-cooksmart-clarkson", "2026-12-28", "2026-12-30",
                "Half day, Dec 28, 29, 30", ("09:00", "13:30"), 67, "per_day", half_fee, half, half, (5, 12),
                reg_status="registration_open", seats="confirmed_available", notes=spots),
    ]))

# --- Futures Gymnastics (MSC-0285) ---------------------------------------
src = "https://futuresgymnastics.com/pages/upcoming-camps.html"
reg = "https://portal.iclasspro.com/futures/camps/135?sortBy=time"
fee = ("$225 plus HST per session. Plus a $50 gymnastics-year fee (July 2026 to June 2027). "
       "$50 non-refundable deposit at registration; full payment due one week before camp.")
note = "Bring nut-free food, a water bottle, gym clothes. EpiPens are not kept on site."
CAMPS.append(dict(
    slug="msc-0285-futures-gymnastics-winter-2026", label="Futures Gymnastics winter camp",
    provider=dict(id="prov-futures-gymnastics", name="Futures Gymnastics", website_url="https://futuresgymnastics.com/",
                  registration_info_url=src, organization_type="business", source_url=src),
    venue=dict(id="venue-futures-gymnastics-millcreek", name="Futures Gymnastics", neighbourhood="Meadowvale",
               address_line="6991 Millcreek Dr, Unit 8", postal_code="L5N 6B9"),
    program=dict(id="MSC-0285", slug="futures-gymnastics-winter-camp", name="Winter Gymnastics Camp",
                 description="Full-day gymnastics camp over the winter break.",
                 primary_category="Sports & Fitness", secondary_themes=["Gymnastics"],
                 typical_age_min=5, typical_age_max=None, audience="child_only"),
    sessions=[
        session("MSC-0285-2026-12-21", "MSC-0285", "venue-futures-gymnastics-millcreek", "2026-12-21", "2026-12-23",
                "Dec 21–23", ("08:30", "16:00"), 225, "per_session", fee, reg, src, (5, None), notes=note),
        session("MSC-0285-2026-12-28", "MSC-0285", "venue-futures-gymnastics-millcreek", "2026-12-28", "2026-12-30",
                "Dec 28–30", ("08:30", "16:00"), 225, "per_session", fee, reg, src, (5, None), notes=note),
    ]))

# --- YMCA, Mississauga Y (MSC-0049) --------------------------------------
src = "https://www.ymcagta.org/camps-and-outdoor-education/winter-and-march-break-day-camp"
reg = "https://anc.ca.apm.activecommunities.com/ymcagta/activity/search/detail/115093?onlineSiteId=0&locale=en-US&from_original_cui=true"
note = ("Full sessions only at the Mississauga YMCA (no daily option). Ages 6–8 and 9–12 have separate programs. "
        "Withdraw 10+ days before for a refund minus 10%; later, 50%.")
CAMPS.append(dict(
    slug="msc-0049-ymca-mississauga-winter-2026", label="YMCA Mississauga winter break day camp",
    provider=dict(id="prov-ymca-gta", name="YMCA of Greater Toronto", website_url="https://www.ymcagta.org/",
                  registration_info_url=src, organization_type="nonprofit", source_url=src,
                  contact_phone="647-439-6611"),
    venue=dict(id="venue-mississauga-ymca", name="Mississauga YMCA", neighbourhood="City Centre",
               address_line="325 Burnhamthorpe Rd W", postal_code="L5B 3R2"),
    program=dict(id="MSC-0049", slug="ymca-mississauga-winter-break-day-camp",
                 name="Winter Break Day Camp (Variety)",
                 description="A week of sports, science, and arts and crafts at the Mississauga YMCA.",
                 primary_category="Traditional & Multi-Activity", secondary_themes=["Multi-Sport", "Science", "Arts & Crafts"],
                 typical_age_min=6, typical_age_max=12, audience="child_only"),
    sessions=[
        session("MSC-0049-2026-12-21", "MSC-0049", "venue-mississauga-ymca", "2026-12-21", "2026-12-24",
                "Dec 21–24 (4 days)", ("09:00", "16:00"), 375, "per_session",
                "$375 for the 4-day session. Extended hours included.", reg, src, (6, 12),
                before=("08:00", "09:00"), after=("16:00", "17:30"), care_included=True, notes=note),
        session("MSC-0049-2026-12-29", "MSC-0049", "venue-mississauga-ymca", "2026-12-29", "2026-12-31",
                "Dec 29–31 (3 days)", ("09:00", "16:00"), 290, "per_session",
                "$290 for the 3-day session. Extended hours included.", reg, src, (6, 12),
                before=("08:00", "09:00"), after=("16:00", "17:30"), care_included=True, notes=note),
    ]))

# --- Magnitude Kids Centre (MSC-0081) ------------------------------------
src = "https://www.magnitudewell.ca/holiday"
CAMPS.append(dict(
    slug="msc-0081-magnitude-winter-2026", label="Magnitude Kids Centre holiday camp",
    provider=dict(id="prov-magnitude-kids-centre", name="Magnitude Kids Centre", website_url="https://www.magnitudewell.ca/",
                  registration_info_url=src, organization_type="business", source_url=src,
                  contact_phone="905-858-9355"),
    venue=dict(id="venue-magnitude-kitimat", name="Magnitude Kids Centre", neighbourhood="Meadowvale",
               address_line="6820 Kitimat Rd, Units 5 & 6", postal_code="L5N 5M3"),
    program=dict(id="MSC-0081", slug="magnitude-holiday-camp", name="Holiday Camp",
                 description="Holiday camp with possible outings (bowling, the park) on good-weather days and a movie day.",
                 primary_category="Traditional & Multi-Activity", secondary_themes=[],
                 typical_age_min=None, typical_age_max=None, audience="child_only"),
    sessions=[
        session("MSC-0081-2026-12-21", "MSC-0081", "venue-magnitude-kitimat", "2026-12-21", "2026-12-23",
                "Dec 21–23", ("08:00", None), None, None,
                "From $210 (the page doesn't say whether per day or per session). Lunch special $5 cash, or bring lunch; bring 2 snacks.",
                "https://www.magnitudewell.ca/holiday/p/holiday-camp", src, (None, None),
                reg_status="registration_open",
                notes="A Dec 29–31 session is also listed without a year, and the winter text gives other dates: confirm before adding."),
    ]))


# --- Gymnastics Mississauga (MSC-0046): running, dates not posted yet ----
src = "https://gymmississauga.org/winter-camps/"
CAMPS.append(dict(
    slug="msc-0046-gymnastics-mississauga-winter-2026", label="Gymnastics Mississauga holiday camp",
    allow_undated=True,
    provider=dict(id="prov-gymnastics-mississauga", name="Gymnastics Mississauga", website_url="https://gymmississauga.org/",
                  registration_info_url=src, organization_type="nonprofit", source_url=src),
    venue=dict(id="venue-gymnastics-mississauga-rose-cherry", name="Gymnastics Mississauga (Paramount Fine Food Centre)",
               neighbourhood=None, address_line="5600 Rose Cherry Pl", postal_code="L4Z 4B6"),
    program=dict(id="MSC-0046", slug="gymnastics-mississauga-holiday-camp", name="Holiday Gym Camp",
                 description="Full-day gymnastics on all apparatus, including the trampoline, plus arts and crafts.",
                 primary_category="Sports & Fitness", secondary_themes=["Gymnastics", "Arts & Crafts"],
                 typical_age_min=None, typical_age_max=None, audience="child_only"),
    sessions=[
        session("MSC-0046-winter-2026-27", "MSC-0046", "venue-gymnastics-mississauga-rose-cherry", None, None,
                "Holiday camps 2026–2027 (dates not posted yet)", ("09:00", "16:30"), 80, "per_day",
                "$80 per day. Before care 8:00–9:00 and after care 4:30–5:30 are $10 each. "
                "Plus an annual membership fee (includes Gymnastics Ontario).",
                "https://app.jackrabbitclass.com/regv2.asp?id=537009", src, (None, None),
                before=("08:00", "09:00"), after=("16:30", "17:30"), care_separate=True,
                notes="Bring lunch, 2 snacks and a water bottle. Shorts or leggings with a tucked-in T-shirt, bare feet, hair tied back, no jewelry."),
    ]))


def draft_sql(c):
    p, v, g = c["provider"], c["venue"], c["program"]
    out = [f"-- DRAFT: {c['label']} (winter 2026)\n-- Built by scripts/camps/build-winter-2026-seeds.py from {p['source_url']} (checked {CHECKED}).\n"
           "-- Loads rows as drafts. Safe to run again: it never changes what is already published.\n\nbegin;\n\n"
           "-- City (kept if it already exists under this id or name).\n"
           "insert into public.cities (id, country, province_state, city_town, slug)\n"
           "values ('mississauga', 'Canada', 'Ontario', 'Mississauga', 'mississauga')\non conflict do nothing;\n\n"]
    prov = dict(p, city_id=("sql", CITY), research_status="in_progress", source_checked_date=CHECKED, provider_confirmed=False)
    out.append(upsert("providers", prov, {"research_status": "research_status"}))
    ven = dict(v, city_id=("sql", CITY))
    out.append("\n" + upsert("venues", ven))
    out.append("\n" + upsert("camp_programs", dict(g, provider_id=p["id"]), {"audience": "camp_audience"}))
    for s in c["sessions"]:
        out.append("\n" + upsert("camp_sessions", s, SESSION_CASTS))
    out.append("\ncommit;\n")
    return "".join(out)


def publish_sql(c):
    p, v, g = c["provider"], c["venue"], c["program"]
    sids = ", ".join(q(s["id"]) for s in c["sessions"])
    n = len(c["sessions"])
    return f"""-- PUBLISH: {c['label']} (winter 2026)
-- Makes the camp visible on compassbyvavy.ca/camps. Run only after the draft is loaded and reviewed.

begin;

do $$
declare n integer;
begin
  update public.providers set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = {q(p['id'])} and source_url ~* '^https://' and source_checked_date is not null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: provider {p['id']} is missing or has no source'; end if;

  update public.venues set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = {q(v['id'])};
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: venue {v['id']} is missing'; end if;

  update public.camp_programs set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id = {q(g['id'])};
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Not published: program {g['id']} is missing'; end if;

  update public.camp_sessions set publication_state = 'published', published_at = coalesce(published_at, timezone('utc', now()))
   where id in ({sids}) and source_url ~* '^https://' and source_checked_date is not null{"" if c.get("allow_undated") else " and start_date is not null"};
  get diagnostics n = row_count;
  if n <> {n} then raise exception 'Not published: expected {n} sessions with a source, check date and start date, found %', n; end if;
end $$;

commit;
"""


os.makedirs(OUT, exist_ok=True)
for c in CAMPS:
    open(os.path.join(OUT, c["slug"] + ".sql"), "w").write(draft_sql(c))
    open(os.path.join(OUT, c["slug"] + ".publish.sql"), "w").write(publish_sql(c))
    print(c["slug"], len(c["sessions"]), "sessions")
