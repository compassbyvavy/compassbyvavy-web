# Compass by Vavy — Master website spec

Nov 17, 2026 · @Vineeta Agarwal

## Start here

**This is the one master spec for compassbyvavy.ca.** It holds every page, every category and subcategory, the brand, the planner, household intelligence, Guides, Shop, Account, the rules and every Cursor prompt. If the website and this document ever disagree, this document wins. It replaces the older "Website build spec" doc, which stays only as history.

**North star:** a parent goes from "What can we do?" to "This works for my children, on this date, within my budget: save it or book it" with as little effort as possible. Every page is judged against that. The look is warm family editorial plus a genuinely useful planner; Plan is the signature feature, Discover and Camps are exceptionally practical, Shop stays secondary, and nothing invented (ratings, prices, availability, bookings, badges) is ever shown.

**Today's goal:** put the whole website live as a finished outline: every page, every category and every subcategory, with no listings and no camp data yet. Listings switch on later with one setting. Section "Launch shell mode" explains how.

### How to update the website today (about 45 minutes)

1. **Save this document into the repo.** Share › Export › Markdown, then save the file as `docs/compass-master-spec.md` in compassbyvavy-web. Every Cursor prompt below reads that file.
2. **Check the workbook is in the repo** at `data/taxonomy/MT-003xMT-004_Place_Type_Feature_Applicability_Matrix_v2_Discover.xlsx`. It holds the category and subcategory structure (not listings).
3. **Export the 9 page boards as PNGs** from the canvas row "Website pages: final design" (https://claude.ai/artifact/HiXJ7ew2d6nH3o3Xs5ouUC): 1. Home, 2. Discover, 3. Category page: Camps, 4. Place page, 5. Plan: week, 5b. Plan: month, 6. Guides, 7. Shop, 8. Account.
4. **Open a new Cursor chat starting from `main`**, attach the 9 PNGs, and paste the "Today: launch shell" prompt from section "Cursor prompts".
5. **Review the preview link** Cursor gives you. Bring Cursor's review pack back to Claude for a check.
6. **Merge the pull request into `main`.** This is the step that changes the live site. Cloudflare only publishes `main`; a preview link is never the live site. Then close the old PR #75, which this replaces.

### How to use this document after today

- Adding a venue, a collection or a guide: check the rules here first.
- Building the next feature: copy its prompt from "Cursor prompts", in the order given.
- Any change we decide gets written here first, then into Cursor.

## Decision log

Every site-wide decision, newest first. Page-level decisions (Plan, Guides, Shop, Account) sit in their own sections. IDs never change: a moved place type keeps its ID, for example `PT-LC-032` (City Zoo) now lives in Animals & Farms.

| # | Date | Decision | Why |
| --- | --- | --- | --- |
| 32 | Nov 17 | **One master spec** (this document) replaces the tabbed build spec | One place to come back to; nothing gets missed |
| 31 | Nov 17 | **Launch shell first:** every page and every subcategory goes live today with no listings or camp data. Listings switch on with one setting | The full shape of Compass is visible now; data is added when verified |
| 30 | Nov 17 | **Household intelligence** is Compass's edge. Five features ship January 1 inside Plan; the rest follow on a roadmap | Turns a directory into the place a family runs its weeks from |
| 29 | Nov 17 | **Logo: the fox-ear compass mark on its own** on the website; the green round version is the app icon (Instagram, phone home screen) | Compared at real size: the plain mark is clearer in the header; green fills a circle crop best. One logo, two uses |
| 28 | Nov 17 | Plan is a **family planner** (Month, Week, Weekend, Day), not a "plan my day" form | Parents arrive with saved things and a busy week |
| 27 | Nov 17 | Brand copy is **Ontario-wide**; a city name appears only on city content | Compass speaks for all of Ontario |
| 26 | Nov 17 | **No "List your camp" in the header.** It lives in the footer and at the bottom of Discover | The header is for parents |
| 25 | Nov 17 | Vavy-checked is a **small green "✓ Vavy-checked" pill**. The round stamp is retired. The round badge is for print and merch only | Cleaner cards, like Airbnb |
| 24 | Nov 17 | **Learn is renamed Guides.** `/learn` redirects to `/guides`. Headline: "For the parenting learning curve." | Parents read "Guides" as "for me"; can't be confused with kids' classes |
| 23 | Nov 17 | **Camps stays inside Discover** as the first category, not a menu item | One way in; the home page leads straight to it |
| 22 | Nov 17 | Main menu: **Discover · Plan · Guides · Shop · Account**. Shop shows only once a book is on sale | Five clear doors, nothing else |
| 21 | Nov 17 | Play & Entertainment is now **Play & Fun** (`/play-fun`); Travel & Getaways is now **Day Trips & Getaways** (`/day-trips-getaways`). IDs `CAT-002`, `CAT-008` unchanged | Warmer parent words; day trips are the big search |
| 20 | Nov 17 | Camps chips in two rows (**When**, then **Type**); chips ordered by season; seasonal-only subcategories hide out of season | Parents start from the date |
| 19 | Nov 17 | Fonts: **Newsreader for the wordmark and headings, Inter for interface and text, Fredoka only on kids' products (updated by #34)** | Clean like Airbnb, warm where Vineeta speaks |
| 18 | Nov 17 | **No bottom tab bar** on phones. Phone header: logo, search icon, heart, menu button | Clean, like the best sites |
| 17 | Nov 17 | Layout is **search-first and photo-led**, white page with cream bands, like Airbnb and Netflix | Earlier design felt childish and empty |
| 16 | Nov 16 | Discover lists **every subcategory** on its cards and in "Everything on Compass" | Parents see the full range at a glance |
| 15 | Nov 16 | Every listing must answer the same core parent questions | Parents shouldn't need to look anywhere else |
| 14 | Nov 16 | PA days come from each family's school board, stored as calendar data | 72 Ontario boards, each with different PA days |
| 13 | Nov 16 | Browse by region, drive time and occasion, alongside categories | City alone stops working across Ontario |
| 12 | Nov 16 | New subcategories: amusement and theme parks; hockey, skating and ringette; parent and baby classes; clubs and youth groups; sports games to watch; boat tours and paddling; caves; stargazing; fishing; paint-your-own pottery; escape rooms; horse riding; flower fields; holiday lights and Santa | Things Ontario families do that had no home |
| 11 | Nov 16 | Fishing spots come back (they had been parked) | Ontario runs licence-free family fishing weekends |
| 10 | Nov 16 | Tobogganing hills, outdoor rinks, skating trails, snowshoe and cross-country ski trails go in a new **Winter fun** subcategory under Parks & Nature | Top outdoor search in January |
| 9 | Nov 16 | Things that describe a place (inclusive, toddler, waterfront, supervised, free) are **filters**, not subcategories | A place can be all of them at once |
| 8 | Nov 16 | Birthday parties are a filter plus a collection, not a category | Most play venues host parties |
| 7 | Nov 16 | Events are organised by what's happening, not by venue | Parents search "puppet show," not "performance hall" |
| 6 | Nov 16 | Splash pads stay in Parks & Nature | Outdoor, free and city-run |
| 5 | Nov 16 | **Drop-in swims and skates go in Classes & Programs** (Vineeta's call), with community centres, public pools and arenas | Scheduled sessions, booked like lessons |
| 4 | Nov 16 | EarlyON and family resource centres move to Play & Fun | They're drop-in play |
| 3 | Nov 16 | New category **Animals & Farms**: zoos, aquariums, safari parks, butterflies, farms, bird sanctuaries, farm markets | Kids ask for it by name |
| 2 | Nov 16 | **Services** and **Shopping** come out of Discover; their place types stay in the data as Parked | Services is a later, higher-risk job; Shopping clashes with Shop |
| 1 | Nov 16 | Discover has **9 categories**, Camps first | Camps is the launch focus |

**33 · Nov 17 · Creative review adopted.** New hero promise ("Less searching. More childhood adventures."); a "How Compass works" section replaces the separate Plan and household bands; Everything on Compass stays but moves to a quiet tabbed band at the bottom; Discover cards show 6 subcategories then "+ N more"; no "Coming soon" grids; subcategory pages are noindex until listings are live; clear trust levels (Vavy-checked = visited in person); camp availability is per session; Saved, Planned and Booked look different in Plan. Why: smaller but complete beats enormous but unfinished.

**34 · Nov 17 · New visual direction.** The "Family Adventures" home mockup is the target look. Headings and the wordmark move to Newsreader for an editorial, grown-up feel; Inter stays for every interface element; Fredoka moves to kids' products only. Real or licensed photos only, never AI or stock photos of children.

## Brand and design

**The logo is the fox-ear compass mark with "Compass by Vavy" beside it in forest green.** On the website it sits on its own, with white or cream around it. The green round version is the app icon: used only where a platform puts the logo in a circle or square (Instagram, phone home screen, Google profile, email avatar). It's one logo with two uses, decided November 17 after comparing both at real size.

### Why the mark on its own for the website, and green for the app icon

- **In the header, the mark on its own is clearer.** At real size the fox ears, gold ring and needle all read. Inside the green circle the mark shrinks to about two-thirds and reads as a sticker beside the name.
- **In a circle crop, green wins.** On Instagram and phone home screens the green version fills the circle and looks finished; the plain mark looks bare on white and its ears crowd the edge.
- **It's still one logo.** The best brands work this way: Airbnb's mark sits on its own on the website and on a coloured square as the app icon.
- **The orange is part of the mark, not a second logo.** Forest green stays the brand colour for the wordmark, buttons, links and the Vavy-checked pill. Fox orange appears only in the mark, the Camps icon and small highlights.

### Logo rules

- Wordmark "Compass by Vavy" in Newsreader semibold, one colour: forest green `#33503E` on light backgrounds, cream `#F4E9D0` on dark. Never two colours.
- Website header: the mark on its own, 40px tall, plus the wordmark. Phones: 32px. Footer (forest green): the mark on its own with the wordmark in cream.
- Favicon: the mark on its own (the fox ears stay recognisable at 16px). Apple-touch-icon, Android icon and Instagram: the green round version.
- Files in `public/brand/`: `mark.svg` is the mark on its own (website and favicon); `mark-on-green.png` is the green round version (app icons, Instagram, Open Graph image). Cursor makes a matching `mark-on-green.svg` if the set has none. The wordmark is live text in Newsreader, so it's always one colour. Older files (`logo.svg`, `logo-dark.svg`, `vavy-checked.svg`) are not used on the site.
- The round Vavy badge (with the fox and "Compass by Vavy" around the ring) is for print and merch only: stickers, book back covers, Instagram highlights. The "Vavy Sets Out" illustration is the character art for Shop, books, printables and Instagram. Neither is a logo.
- Vavy-checked on the site is a small pill: green `#33503E` background, white text "✓ Vavy-checked". The old round stamp is retired.

### Colours

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| Page | White | `#FFFFFF` | Every page background |
| Band | Warm cream | `#FBF6EC` | Alternate section bands, hero, footer top |
| Brand | Forest green | `#33503E` | Logo, buttons, links, Vavy-checked pill, icons |
| Accent | Fox orange | `#C9702F` | Camps icon, highlights, tags. Never small text on cream |
| Accent text | Deep fox | `#8A4A1E` | Orange text when it must be small |
| Accent 2 | Compass gold | `#E0A526` | Stars on print only, seasonal touches |
| Soft | Cream | `#F4E9D0` | Chips, tags, wordmark on dark |
| Text | Ink | `#2B2622` | Headings and body text |
| Text 2 | Body grey | `#4E5549` | Secondary text, captions |

### Type

- **Newsreader** (semibold) for the wordmark "Compass by Vavy", page headlines and section headings across the site ("Less searching. More childhood adventures.", "Explore by category", "Plan, save and never miss a date."), plus Guides articles and Vineeta's quotes. This is what makes the site feel editorial and grown-up.
- **Inter** for everything you use: menus, search, buttons, chips, cards, forms, the planner, body text. Desktop H1 56/60, H2 32/40, H3 20/28, body 16/26, small 14/20. Phone H1 36/42, H2 26/32.
- **Fredoka** only on things made for kids: activity books, printables and the round Vavy badge. Never on the website.

### Layout

- Search-first and photo-led, like Airbnb and Netflix. White page with cream bands. Lots of air: 80px between sections on desktop, 48px on phones.
- Content width 1280px, 24px side margins on phones.
- Cards: 16px corners, photo on top (4:3), soft shadow only on hover. Buttons: 44px tall, fully rounded, forest green with white text; secondary buttons outlined.
- Rows of cards scroll sideways on phones (Netflix rows). Tap targets at least 44px.
- Line icons (lucide-react) in forest green; Camps in fox orange. No emoji anywhere.
- Real photos lead every card once they exist. Until then, tiles are warm cream (#FBF6EC) with a thin forest-green line icon and the label: never pastel colour blocks (they make the site look like a kids' app) and never stock photos of children. The fox mark is the one playful touch on the page; everything else stays calm and grown-up.
- Accessibility: real links and buttons, visible focus rings, a label on every input, text contrast at least 4.5:1.

### Site header (every page)

| Part | Desktop | Phone |
| --- | --- | --- |
| Left | Fox-ear compass mark on its own + "Compass by Vavy" in forest green | Same, smaller |
| Centre | Search bar: "Search places, camps, classes" with a "City or region" picker (cities first, then Ontario's 13 regions) | Search icon opens a full-screen search |
| Menu | Discover · Plan · Guides · Shop (only when a book is on sale) · Account | Menu button opens a full-screen menu with the same items |
| Right | Heart icon for Saved (links to `/plan/saved`, with a count), then "Join the waitlist" button until January 1; from January 1 it becomes "Sign in" | Heart icon |

The header is sticky, white, with a hairline bottom border. No "List your camp" in the header. No bottom tab bar.

### Site footer (every page)

Forest-green footer with the cream wordmark. Tagline: "Family fun across Ontario, found and checked by a parent."

| Column | Links |
| --- | --- |
| Explore | Discover, Plan, Guides, Shop, Everything on Compass |
| Categories | All 9 categories |
| For camps and venues | List your camp or venue, Update a listing |
| Compass | About Vineeta, How we check places, Contact |
| Legal | Privacy, Terms, Accessibility |

Plus the newsletter sign-up (with an unticked consent box), Instagram link and "© 2026 Compass by Vavy. Made in Ontario."

### Brand voice

Compass speaks for all of Ontario, not one city. Hero line: "Places, camps, classes and events across Ontario, checked by a parent." Founder line: "Vineeta, Ontario parent of two and founder." A city name appears only on content that really is local ("Camps in Mississauga", "This weekend in Oakville"). Mississauga and Oakville are where listings start, not what the brand is. Write like a parent: short, warm, specific, no hype.

## Site map: every page and URL

The whole site is about 140 pages at launch: 9 category pages, 99 subcategory pages, and the pages below. **"Today"** says what each page shows in launch shell mode (no listings). Every Discover page is city-aware: the city sits in the URL so pages can be shared and found in search. With no city picked, the city segment is `ontario` (for example `/ontario/camps`) and titles say "Ontario".

### Discover

| Page | Route | Today (shell) | Board |
| --- | --- | --- | --- |
| Discover hub | `/[city]/discover` (also `/discover`) | 9 category cards, each listing all its subcategories | 2. Discover |
| Category | `/[city]/[category]`, e.g. `/mississauga/camps` | Intro, subcategory chips, "What you'll find here", "What we check", Notify me | 3. Category page: Camps |
| Subcategory | `/[city]/[category]/[subcategory]`, e.g. `/ontario/parks-nature/winter-fun` | Same layout, that subcategory's place types and Notify me | 3. Category page: Camps |
| Place | `/[city]/places/[place-slug]` | Built as a template; no public places yet | 4. Place page |
| Collection | `/[city]/collections/[slug]` | Built; hidden until listings are live | — |
| Occasion | `/[city]/ideas/[occasion]`, e.g. `/ontario/ideas/rainy-day` | Built; hidden until listings are live | — |
| PA days | `/[city]/camps/pa-days` | Board picker and how it will work, plus Notify me | — |
| Region | `/regions/[region-slug]` | Built after launch (Phase 5) | — |
| Everything on Compass | `/everything` | Every category with every subcategory as links | Bottom of 1. Home |

### Plan

| Page | Route | Today (shell) | Board |
| --- | --- | --- | --- |
| Planner, week view (Plan opens here) | `/plan` | Preview of the planner with an example week, clearly labelled "Example", and the waitlist | 5. Plan: week |
| Month, weekend, day views | `/plan?view=month` · `weekend` · `day` | Preview | 5b. Plan: month |
| Saved | `/plan/saved` | Works: saves are kept on the device (empty state until listings exist) | 5. Plan: week |
| Get ideas | `/plan/ideas?date=…` | After launch | — |
| Breaks planner | `/plan/breaks/[break]` | By February 1 | — |
| Compare | `/plan/compare?items=…` | After launch | — |
| Shared day | `/plan/day/[share-slug]` | After launch | — |

### Guides, Shop, Account and company pages

| Page | Route | Today (shell) | Board |
| --- | --- | --- | --- |
| Guides home | `/guides` (`/learn` redirects here) | Headline, all six shelves; shelves without a guide yet show one "Coming soon" card | 6. Guides |
| A guide | `/guides/[slug]` | Only guides that exist as files | 6. Guides |
| A printable | `/guides/printables/[slug]` | Only printables that exist as files | 6. Guides |
| Shop | `/shop` | First book "Québec City, ages 6–8" with "Notify me", no price | 7. Shop |
| Book | `/shop/[book-slug]` | Book page with Notify me | 7. Shop |
| Free sample, thank you | `/shop/[book-slug]/sample`, `/shop/thank-you` | When the first book is ready | — |
| Sign in | `/sign-in` | Redirects to the waitlist until January 1 | 8. Account |
| Account sections | `/account`, `/account/reminders`, `/account/purchases`, `/account/privacy`, `/account/settings` | "What your account will do" preview with the waitlist | 8. Account |
| Waitlist | `/waitlist` (keep the existing page) | Works | — |
| About Vineeta | `/about` | Founder story (Vineeta writes it) | — |
| How we check places | `/how-we-check` | The 14 questions every listing answers, and what Vavy-checked means | — |
| For camps and venues | `/for-camps` | "List your camp or venue" form | — |
| Contact | `/contact` | Email form | — |
| Privacy, Terms, Accessibility | `/privacy`, `/terms`, `/accessibility` | Plain-language pages | — |

**Routing rules:** never break a URL that's already live. If a route changes, add a permanent redirect. Category and subcategory slugs come from the workbook and never change once published. Every page sets its title, description and Open Graph image (`mark-on-green.png` until page images exist).

## Launch shell mode: the whole site, no listings yet

**Today the site shows its full structure and no listing data.** One setting, `listings_live`, controls this. While it's `false`, no place, camp, class, event, price, age, count or photo of a listing appears anywhere. Vineeta turns it on per category when that category has verified listings.

### How the setting works

- `site_settings.listings_live` (true or false), plus `discover_categories.status` (live, coming\_soon). Listings show for a category only when **both** are on.
- **Hide, don't delete.** Existing camp and indoor playground records stay in the database untouched. Their public pages send a temporary (302) redirect to their subcategory page, so the URLs come back to life when listings switch on. They're left out of the sitemap and search until then.
- No sample, fake or placeholder venues anywhere. The canvas boards show sample cards only to show layout; Cursor must not ship them.

### What every page shows in shell mode

| Page | Shows | Never shows |
| --- | --- | --- |
| Home | The 12 sections in "Home page", shell versions: hero with search, waitlist and the example planner card; category row; school-break camp tiles; How Compass works; founder note; real guides only; how we check; Everything on Compass (tabbed); waitlist band | "This weekend", occasion tiles, collection rails, place cards, "Coming soon" grids |
| Discover hub | 9 category cards with editorial lines and every subcategory (first 6, then "+ N more") | Counts of places |
| Category | Intro, subcategory chips (Camps: When and Type rows), "What you'll find here", "What we check for every listing", a related guide if one exists, "Notify me when \[category\] opens in \[city\]" | Filters, map, cards |
| Subcategory | The same, for that subcategory. Pages are `noindex` and left out of the sitemap while listings are off, so search engines don't see 99 thin pages | Filters, map, cards |
| PA days | Board picker, the 6 launch boards, how PA day matching will work, Notify me | Camp lists |
| Plan | Planner preview with an example week labelled "Example" (generic labels only, such as "Swim lesson", "PA day: camp needed", "Free: find ideas"), Saved shelf on the device, the waitlist | Real venues in the example |
| Guides | Real guides and printables that exist as files; shelves with nothing real are hidden; if none exist yet, one line: "The first guides arrive January 1" | Stand-in article text, grids of "Coming soon" cards |
| Shop | The first book with Notify me (footer link only) | A price, a review or a rating |
| Account | "Your family, your way": what an account will do and how it improves suggestions, plus the waitlist | Sign-in forms that don't work yet; the board's "What signed-out visitors see" panel |

### Empty-state copy

- Category page: "We're checking every \[category\] place in \[city\] before it goes on Compass. Get a note when it opens." Button: "Notify me".
- Subcategory page: "\[Subcategory\] in \[city\] are coming soon, each one checked by a parent."
- Saved: "Tap the heart on anything you like. It stays here, on this device, until you're ready to plan."
- Every Notify me form uses the same submit logic as the waitlist and records the category, subcategory and city.

### Switching listings on later

1. Vineeta verifies listings for a category and city.
2. She sets `discover_categories.status = live` for that category.
3. When `listings_live = true`, that category's cards, filters, map, collections and home rows appear on their own. No code change.

## Home page

**The home page tells one story: find it, save it, plan it.** It's search-first, with one emotional promise and the planner shown as the reason to use Compass. Board: 1. Home (the spec wins where they differ). Sections that need listings hide themselves until listings are live; they never show empty, and there are no "Coming soon" grids.

**Visual target: the "Family Adventures" home mockup (November 17).** Match its look: full-width photo hero with the headline in Newsreader, the search bar floating over the photo, occasion chips under it, a cream wave with the Vavy fox and a three-point trust strip, photo category tiles with small round icons, the green planner band showing one family's week, photo collection cards, guide cards and the green waitlist band. **Corrections to the mockup:**

1. **No AI or stock photos of children.** Every photo is Vineeta's own (with consent) or properly licensed. Until real photos exist, the hero uses a landscape photo with no people, and tiles use cream with the line icon.
2. **Header:** the fox-ear mark on its own (not the round green logo), and pre-launch "Join the waitlist" instead of "Account". Shop isn't in the menu until a book is on sale.
3. **Search defaults:** Where shows "City or region" (or the parent's own choice), Kids shows "Add ages". Never prefilled example ages.
4. **Trust strip copy:** "Checked by a parent: every listing shows when and how it was checked" · "Built for real family life: camps, PA days, weekends and more" · "Free to explore: no account needed". Don't describe Vavy-checked as "verified"; Vavy-checked means visited in person.
5. **Shell mode:** "This season on Compass" and the occasion chips hide until listings are live. Category tiles still show and lead to the honest category previews.
6. **The planner band** is the "How Compass works" section: keep the green band, the example week (labelled "Example") and "Try the planner", and add the three steps Discover · Save · Plan as a small line above it.
7. **The Vavy fox** must match the brand's Vavy artwork (fox orange, pink scarf, green backpack), used once per page at most. "Everything on Compass" stays as the tabbed band above the waitlist band.

| # | Section | Shell mode (today) | After listings go live | Copy |
| --- | --- | --- | --- | --- |
| 1 | Header | As in Brand and design | Same | — |
| 2 | Hero (cream band) | Headline, search bar (Where · When · Who · What), waitlist email field under it, and beside it an example planner card telling one family's story (labelled "Example") | Headline, search, occasion chips under the search; waitlist moves lower | Headline: "Less searching. More childhood adventures." Sub: "Camps, places and classes across Ontario that fit your family: their ages, your schedule and the time you have. Checked by a parent." Example card: "Fri: PA day, camp needed · Sat: swimming 9 am · Sun: free day, find ideas. One day needs a plan." |
| 3 | Category row | 9 line icons with labels, Camps first | Same | — |
| 4 | This weekend in \[city\] | Hidden | Dated picks for the coming weekend | "This weekend in \[city\]" |
| 5 | Ways to explore | Hidden | Occasion tiles (Rainy day, Snow day, PA day, Free this weekend, Birthday party, Grandparents visiting…) | "Ways to explore" |
| 6 | Camps for every school break | 4 large When tiles (Winter break and holidays, PA days, March break, Summer), each to its Camps page | Tiles plus a row of camp cards | "Camps for every school break" Sub: "Dates, ages, hours and real costs, all in one place." |
| 7 | How Compass works | 3 steps: **Discover** ("Find places and camps that fit your kids"), **Save** ("Heart anything; it waits for you"), **Plan** ("See your week, PA days and breaks, and fill free time in one tap"). Under them, three proof cards: Fits all my kids · School breaks covered · Never miss registration | Same, with the family's own week once signed in | "How Compass works" |
| 8 | Founder note (cream band, larger) | Vineeta's photo, a 2–3 line note in Newsreader, signature | Same | "Vineeta, Ontario parent of two and founder" (Vineeta writes the note) |
| 9 | Guides | Only guides and printables that really exist; the whole row hides if there are none | Same | "For the parenting learning curve" |
| 10 | How we check | The verification standard in three lines (see "Trust levels" below) and a link to `/how-we-check` | Same | "What 'checked' means on Compass" |
| 11 | Everything on Compass | At the very bottom, quiet and tabbed like Airbnb's footer: 9 category tabs; the chosen tab shows that category's subcategories as links. All 99 links stay in the page | Same | "Everything on Compass" |
| 12 | Waitlist band and footer | "Be first in on January 1" with email and unticked consent box | Newsletter | "One email when we open, then the occasional weekend idea." |

**Phones (390px):** category row, tiles and shelves scroll sideways; hero search becomes one tap-to-open field; no bottom tab bar.

**Rules:** wire every email form to the existing waitlist submit logic, with success and error states. Keep the old waitlist page. Never invent venues, prices or counts. Every link leads somewhere useful. Brand copy says Ontario; a city name appears only where the content is local.

**Trust levels (used on every page):** **Vavy-checked** means Vineeta visited in person, shown with the visit date. **Verified \[date\]** means the details were confirmed with the venue, by phone, email or its website, and the place page says which. Anything not confirmed shows "Not confirmed yet". Never call a place Vavy-checked because its website was read.

## Discover: 9 categories and all 99 subcategories

**Discover has 9 categories and 99 subcategories, and every one gets its own page today.** The Discover hub card for each category lists all of its subcategories as chips, and "Everything on Compass" lists them all. Each subcategory groups place types from the workbook's **Discover Map** sheet (355 live place types). Names, slugs, order, chip rows, season months and page titles come from the workbook's **Discover Subcategories** sheet; never retype them in code.

**How chips show:** Camps uses two rows, **When** (Winter break and holidays, PA days, March break, Summer) then **Type** (the rest). In every category, in-season subcategories come first. Subcategories marked *seasonal only* hide outside their months, so a page never looks empty (in shell mode they still show, with their months).

**Subcategory page titles:** Camps When row: "Winter break camps in {city}", "PA day camps in {city}", "March break camps in {city}", "Summer camps in {city}". Camps Type row: "{Subcategory} camps for kids in {city}". Day Trips & Getaways: "{Subcategory} from {city} for families". Everything else: "{Subcategory} for kids in {city}". With no city picked, {city} is "Ontario".

### 1. Camps

`/[city]/camps` · Live at launch · icon `Tent` · page title: "Camps in {city}: winter break, PA day and summer camps for kids"

Card copy: "Day camps for school breaks, PA days and summer. Check dates, ages, hours, cost and spots left."

| Subcategory | Slug | Place types in it | Chips and season |
| --- | --- | --- | --- |
| Winter break and holidays | `winter-break` | Winter Camp Centre, Holiday Camp Venue | When row; leads Nov–Jan |
| PA days | `pa-days` | PA Day Camp Facility | When row; leads Sep–Jun |
| March break | `march-break` | March Break Camp Centre | When row; leads Jan–Mar |
| Summer | `summer` | Day Camp Centre, Outdoor Camp Campus, Community Day Camp | When row; leads Jan–Aug |
| Overnight | `overnight` | Residential Camp | Type row |
| Sports | `sports` | Sports Training Camp, Soccer Camp Facility, Basketball Camp Facility, Hockey Camp Arena, Aquatic Camp Centre | Type row |
| Arts and performing | `arts` | Dance Camp Studio, Music Camp Campus, Art Camp Studio, Drama Camp Theatre, Photography Studio | Type row |
| STEM | `stem` | STEM Camp Centre, Robotics Lab Camp, Coding Camp Lab, Science Discovery Camp, Chess Academy, Math Learning Centre, Innovation Hub | Type row |
| Nature, farm and animals | `nature-farm` | Nature Education Centre, Adventure Camp Base, Wilderness Camp, Educational Farm Camp, Animal Learning Centre | Type row |
| Language, leadership and cooking | `language-leadership-cooking` | Leadership Training Centre, Communication Academy, Teaching Kitchen, Baking Studio, Language Learning Centre, French Immersion Centre, Youth Leadership Camp | Type row |
| Inclusive and special needs | `inclusive` | Inclusive Camp Centre, Universal Access Camp | Type row |
| Multi-activity | `multi-activity` | Multi-Activity Campus | Type row |

A camp's season really comes from each session's dates, not the facility. A camp running summer and March break sessions shows in both.

### 2. Play & Fun

`/[city]/play-fun` · Live at launch · icon `FerrisWheel` · page title: "Indoor play and fun things to do with kids in {city}"

Card copy: "Indoor playgrounds, trampoline parks, climbing, theme parks and rainy-day fun."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Indoor playgrounds | `indoor-playgrounds` | Soft Play Centre, Adventure Play Centre, Toddler Play Centre, Multi-Level Play Centre, Inflatable Play Park | All year |
| EarlyON and drop-in play (new) | `earlyon-drop-in-play` | EarlyON Child and Family Centre, Family Resource Centre | All year |
| Trampoline and ninja parks | `trampoline-ninja` | Family Trampoline Park, Ninja Trampoline Park, Ninja Training Gym | All year |
| Climbing gyms | `climbing` | Bouldering Gym, Top Rope Climbing Gym | All year |
| Adventure and ropes parks | `adventure-ropes` | Ropes Course, Zipline Park, Aerial Adventure Park, Obstacle Course | All year |
| Amusement and theme parks (new) | `amusement-theme-parks` | Amusement Park (new), Theme Park (new) | Leads May–Oct |
| Water parks | `water-parks` | Indoor Water Park, Outdoor Water Park | Leads Jun–Aug |
| Ski and snow tubing hills (new) | `ski-snow-tubing` | Local Ski Hill (new), Snow Tubing Park (new) | Dec–Mar, seasonal only |
| Arcades, bowling and games | `arcades-bowling-games` | Family Arcade, Redemption Arcade, 10-Pin Bowling Centre, Boutique Bowling, Indoor Mini Golf, Outdoor Mini Golf, Glow-in-the-Dark Mini Golf, Indoor Laser Tag Arena, Outdoor Laser Tag, VR Arcade, VR Escape Experience, Indoor Go Kart Track, Outdoor Go Kart Track, FEC, Board Game Café, Kid-Friendly Escape Room (new) | All year |
| Roller and skate parks | `roller-skate-parks` | Roller Rink, Indoor Skatepark, Concrete Skatepark | All year |
| Paint-your-own pottery and crafts (new) | `pottery-crafts` | Paint-Your-Own Pottery Studio (new), Drop-In Craft Studio (new) | All year |
| Movies and kids' theatre | `movies-theatre` | Children's Theatre, Multiplex Cinema, Drive-In Cinema | All year |

A local ski hill you visit for an afternoon goes here. A ski resort you stay at goes in Day Trips & Getaways.

### 3. Parks & Nature

`/[city]/parks-nature` · Coming soon · icon `Trees` · page title: "Parks, playgrounds and nature with kids in {city}"

Card copy: "Playgrounds, splash pads, trails, beaches and tobogganing hills."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Playgrounds | `playgrounds` | Destination Playground, Community Playground, Inclusive Playground, Adventure Playground, Nature Playground, Toddler Playground, School Playground, Waterfront Playground, Playground with Splash Pad | All year |
| Splash pads | `splash-pads` | Standalone Splash Pad, Splash Pad in Park, Inclusive Splash Pad | Leads Jun–Sep |
| Parks (new) | `parks` | Community Park (new), Neighbourhood Park (new), Destination Park (new), Waterfront Park (new), Urban Park (new), Regional Park (new), Heritage Park (new) | All year |
| Winter fun (new) | `winter-fun` | Tobogganing Hill (new), Outdoor Rink (new), Skating Trail (new), Snowshoe Trail (new), Cross-Country Ski Trail (new) | Leads Dec–Mar |
| Trails | `trails` | Walking Trail, Hiking Trail, Waterfront Trail, Cycling Trail, Boardwalk Trail, Forest Trail | All year |
| Beaches | `beaches` | Lake Beach, Sand Beach, Pebble Beach, Supervised Beach | Leads Jun–Sep |
| Conservation and provincial parks | `conservation-provincial-parks` | Camping Provincial Park, Day Use Provincial Park, Waterfront Provincial Park, National Park, Conservation Area | All year |
| Gardens and nature centres | `gardens-nature-centres` | Nature Centre, Botanical Garden, Arboretum | All year |
| Picnic spots | `picnic-spots` | Reservable Picnic Area, Open Picnic Area | Leads May–Sep |
| Waterfalls and lookouts | `waterfalls-lookouts` | Scenic Waterfall, Scenic Lookout | All year |
| Boat tours and paddling (new) | `boat-tours-paddling` | Boat Tour (new), Passenger Ferry (new), Canoe & Kayak Rental (new) | Leads May–Oct |
| Caves and rock formations (new) | `caves` | Show Cave (new) | All year |
| Stargazing spots (new) | `stargazing` | Dark-Sky Preserve (new) | All year |
| Fishing spots (new) | `fishing` | Fishing Pier, Stocked Fishing Pond (new) | All year |

School playground listings must say when they're open to the public. Outdoor rinks and skating trails are places you turn up to any time; scheduled public skates at arenas are in Classes & Programs.

### 4. Animals & Farms

`/[city]/animals-farms` · Coming soon · icon `PawPrint` · page title: "Zoos, farms and animal outings for kids near {city}"

Card copy: "Zoos, aquariums, farms, pick-your-own and pumpkin patches."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Zoos and safari parks | `zoos-safari` | City Zoo, Safari Park | All year |
| Aquariums | `aquariums` | Public Aquarium | All year |
| Farms and petting farms | `farms-petting-farms` | Working Educational Farm, Petting Farm (new) | All year |
| Pick-your-own (new) | `pick-your-own` | Pick-Your-Own Farm (new) | Jun–Oct, seasonal only |
| Pumpkin patches and corn mazes (new) | `pumpkin-patches` | Pumpkin Patch & Corn Maze (new) | Sep–Oct, seasonal only |
| Maple sugar bushes (new) | `maple-sugar-bushes` | Maple Sugar Bush (new) | Mar–Apr, seasonal only |
| Christmas tree farms (new) | `christmas-tree-farms` | Christmas Tree Farm (new) | Nov–Dec, seasonal only |
| Horse riding and pony rides (new) | `horse-riding` | Horse Riding Stable (new) | All year |
| Flower fields (new) | `flower-fields` | Flower Field (new) | Jun–Sep, seasonal only |
| Butterflies and birds | `butterflies-birds` | Bird Sanctuary, Butterfly Conservatory | All year |
| Farm markets | `farm-markets` | Farm Market | All year |

### 5. Learning & Culture

`/[city]/learning-culture` · Coming soon · icon `Landmark` · page title: "Museums, science centres and libraries for kids in {city}"

Card copy: "Museums, science centres, libraries, historic sites and culture."

| Subcategory | Slug | Place types in it |
| --- | --- | --- |
| Museums | `museums` | General Museum, Children's Museum, Natural History Museum, Science Museum, Transportation Museum, Railway Museum, Aviation Museum, Maritime Museum, Military Museum, Art Museum, Travelling Exhibition |
| Science centres and planetariums | `science-centres` | Interactive Science Centre, STEM Discovery Centre, Discovery Centre, Planetarium, Public Observatory, Robotics Discovery Centre |
| Libraries and story time | `libraries` | Public Library, Regional Library, Children's Library, Storytime Room |
| Art galleries | `art-galleries` | Public Art Gallery, Interactive Children's Gallery |
| Historic sites and pioneer villages | `historic-sites` | Historic House, Historic Fort, Pioneer Village, Living History Museum, Archaeological Park |
| Cultural centres | `cultural-centres` | Multicultural Centre |
| Indigenous culture and heritage (new) | `indigenous-culture` | Indigenous Cultural Centre |
| Makerspaces | `makerspaces` | Library Makerspace, Innovation Hub |
| Public art | `public-art` | Public Art Trail, Sculpture Garden |

### 6. Classes & Programs

`/[city]/classes-programs` · Coming soon · icon `GraduationCap` · page title: "Kids' classes and drop-ins in {city}: swim, skate, sports, art and more"

Card copy: "Weekly lessons and drop-ins: swim, skate, sports, art, music and STEM."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Drop-ins: swim, skate and rec (new) | `drop-ins` | Community Arena, Community Recreation Centre, Public Pool / Aquatic Centre (new) | All year |
| Swimming lessons | `swimming` | Swim School | All year |
| Skating, hockey and ringette (new) | `skating-hockey-ringette` | Figure Skating Club (new), Minor Hockey Association (new), Ringette Association (new) | Leads Sep–Mar |
| Sports and gymnastics | `sports-gymnastics` | Soccer Academy, Basketball Academy, Baseball Training Centre, Tennis Club, Gymnastics Club, Yoga Studio | All year |
| Martial arts | `martial-arts` | Martial Arts Dojo, Karate Dojo, Taekwondo Dojang | All year |
| Dance | `dance` | Dance Studio, Ballet Academy, Hip Hop Studio | All year |
| Music | `music` | Music School, Piano Academy, Guitar Studio, Strings Academy, Vocal Studio | All year |
| Art and crafts | `art-crafts` | Art Studio, Painting Studio, Drawing Academy, Ceramics Studio, Craft Studio | All year |
| Drama and public speaking | `drama-public-speaking` | Drama School, Public Speaking Academy | All year |
| STEM and coding | `stem-coding` | Coding Academy, Robotics Lab, STEM Learning Centre, Science Learning Centre | All year |
| Academics and languages | `academics-languages` | Chess Academy, Mental Math Centre, Abacus Academy, English Learning Centre, French Language School, Hindi Language School, Phonics Centre, Reading Centre, Creative Writing Centre, Tutoring Centre | All year |
| Cooking | `cooking` | Cooking School | All year |
| Parent and baby classes (new) | `parent-baby` | Parent & Tot Studio (new) | All year |
| Clubs and youth groups (new) | `clubs-youth-groups` | Scouts Group (new), Girl Guides Unit (new), 4-H Club (new), Youth Club (new) | All year |

Drop-ins are program sessions (public swim, public skate, rec drop-in) linked to their host venue. The card copy names them so parents know to look here.

### 7. Events

`/[city]/events` · Coming soon · icon `CalendarDays` · page title: "Family events and things to do this week in {city}"

Card copy: "Festivals, shows, markets, holiday lights and seasonal celebrations."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Festivals and fairs | `festivals-fairs` | Festival Grounds, Town Square, Community Park Event Space, Neighbourhood Park, Botanical Garden Event Space, Outdoor Event Park, Fairgrounds, Cultural Centre, Concert Grounds, Dance Theatre | All year |
| Holiday and seasonal | `holiday-seasonal` | Winter Festival Village, Seasonal Event Plaza, Holiday Light Display (new) | Leads Nov–Jan |
| Markets | `markets` | Farmers' Market Square, Night Market Venue, Holiday Market Square, Craft Market Hall | All year |
| Shows: theatre, puppets, magic, circus | `shows` | Performance Venue, Theatre, Children's Theatre, Performance Hall, Circus Tent, Meet & Greet Zone | All year |
| Library, museum and learning events | `learning-events` | Education Centre, STEM Centre, Science Centre Auditorium, Museum Event Hall, Library Program Room, Storytelling Room, Bookstore Event Space, Art Gallery, Workshop Studio | All year |
| Nature walks and star nights | `nature-walks-star-nights` | Nature Trailhead, Conservation Area Trailhead, Bird Observatory, Observatory | All year |
| Sports days and fun runs | `sports-days-fun-runs` | Sports Complex, Race Start Area, Community Sports Field | All year |
| Sports games to watch (new) | `sports-games` | Spectator Sports Venue (new) | All year |
| Outdoor movies and fireworks | `outdoor-movies-fireworks` | Outdoor Amphitheatre, Fireworks Viewing Area | Leads Jun–Aug |

Holiday and seasonal includes holiday lights and Santa visits. Events are dated records linked to a venue; these venue types are a stopgap until that clean-up (GAP-018).

### 8. Food & Treats

`/[city]/food-treats` · Coming soon · icon `IceCreamCone` · page title: "Kid-friendly restaurants and treats in {city}"

Card copy: "Family-friendly restaurants, play cafés and sweet stops."

| Subcategory | Slug | Place types in it |
| --- | --- | --- |
| Family restaurants | `family-restaurants` | Family Restaurant, Casual Restaurant, Food Truck, Farm-to-Table Restaurant, Buffet Restaurant, All-You-Can-Eat Restaurant, Birthday Party Restaurant, Healthy Café |
| Breakfast, brunch and cafés | `breakfast-brunch-cafes` | Brunch Café, Breakfast Restaurant, Neighbourhood Café, Coffee House, Tea House |
| Play cafés and kids' cafés | `play-cafes` | Kids Café, Play Café |
| Ice cream and gelato | `ice-cream` | Ice Cream Parlour, Gelato Shop, Frozen Yogurt Bar |
| Bakeries and desserts | `bakeries-desserts` | Dessert Café, Artisan Bakery, Cupcake Boutique, Donut Shop, Chocolate Boutique, Candy Shop, Cookie Bakery |
| Bubble tea and smoothies | `bubble-tea-smoothies` | Bubble Tea Café, Juice & Smoothie Bar |
| Pizza and burgers | `pizza-burgers` | Pizzeria, Burger Restaurant |
| World cuisines | `world-cuisines` | Indian Restaurant, Italian Restaurant, Chinese Restaurant, Japanese Restaurant, Korean Restaurant, Mexican Restaurant, Middle Eastern Restaurant, Thai Restaurant |
| Patios and waterfront | `patios-waterfront` | Waterfront Restaurant, Patio Dining |

### 9. Day Trips & Getaways

`/[city]/day-trips-getaways` · Coming soon · icon `Car` · page title: "Day trips and family getaways from {city}"

Card copy: "Day trips, family resorts, cottages and easy weekends away."

| Subcategory | Slug | Place types in it | Season |
| --- | --- | --- | --- |
| Day trips | `day-trips` | Day Trip Destination | All year |
| Weekend getaways and hotels | `weekend-getaways` | Family Hotel, Suite Hotel, Boutique Hotel, Weekend Resort, Urban Staycation Hotel | All year |
| Family resorts | `family-resorts` | Resort, Family Resort, All-Inclusive Resort, Beach Resort, Lakefront Retreat, Waterfront Lodge, Island Resort, Eco Lodge | All year |
| Cottages and cabins | `cottages-cabins` | Vacation Home, Vacation Apartment, Lake Cottage, Luxury Cottage, Log Cabin, Forest Cabin | All year |
| Camping and glamping | `camping-glamping` | Luxury Glamping Tent, Geodesic Dome, Yurt, Tent Campground, Serviced Campground, RV Campground, Camping Provincial Park, National Park Campground, Conservation Camping Area | Leads May–Oct |
| Ski resorts | `ski-resorts` | Mountain Ski Resort | Leads Dec–Mar |
| Theme and water park resorts | `theme-water-park-resorts` | Water Park Resort, Theme Park Resort | All year |
| Farm stays | `farm-stays` | Farm Stay | All year |
| Scenic drives and train rides | `scenic-drives-trains` | Scenic Road Trip Route, Scenic Drive, Heritage Railway | All year |

Day Trips & Getaways sorts by drive time by default.

### Parked and merged (never shown in Discover)

These stay in the data but never appear in Discover, search or sitemaps. Parked items can come back later; merged items are duplicates whose listings move to the type named.

| Place type | ID | Status | Why |
| --- | --- | --- | --- |
| Off-Leash Dog Park, Leashed Dog Park, Public Marina, Memorial Park, Civic Park | `PT-PN-031`, `PT-PN-032`, `PT-PN-035`, `PT-PN-048`, `PT-PN-049` | Parked | Low value for families with kids under 12 |
| Tent Campground | `PT-PN-040` | Merged | Into Day Trips & Getaways › Tent Campground (`PT-TRV-018`) |
| Esports Lounge, Paintball Arena | `PT-PE-038`, `PT-PE-040` | Parked | Mostly 13+ |
| Nature Centre | `PT-LC-029` | Merged | Into Parks & Nature › Nature Centre (`PT-PN-028`) |
| Fine Dining Restaurant | `PT-FOOD-003` | Parked | Not a family outing |
| Business Hotel, Roadside Motel, Wine Country Inn, Cruise Terminal | `PT-TRV-001`, `PT-TRV-008`, `PT-TRV-033`, `PT-TRV-038` | Parked | Not a family stay or out of scope |
| Shopping (38 types) | `PT-SHP-…` | Parked | Clashes with the Compass Shop. Farm Market moved to Animals & Farms |
| Chocolate Boutique | `PT-SHP-039` | Merged | Into Food & Treats › Chocolate Boutique (`PT-FOOD-018`) |
| Services (37 types) | `PT-SRV-…` | Parked | Kept for a later Household Services section. Community Recreation Centre, EarlyON and Family Resource Centres moved into Discover |

**Totals:** 445 place types (45 new), 355 live in Discover, 90 parked or merged. Data fix: `PT-CAMP-017` is "STEM Camp Centre" (it was wrongly named "leadership Training Centre").

## Discover page templates, listings, locations and collections

**Three templates serve all of Discover:** the hub (board 2), the category and subcategory page (board 3, used for all 9 categories and 99 subcategories) and the place page (board 4).

### Discover hub (`/[city]/discover`)

Headline "Discover family fun across Ontario" (or "…in \[city\]"), the search bar, a "Browse by occasion" row (live only), then 9 category cards in a 3-column grid (1 column on phones). Each card: a photo once photos exist (until then a cream tile with the line icon), the name, a short editorial line, the card copy, and the subcategories as quiet text links: the first 6 show, and "+ N more" opens the rest in place, so every subcategory is on the page without crowding it. Button: "Browse" (live) or "Notify me" (coming soon). Editorial lines: Camps "School breaks, sorted"; Play & Fun "Rainy-day favourites"; Parks & Nature "Get outside together"; Animals & Farms "Meet the animals"; Learning & Culture "Curious minds welcome"; Classes & Programs "Lessons they'll love"; Events "What's on this week"; Food & Treats "Where kids eat happily"; Day Trips & Getaways "Worth the drive". Below the grid: the "List your camp or venue" band.

### Category and subcategory page (`/[city]/[category]` and `/[city]/[category]/[subcategory]`)

Top to bottom: breadcrumb (Discover › Category › Subcategory); title from the page title pattern; one-line intro; subcategory chips (Camps: When row, then Type row); filter bar (4–5 quick chips plus "More filters"); map toggle; place cards in a grid; 1–2 relevant collections; "List your camp or venue" band. In shell mode the filter bar, map and cards are replaced by "What you'll find here" (the place types as plain words), "What we check for every listing" (the 14 questions below, as a short list) and the Notify me form.

### Place page (`/[city]/places/[place-slug]`)

Photo gallery (Vineeta's own photos where possible), name, Vavy-checked pill, "Latest verified \[date\]", the answer strip (price for a family, ages, open today, drive time), then sections answering every question below, the map, "Save", "Add to plan", "Compare" and "Remind me". Built today as a template only; no public places until listings go live.

### Listing design rules (from the November 17 creative review)

- **Place page, at a glance:** right under the title, three short lines: **Best for**, **Parent tip**, **Know before you go** (Vineeta writes these; hidden until written). Practical details sit in four expandable groups: Tickets and booking; Kids and facilities; Food and comfort; Accessibility and safety.
- **Verification panel** on every place page: the last check date, how it was checked (visit, phone, email, website) and a list of anything still unconfirmed.
- **Camp card order:** photo; camp name and provider; city and ages; then four clear lines: Dates, Hours, Price, Availability; then two tags at most (for example Before and after care, STEM). The **Book** button (to the provider's own page) is more prominent than Compare.
- **Availability belongs to each camp session (week), not the camp.** Changing the week changes the price, ages and availability shown. Statuses: Registration open, Spots confirmed, Waitlist, Availability unknown. Never show "spots left" without a source and time.
- **Camp filters:** "Fits all my kids" (2 or more children), "Available to book" (confirmed sessions only), and a total-cost view including before- and after-care and sibling discounts when confirmed.
- No star ratings or reviews until there are real ones from real families.

### What every listing must answer

No place page goes live until it answers every question. A missing answer shows "Not confirmed yet" and goes on the call sheet; never blank, never guessed.

| # | Parent question | Where it's stored |
| --- | --- | --- |
| 1 | How much for my kids and for me? Is it free? | Admission price per child, adult and family, plus free entry (GAP-009) |
| 2 | Is it right for my kids' ages? | Minimum and maximum age (GAP-010), kept exactly as the venue publishes, including teen tiers |
| 3 | Is it open today, and in which seasons? | Weekly hours, holiday exceptions, season start and end (GAP-011) |
| 4 | Can we just turn up, or do I book? Where do I book? | Drop-in, book ahead or register for a season (GAP-012), plus the booking link |
| 5 | Where do I park, and is it free? | `FT-TP-001`, `FT-TP-011`, `FT-TP-012` |
| 6 | Are there washrooms and change tables? | `FT-CF-014`, `FT-FB-001`, `FT-FB-005` |
| 7 | Can I bring a stroller? | `FT-FB-025` to `FT-FB-027` |
| 8 | Can we bring food, or is there food nearby? | `FT-FD-021`, `FT-FD-022`, nearby food note |
| 9 | How long should we plan to spend? When is it quietest? What if the weather turns? | Visit length, quiet times, weather backup (GAP-019) |
| 10 | Is it safe? Is it fenced? Are there lifeguards? | `FT-SS-001`, `FT-SS-003`, `FT-SS-031` |
| 11 | Is it accessible for my child or me? | `FT-AC-009`, `FT-AC-016`, `FT-AC-024`, sensory hours `FT-AC-041` |
| 12 | How far is it, and how do I get there? | Address, map pin, drive time, transit `FT-TP-035` |
| 13 | What does it actually look like? | Photos, Vineeta's own where possible |
| 14 | When was this checked, and has Compass been there? | "Latest verified \[date\]" (never "live") and Vavy-checked status |

**Extra for camps:** dates and sessions; daily hours; before- and after-care and its cost; ages or grades; cost per day, week and session, and sibling discounts; spots left and the camp's own booking link; what kids bring and whether lunch is included; staff qualifications and ratio; allergy and medical policy; refund and cancellation policy; location and drop-off; which school board's PA days a PA day camp matches.

**Extra for classes and drop-ins:** session days and times; term dates; drop-in or register; cost per class and per term; skill level; class size; language of instruction (GAP-014); trial class; whether a parent stays.

**Extra for tobogganing hills:** whether the city permits tobogganing there (top of the page); hill size; what's at the bottom (open run-out, or trees, a road, a pond, a fence); lit for evening; parking and the walk with sleds; washrooms open in winter; nearby warm-up spot (GAP-016).

**Extra for events:** date and time; venue (linked to its place page); cost; ages; tickets or drop-in; weather plan for outdoor events.

### Filters

27 filters work across Discover; things that describe a place are filters, not subcategories. 17 are ready, 1 comes from the verification record, 1 is computed, and 8 wait for new fields (gaps). A gap filter stays hidden until its field exists. The full table is in the appendix. The filter bar shows 4–5 quick chips (Free, Ages, Indoor or outdoor, Open today, Drive time) and "More filters" for the rest; only filters that apply to that category show. City, region and season are not filters: they come from the location picker and dates. In shell mode no filters show.

### Location, regions, drive time and PA days

| Layer | What it is | Source |
| --- | --- | --- |
| City | The header picker, city-level only (Mississauga, Oakville, Brampton, Toronto…) | Place address |
| Region | Ontario's 13 tourism regions (including 13a–c) for day trips and "near me" outside the GTA | Workbook **Regions Reference** plus the **Location Lookup** in `Ontario_Regions.xlsx` (about 2,186 places) |
| Drive time | Within 15, 30, 60 or 120 minutes of the family | Place coordinates plus the family's postal code or device location, with consent |
| Map | Map view on category and collection pages | Mapbox GL JS |

A place has one city and one region. **PA days:** Ontario has 72 district school boards (31 English public, 29 English Catholic, 4 French public, 8 French Catholic), each with its own PA days. A family picks its board (or school) in Account, or on the PA days page without an account (remembered on the device). Compass stores each board's PA days, winter break, March break and holidays, each with its source link and checked date. Private-school families can enter their own PA days. **Launch boards (January–February 2027 PA days):** Peel DSB, Dufferin-Peel CDSB, Halton DSB, Halton CDSB, Conseil scolaire Viamonde, Conseil scolaire catholique MonAvenir.

### Collections, editorials and occasions

| Kind | What it is | Lives in | Example |
| --- | --- | --- | --- |
| Hand-picked collection | Short intro plus places Vineeta chose, ideally Vavy-checked | Discover, own page | Best tobogganing hills in Mississauga |
| Automatic collection | Saved filters that stay current on their own | Discover, own page | Free things to do this winter |
| Editorial or guide | An article in Vineeta's voice, which can include a collection | Guides | How to pick a winter break camp |

Collections are data, not code: Vineeta creates, orders and schedules them without a Cursor job, each with a season window. **Occasions** (each an automatic collection with its own page): Rainy day, Snow day, Hot day, PA day, Birthday party, Grandparents visiting, First outing with a baby, After school, Long weekend, Free this weekend. **Launch collections (January 1):** Best tobogganing hills in Mississauga; Free things to do this winter; Rainy-day and cold-day indoor play; Winter break camps; PA day camps, January–February 2027.

### Discover components

| Component | Where | Behaviour |
| --- | --- | --- |
| `CategoryIconRow` | Home, Discover hub | 9 icons with labels, Camps first, forest green (Camps fox orange). Scrolls sideways on phones |
| `CategoryCard` | Discover hub | Icon or photo, name, card copy, every subcategory as chips, "Browse" or "Notify me" |
| `SubcategoryChips` | Category pages | One chip per subcategory in workbook order; Camps in When and Type rows; season ordering |
| `FilterBar`, `FilterSheet` | Category, subcategory, collection, occasion pages | Quick chips plus "More filters"; full-screen sheet on phones; shows the match count before applying |
| `PlaceCard` | Everywhere places are listed | Photo, name, Vavy-checked pill, family price, ages, drive time, open today, 2–3 features, "Latest verified \[date\]", heart |
| `CollectionRail` | Home, category pages | Title, "See all", sideways row of PlaceCards |
| `NotifyMe` | Coming-soon and shell pages | Email field using the waitlist submit logic; records category, subcategory and city |
| `WhatYoullFind` | Shell pages | The subcategory's place types as plain words |
| `WhatWeCheck` | Shell pages, `/how-we-check` | The 14 listing questions |
| `BoardPicker` | PA days, Account | Search for a school board or school; remembered on the device |
| `EmptyState` | No results | "No places match these filters", clear-last-filter button, 3 nearby suggestions |
| `EverythingDirectory` | Home, `/everything` | Every category as a heading with every subcategory as links |

## Plan: the family planner

**Plan is the family planner.** Parents save things as they browse (a camp, a park, an event), then see their month, week, weekend or day with everything saved beside it. Plan spots free time and suggests what to do with it. It's what makes Compass the place a family organises around. Boards: 5. Plan: week (Plan opens here) and 5b. Plan: month. Plan reads everything from Discover's data and never keeps its own copy of a listing.

### Plan decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | **A planner, not a "plan my day" form** (Vineeta, Nov 17). Opens on the family's week, with Month, Week, Weekend and Day views | Parents arrive with saved things and a busy week |
| 2 | **Saved sits beside the planner.** Anything hearted can be added to a day, at a time, for a child | Saving is how planning starts |
| 3 | **Free time shows "Free: Get ideas."** Ideas come from Saved first, then Discover | Turns empty weekends, PA days and break days into plans |
| 4 | **School breaks show coverage per child** ("3 of 8 days covered") with "Fill the gaps" | The standout need for working parents |
| 5 | **Saving works without an account**, on the device. Sign-up only to sync and get reminders | Browsing and planning stay free with no login |
| 6 | Compare and reminders are one tap from any saved item. Compare is a small tray; reminders live in Account | Fewer pages to learn |
| 7 | Ideas use tap-to-pick chips, plus an optional typed sentence turned into chips. Vavy never writes its own answers | Only real, checked listings |
| 8 | The Breaks planner is ready by February 1, 2027 | Before March break registration |
| 9 | Reminders by email at launch, phone notifications later | Works for everyone on day one |
| 10 | Compass doesn't take bookings. Parents book on the camp's page and tap "I booked this" | Compass never claims a booking is confirmed |
| 11 | **Household intelligence lives inside Plan** (see the next section). Five features ship January 1 | It's what makes Compass more than a directory |

### What's in Plan

| # | Part | What the parent does | What they get | Needed by |
| --- | --- | --- | --- | --- |
| 1 | Planner views | Switches Month, Week (default), Weekend, Day | One calendar: no-school days from their board, booked camps and classes, planned outings, registration dates and the weather on each day, a colour per child. Phones show a day-by-day list | Jan 1 |
| 2 | Saved | Hearts anything, then "Add to plan" (or drags it onto a day on a computer) | Everything saved in one shelf, filtered by Camps, Places, Events, each showing whether it's planned | Jan 1 |
| 3 | Get ideas | Taps "Get ideas" on any free day or time | 3–5 options, Saved first then Discover, each with "why it fits" and "Add to \[day\]" | Jan 1 |
| 4 | Breaks planner | Opens a school break or PA day | Each day per child covered or free, siblings who can attend the same camp, total cost, "Fill the gaps" | Feb 1 |
| 5 | Compare | Ticks 2–4 camps or classes | Side by side: dates, hours, ages, cost (with sibling pricing), before- and after-care, spots left, drive time, Vavy-checked | Jan 1 |
| 6 | Reminders | "Remind me" on anything, or automatic for booked and saved items | Emails when registration opens, a deadline is near, spots run low, a price or date changes, or a PA day is this week | Jan 1 |
| 7 | Your own calendar | Adds the subscribe link once | Plan shows in Google or Apple Calendar and updates itself | Jan 1 |

Kids' details live in the family profile in Account. Until a parent signs up, Plan asks for ages and the school board inline and keeps them on the device.

### How Get ideas decides

Get ideas is a matching engine, not a chatbot. It runs in code on the site, using the same data and filters as Discover. The same inputs always give the same results. It opens with chips pre-filled from the slot tapped (date, hours free, which kids, weather) and always checks Saved first.

**1. Inputs (chips)**

| Chip | Choices | Default |
| --- | --- | --- |
| When | Today, tomorrow, this Saturday or Sunday, a date; start time and hours available (2, 3, 4, 6, full day) | Next weekend day, 4 hours from 10 am |
| Who | Each child's age (from the profile or entered) | From the profile |
| Where from | Home postal code, current location, or a city | City in the header picker |
| Max drive | 15, 30, 60 or 120 minutes | 30 minutes |
| Budget | Free, under $25, under $50, under $100, any (whole family) | Any |
| Inside or out | Indoor, outdoor, or "go by the weather" | Go by the weather |
| Must-haves | Any Ready filter (stroller, toddler area, change tables, food on site, accessible, nut-free…) | None |

An optional sentence ("rainy Saturday with a 2- and 7-year-old, back by 3, cheap") is turned into chips the parent sees and can change. It never produces free-form answers.

**2. Hard rules: a place is left out if any fails**

1. It isn't open for the whole chosen window, or the date is outside its season
2. No child's age fits its age range
3. It's beyond the max drive time
4. Its family cost for these kids is over budget (unknown prices pass only on "any" budget, labelled "Price not confirmed")
5. Weather says indoor (rain chance 50% or more, below −10°C with wind chill, above 30°C humidex, or a weather warning) and the place is outdoor, unless the parent picked outdoor
6. A must-have is missing or not confirmed
7. Its type is Parked or Merged, or it hasn't been verified in the last 12 months

**3. Ranking:** fits **every** child's age (not just one); shorter drive; Vavy-checked; more recently verified; more nice-to-haves; free or cheaper. Then variety: no two of the top 5 from the same subcategory.

**4. The ready-made day:** 2–3 hours = one activity. 4–5 hours = activity plus lunch or a treat nearby (Food & Treats, open then, kids' menu or high chairs, within 10 minutes). 6+ hours = morning activity, lunch, afternoon activity in a different subcategory within 20 minutes of lunch. Each day shows the timeline, every drive, the family cost total (or "some prices not confirmed") and one backup if the weather turns.

**5. "Why it fits":** one line built only from matched rules, for example "Indoor, 14 minutes away, fits both kids (ages 2 and 7), free." No adjectives, no claims beyond the data.

**6. Weather:** Environment and Climate Change Canada's open forecast data (MSC), behind one swappable function. Confirm licence terms before launch. Beyond the forecast range, the parent picks indoor or outdoor.

### Plan pages and components

Routes are in the site map. The top of Plan shows the view switch (Month · Week · Weekend · Day), the date range with arrows, a colour key per child, "+ Add", and links to Breaks planner and Compare. No Plan sub-tabs, no bottom tab bar.

| Component | Used in | Behaviour |
| --- | --- | --- |
| `PlannerViewSwitch` | Plan | Month, Week, Weekend, Day; remembers the last view; phones default to a day-by-day list |
| `WeekGrid` | Week and weekend views | A column per day: weather, booked items, plans and deadlines, coloured by child; free time as a dashed "Free: Get ideas" slot |
| `MonthGrid` | Month view | Month calendar plus a side panel: "Needs a plan", "Coming up", the subscribe link |
| `SavedShelf` | Beside the planner, `/plan/saved` | Filters (All, Camps, Places, Events); each item "Add to plan" or "Planned \[day\] ✓"; drag onto a day on desktop |
| `AddToPlan` | Saved items, place pages, ideas | Pick day, time and children; runs the clash check |
| `IdeasPanel` | Under the calendar | 3–5 options, "From your Saved" first, then "From Discover", with "why it fits", "Add to \[day\]", Compare; shows and edits the chips used |
| `SaveButton` | Every card on the site | One tap saves; works without an account |
| `CompareTray` | All Discover and Plan pages | Small collapsible tray, up to 4 items, hidden when empty |
| `BreakCoverage` | Breaks planner | A row per child, a column per day: covered, free or weekend; total cost; "Fill the gaps" |
| `RemindMe`, `BookedButton` | Camp and class pages, Saved | "Remind me" picks reminder types; "I booked this" picks child and session and puts it on the planner |

### Plan rules

- **Trust:** only real, verified listings. If nothing matches, say so and suggest loosening one chip ("Try 60 minutes' drive"). Never pad with unverified places. Never invent a status, price, age or spot count. Spots left always shows when it was updated ("5 spots left, updated 2 hours ago"). Compass never says a booking is confirmed.
- **Kids' data:** the least possible (nickname, birth month and year, interests, school board). Never public, never sold, never shared with providers without the parent's deliberate action. Deletable anytime, completely. Device-only saves stay on the device until sign-up.
- **Reminders:** only what the parent asked for, or items they saved or booked. No marketing in reminders. One-click unsubscribe per type, CASL consent and sender details. No more than one reminder email a day per family; batch the rest.
- **Design:** Get ideas works in one tap from any free slot. On phones the calendar is an agenda list, not a squeezed grid.

**Three states, three looks:** Saved (outline heart, on the shelf), Planned (on a day, solid colour of the child), Booked (marked by the parent with "I booked this", with a check and the word Booked). The planner never makes a saved camp look booked.

## Household intelligence

**Household intelligence is what makes Compass the place a family runs its weeks from, not just a list of places.** It means Compass knows the family's kids, school board, saves and bookings, and does the thinking a parent does in their head: who fits, what clashes, what's due, what's free. Five features ship January 1 inside Plan; ten more follow on the roadmap. Everything runs as code on the site from the family's own data; nothing is guessed.

### The 5 launch features (January 1, 2027, inside Plan)

| # | Feature | What the parent sees | How it works | Data needed |
| --- | --- | --- | --- | --- |
| 1 | **Fits all my kids** | A toggle on every Discover page and in Get ideas: "Fits Maya and Arjun" (the family's nicknames). Cards show "Fits both" or "Fits Maya only" | A place or session fits when every selected child's age is inside its age range. Shown only when the family has 2 or more children | `children.birth_month`, `birth_year`; place and program ages (GAP-010) |
| 2 | **Clash check** | When adding to the plan: "Arjun has swim at 10:00. Both drop-offs are 18 minutes apart." with "Add anyway" or "Pick another time" | Checks the new item against every plan item and booking that day, for any child, including drive time between them | `plan_items`, `bookings`, place coordinates |
| 3 | **Sibling pricing** | Camp cards, Compare and break totals show the real family price: "2 kids: $540 (10% sibling discount)" | Applies each program's published sibling discount; shows "No sibling discount listed" if there isn't one | New `programs.sibling_discount` (GAP-021) |
| 4 | **The Thursday weekend email** | Every Thursday: the weekend's weather, the family's free time, 3 ideas that fit all their kids, saved places open that weekend, and deadlines coming up | Get ideas run for Saturday and Sunday, plus the family's saved and dated items. Opt-in only; counts as that day's one email | Profile, Saved, plan items, weather |
| 5 | **Registration radar** | A "Registration coming up" panel in Plan and on the month view: "March break camps at \[camp\] open Monday 9:00" | Lists registration open and close dates for saved camps and classes, with one-tap "Remind me" | `programs.registration_opens_at`, `registration_closes_at` |

The home page band shows three of these as cards: **Fits all my kids** ("See only what works for every child"), **No clashes** ("Two kids, two schedules, one plan") and **Never miss registration** ("We watch the dates so you don't have to").

### Roadmap after launch

| When | Feature | What it does |
| --- | --- | --- |
| Feb 1, 2027 | **One drop-off** | In the Breaks planner, finds camps where siblings of different ages can attend the same place on the same days |
| Feb 1, 2027 | **Nap-time aware** | An optional nap window per child under 3; Get ideas and the clash check avoid it |
| Feb 1, 2027 | **Snow-day plan** | When a snow day or storm closure hits, one tap gives indoor ideas near home that fit all the kids |
| Before April 2027 | **Receipts for tax time** | Parents keep camp and class receipts in Account and download a yearly childcare-expense summary per child to give their accountant. Not tax advice |
| Spring 2027 | **Did they love it?** | After an outing or camp, one tap per child (loved it, it was OK, not for us). Private; improves that family's ideas only |
| Spring 2027 | **Family memories** | A private timeline of outings with a note and optional photo. Never public, never shared, deletable |
| 2027 | **Shared family access** | Invite a partner, grandparent or nanny to the family calendar, with view-only or edit roles |
| 2027 | **Birthday hub** | Eight weeks before a child's birthday month: party venues that fit, a checklist and invite timing |
| 2027 | **Activity budget** | A yearly total per child from bookings, with a budget line |
| Later | **Childcare finder** | Before- and after-school care and daycare. Starts only with the separate Household Services work, which has its own safety checks |

### Household intelligence rules

- Uses only the family's own data, on their account or device. Never shared with camps or venues.
- Every message is built from data, with the numbers shown. No guesses, no "we think".
- Children are always called by the nickname the parent chose. No full names.
- Every email is opt-in, follows CASL, and counts toward the one-email-a-day limit.
- Every feature can be turned off in Account › Reminders and emails.

## Guides

**Guides is what makes parents trust Compass and come back between outings:** practical guides written by a parent, plus free printables that grow the email list before launch. Headline: **"For the parenting learning curve."** Board: 6. Guides. The menu says Guides, not Learn; `/learn` redirects to `/guides`.

### The six shelves

| # | Shelf | Examples | At launch |
| --- | --- | --- | --- |
| 1 | Seasonal playbooks | Winter with kids in Ontario; March break playbook; Summer camp season; Fall and Halloween; Holiday season | Winter playbook |
| 2 | Parent how-tos | How to choose a camp; PA days explained; Registration day survival; Camp packing list; Birthday party planning; Rainy-day survival | Choose a camp, PA days explained |
| 3 | By age and stage | Baby 0–1; Toddler 1–3; Preschool 3–5; Big kids 6–8; Tweens 9–12; First outings with a baby | "Coming soon" |
| 4 | Best of | Best tobogganing hills; Best indoor play for toddlers; Best free winter outings; Best birthday party venues | Best tobogganing hills |
| 5 | Worth the drive | Flowerpot Island; Tobermory; Québec City with kids | Flowerpot Island |
| 6 | Free printables | Space Mission scavenger hunt; Winter scavenger hunt; Car-trip bingo; Colouring with Vavy | Space Mission hunt plus one winter printable |

Later: Vavy's corner for kids (puzzles and stories), parent questions answered, video guides.

### Guides decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | The menu item is **Guides**, not Learn | Parents read it as "for me"; can't be confused with kids' classes or Learning & Culture |
| 2 | **Best of** lists are Discover collections with Vineeta's intro. Guides links to them; never a second copy | One source, always current |
| 3 | **Printables are free with no email required**, plus an optional "a new one each month" sign-up | No friction, and the list still grows |
| 4 | **Destination guides live in Guides** as "Worth the drive", with live Discover place cards inside | Deep, verified, in Vineeta's voice |
| 5 | **Québec City with kids** is written after the December trip and doubles as research for the first activity book | One trip, two pieces of content |

### Guides pages

| Page | Route | What it shows |
| --- | --- | --- |
| Guides home | `/guides` | Headline and this season's playbook, then the shelves: Parent how-tos, Worth the drive, Best of, Free printables band with the optional monthly sign-up, "Guides by age, coming soon" |
| A guide | `/guides/[slug]` | Newsreader headline, Vineeta's byline, "Updated \[date\]", reading time, the article, live Discover place cards where places are mentioned, related guides |
| A printable | `/guides/printables/[slug]` | Preview image, "Download free PDF", ages, how to use it, optional monthly sign-up |

Guides are stored as markdown files in the repo (`content/guides/`) so Vineeta can add them without code.

### Article rules

- Written by a parent, for parents. Sections that need Vineeta's voice (founder notes, verdicts, "Vavy's take") are flagged until she writes them, never filled with stand-in text.
- Facts about a place (prices, hours, ages) are never typed into an article. They come from the embedded live place card.
- Every guide shows "Updated \[date\]". Seasonal playbooks are reviewed before each season.
- Sponsored content is always labelled. No affiliate links without a clear note.
- Headlines and article text in Newsreader; everything else in Inter.

## Shop

**Shop sells Vavy's Adventure Books:** themed kids' travel activity books, one per destination and age level (puzzles, facts, language notes, top sights, connect-the-dots and colouring for car trips). It earns revenue, builds the brand, and links to Day Trips & Getaways and Guides. The first book is **Québec City, ages 6–8**. Board: 7. Shop.

### Shop decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | **Payments with Stripe Checkout.** No cart to build | Cards, Apple Pay, Google Pay, receipts and refunds |
| 2 | **PDF first**, printed book through print-on-demand once a partner is chosen | No stock; the PDF can sell from day one |
| 3 | **A free sample page** for every book, in exchange for an email | Grows the list; parents try before buying |
| 4 | Reviews only from real buyers (later) | Trust |
| 5 | **Shop appears in the main menu automatically** once a book is `on_sale`. Until then it's in the footer only | An empty shop in the menu looks unfinished |
| 6 | Prices, refund policy and sales tax (HST) are **Vineeta's to set**; confirm tax with an accountant before the first sale | Business and legal choices |
| 7 | Guest checkout allowed. If the buyer later signs up with the same email, purchases appear in Account | Fewer steps to buy |

### Shop pages

| Page | Route | What it shows |
| --- | --- | --- |
| Shop | `/shop` | All books: cover, destination, age band, formats, price. Filter by destination and age (3–5, 6–8, 9–12). Books not ready show "Notify me" |
| Book | `/shop/[book-slug]`, e.g. `/shop/quebec-city-ages-6-8` | Cover, title, one-line promise, format picker (PDF or printed, each with price and delivery line), Buy now, "Get a free sample page", What's inside (6 tiles), Coming next, Questions (ages, printing at home, delivery, refunds), link to the destination guide |
| Free sample | `/shop/[book-slug]/sample` | Email field, a separate unticked box for the monthly printable email, then the sample PDF by email |
| Checkout | Stripe Checkout (hosted) | Card, Apple Pay, Google Pay. Email required; account not required |
| Thank you | `/shop/thank-you` | Download button for PDFs, what happens next for printed books, link to the guide |

Each book page links to its destination guide, and the guide links back.

### Shop data, payments and delivery

| Table | Key columns |
| --- | --- |
| `books` | `slug`, `title`, `destination`, `age_band`, `promise`, `inside` (list), `price_pdf`, `price_print`, `status` (draft, notify, on\_sale), `cover_image`, `sample_file`, `pdf_file` (private), `guide_slug` |
| `orders` | `stripe_session_id`, `email`, `user_id` (if signed in), `book_id`, `format`, `amount`, `tax`, `status`, `created_at` |
| `downloads` | `order_id`, `token`, `expires_at`, `count` |
| `notify_requests` | `book_id` or destination, `email`, `consented_at` |

- PDFs live in a private storage bucket. The buyer gets an email link that expires after 7 days. Signed-in buyers re-download from Account; guests can request a fresh link by email.
- Printed books go through a print-on-demand partner's API once chosen. Until then the printed option shows "Coming soon".
- Stripe webhooks mark orders paid and send the download email. Never trust the browser's success page alone.

### Shop rules

- Never show a price, review or rating that isn't real.
- Marketing emails only with a separate, unticked consent box (CASL). Order emails are transactional.
- No pop-ups pushing purchases on Discover or Plan. Shop shows up through cross-links and the menu only.
- Order records are kept as tax law requires, even if a family deletes their account, unlinked from the family.

## Account

**Account is everything about a family, in one private place.** Browsing never needs it. Parents sign up only to keep saves on every device, get reminders or see purchases. Board: 8. Account. Until January 1, the header shows "Join the waitlist" and `/sign-in` leads to the waitlist.

### Account decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | **Sign in with an emailed link or "Continue with Google".** No passwords | Nothing to forget; fewer support emails |
| 2 | **Ask parents to sign up only when they need it:** a second device, reminders, past purchases | Browsing and planning stay free with no login |
| 3 | **Camps and venues don't use parent accounts.** They get a separate "For camps" area later | Keeps family data apart from businesses |
| 4 | **Family sharing** (partner, grandparent, nanny) comes after launch | Keeps launch scope tight |
| 5 | **Store the least possible about kids:** nickname, birth month and year, interests, school board. No full names, photos or school names | Trust, and Canadian privacy law |

### Account sections

A side menu on desktop, stacked at the top on phones.

| Section | Route | What it holds |
| --- | --- | --- |
| Sign in | `/sign-in` | Email field and "Email me a sign-in link", plus "Continue with Google". One line on what an account adds. No password field |
| Your family | `/account` | A card per child (nickname, birth month and year, interests, calendar colour, optional nap window), "Add a child", the school board (for PA days) and home postal code (only for drive times) |
| Reminders and emails | `/account/reminders` | A switch per type: registration opens, deadline coming, spots running low, price or dates changed, PA day this week, the Thursday weekend email, the monthly printable. "Never more than one email a day" |
| Purchases | `/account/purchases` | Shop orders with "Download again" |
| Privacy and data | `/account/privacy` | "Download everything we hold" and "Delete my family's data" (confirm once, then everything is deleted) |
| Account settings | `/account/settings` | Sign-in email, connected Google account, sign out, "Sign out everywhere" |

The top of `/account` opens with a friendly summary, "Your family, your way", and one line on how each detail improves suggestions. Kids' ages and the school board are asked for only when a feature needs them, never at sign-up. The board's "What signed-out visitors see" panel is a design note only: it never appears inside a signed-in account.

### When parents are asked to sign up

Only at these three moments, with one short line of why:

1. They save something and open Compass on a second device: "Sign in to see your saves here too."
2. They tap "Remind me": "Where should we send the reminder?"
3. They want past purchases: "Sign in with the email you used to buy."

No sign-up walls, no pop-ups on arrival, no "create an account to continue". When a parent signs in, everything saved on that device moves into their account, with nothing lost or duplicated.

### Sign-in and data

- Supabase Auth with email magic links and Google sign-in. Sessions last 30 days on a device.
- Account uses the `families`, `children`, `saved_*`, `plan_items`, `bookings`, `reminders` and `calendar_feed_tokens` tables, plus `email_preferences` (one row per type, with `consented_at`) and Shop `orders`.
- **Download my data:** one file with the family, children, saves, plans, bookings, reminders, email choices and orders.
- **Delete my family's data:** deletes the family, children, saves, plans, bookings, reminders and email preferences, and signs out everywhere. Order records stay only as tax law requires, unlinked from the family.

### Privacy rules

- Follow Canadian privacy law (PIPEDA) and Canada's anti-spam law (CASL). The privacy page explains in plain words what's stored and why.
- Kids' details are never public, never sold, never shared with camps or venues unless the parent deliberately sends something.
- The postal code is used only for drive times. Never shown, shared or used for ads.
- Every marketing email needs its own unticked consent box. Reminder emails only cover what the parent saved, booked or asked about.

## Data model, tech and rules

**Stack:** Next.js on Cloudflare Workers, Supabase (database, auth, storage), GitHub repo `compassbyvavy/compassbyvavy-web`, Stripe Checkout, Mapbox GL JS, Environment and Climate Change Canada weather. Cursor writes all code; Claude reviews each review pack. Only `main` is live; every Cursor job ends in a pull request with a preview link.

**First rule for every job:** Cursor inspects the existing schema and extends it. No duplicate tables. Camps and classes stay program records linked to a host venue and provider; events stay separate from places. Categories, subcategories, place types, filters, copy and collections come from the database, seeded from the workbook, never hard-coded.

### Site and Discover tables

| Table | Key columns | Seeded from |
| --- | --- | --- |
| `site_settings` | `listings_live` (true/false), `launch_date` | Set by Vineeta |
| `discover_categories` | `id` (CAT-…), `slug`, `name`, `sort_order`, `card_copy`, `icon`, `status` (live, coming\_soon, parked), `page_title` | Workbook **Discover Categories** |
| `discover_subcategories` | `id` (DS-…), `category_id`, `slug`, `name`, `sort_order`, `description`, `is_new`, `chip_row` (when, type, blank), `in_season_months`, `seasonal_only`, `page_title` | **Discover Subcategories** |
| `place_types` | `id` (PT-…), `name`, `discover_subcategory_id`, `source_category`, `source_subcategory`, `indoor_outdoor`, `permanent_seasonal`, `primary_age_group`, `discover_status` (Live, Parked, Merged), `merged_into` | **Discover Map** |
| `place_type_features` | `place_type_id`, `feature_id`, `applicability` (C, ?) | **Feature Matrix** (Core and Conditional only) |
| `places` (extend) | `primary_place_type_id`, `secondary_place_type_ids[]`, `city`, `region_id`, `lat`, `lng`, admission prices, `min_age_months`, `max_age_years`, hours, season dates, `registration_type`, `visit_length`, `quiet_times`, `weather_backup`, `last_verified_on`, `vavy_checked` | GAP-009 to GAP-012, GAP-019 |
| `place_feature_values` | `place_id`, `feature_id`, `value`, `source`, `verified_on` | Venue research |
| `discover_filters` | `slug`, `label`, `group`, `applies_to[]`, `logic`, `feature_ids[]`, `status` | **Discover Filters** |
| `collections`, `collection_items` | `slug`, `city`, `title`, `intro`, `kind`, `filter_query`, `season_start`, `season_end`, `home_rank`, `published`; items with `place_id`, `sort_order`, `note` | Vineeta |
| `occasions` | `slug`, `title`, `filter_query`, `sort_order` | The 10 occasions |
| `regions`, `locations` | Region `id`, `name`, `number` (1–13, incl. 13a–c); location `name`, `region_id`, `county` | **Regions Reference**, **Location Lookup** |
| `school_boards`, `school_calendar_days` | Board `id`, `name`, `system`, `cities[]`, `calendar_url`; day `board_id`, `date`, `kind` (pa\_day, holiday, winter\_break, march\_break), `source_url`, `checked_on` | Boards' published calendars |
| `verifications` | `place_id`, `verified_on`, `method` (visited, phoned, emailed, website), `by`, `notes` | Vineeta |
| `notify_requests`, `waitlist` | `email`, `category`, `subcategory`, `city` or `book_id`, `consented_at` | Forms |

### Plan, household intelligence and Account tables

| Table | Key columns | Notes |
| --- | --- | --- |
| `families` | `id`, `owner_user_id`, `home_postal_code`, `school_board_id`, `created_at` | One per account |
| `family_members` (later) | `family_id`, `user_id`, `role` (parent, caregiver), `can_edit` | Shared family access, 2027 |
| `children` | `id`, `family_id`, `nickname`, `birth_month`, `birth_year`, `interests[]`, `school_board_id`, `colour`, `nap_start`, `nap_end` (optional) | No full names, photos or school names. Never public |
| `saved_lists`, `saved_items` | List `owner` (user or device), `name`; item `item_type` (place, program\_session, event, collection), `item_id`, `note` | "Saved" is the default list |
| `plan_items` | `family_id`, `child_ids[]`, `date`, `start_time`, `end_time`, `place_id` or `program_session_id`, `note` | What a parent adds to a day |
| `day_plans` | `owner`, `inputs` (chips), `items`, `share_slug` | Days built from Get ideas |
| `bookings` | `family_id`, `child_id`, `program_session_id`, `status` (booked, waitlisted, cancelled), `marked_on` | Only from "I booked this". Never inferred |
| `reminders` | `owner`, `item_type`, `item_id`, `kind` (registration\_opens, deadline, spots\_low, changed, pa\_day, weekend\_email), `send_at`, `sent_at`, `channel` | Max one email a day per family |
| `email_preferences` | `family_id`, `type`, `on`, `consented_at` | One row per email type |
| `calendar_feed_tokens` | `family_id`, `token` | Private .ics link; can be reset |
| `programs` (extend) | `registration_opens_at`, `registration_closes_at`, `sibling_discount` (GAP-021); and per session in `program_sessions`: `price`, `availability_status` (registration\_open, spots\_confirmed, waitlist, unknown), `spots_left`, `spots_updated_at`, `spots_source` | Spots and changes come from Camp Watcher |
| `receipts` (2027) | `family_id`, `child_id`, `booking_id`, `amount`, `file`, `year` | Receipts for tax time |
| `outing_feedback`, `memories` (2027) | `child_id`, `plan_item_id`, `rating` / `note`, `photo` | Private; deletable |

Anything saved without an account lives on the device (local storage with a `device_id`) and moves to the account on sign-up. **Camp Watcher link:** when an approved change lands (price, dates, spots), Plan creates a "changed" or "spots low" reminder for every family that saved or booked that session. Spots low = 5 or fewer, or under 20% of capacity.

### Data rules

- A place has **one primary place type** (which decides its subcategory) and can have secondary types. Filters do the rest.
- Parked and Merged types never appear in Discover, search or sitemaps.
- Filters read from `place_feature_values` or core place columns, never free text.
- Place type IDs and published slugs never change. Seed scripts (`scripts/seed-discover.ts`) upsert by ID and can be re-run safely.

### Site-wide rules and do-nots

**Trust**

- Never invent a venue, price, rating, count, age or date. A missing fact shows "Not confirmed yet".
- Keep ages and prices exactly as the venue publishes them, including teen tiers. Compass is built for kids up to 12, but nothing is edited out.
- Status shows as "Latest verified \[date\]", never "live" or "real-time" (camp spot counts show when they were updated).
- Vavy-checked only where Vineeta has visited.
- No paid ranking. Sponsored listings always labelled. Provider payment never affects verification. Browsing is always free with no login.
- Family and child data is never sold, never shared without deliberate consent, deletable anytime.

**Website**

- Never break a live URL; redirect when a route changes.
- Clean and airy, like Airbnb or Netflix. No dense multi-section pages, no emoji icons.
- No bottom tab bar on phones. Header menu: Discover · Plan · Guides · Shop · Account, plus search and Saved.
- Whatever can run as code on the site (filters, automatic collections, PA day matching, reminders, household intelligence) is built by Cursor and runs on the site, not by hand.
- Every job is checked at 1440px and 390px wide.

## Cursor prompts

**Run today's prompt first, then the jobs in order.** Every prompt reads `docs/compass-master-spec.md` (this document, exported as Markdown). Attach the boards named. Each job ends with a pull request, a preview link and the review pack; bring the pack to Claude, then merge to `main` to make it live.

### Today: launch shell (the whole site, no listings)

Attach boards 1, 2, 3, 4, 5, 5b, 6, 7 and 8. Start from `main`.

```
Read docs/compass-master-spec.md in full. It is the single source of truth for compassbyvavy.ca. The attached PNGs are the approved page designs (boards 1. Home, 2. Discover, 3. Category page: Camps, 4. Place page, 5. Plan: week, 5b. Plan: month, 6. Guides, 7. Shop, 8. Account). Match their layout, but never ship the sample cards or sample venues shown on them. Where a board and the spec differ (the logo, the old "Plan my day" band, the footer colour, pastel placeholder tiles), the spec wins.

Goal: put the whole site live today as a finished outline in "launch shell mode", with every page, every category and every subcategory, and NO listing data anywhere.

Work from a new branch off main. Start by inspecting the repo, the Supabase schema and the current routes, and reply with a short plan (what you add, what you change, what you hide, any conflict with the spec). Then build:

1. Brand: apply "Brand and design" exactly. Colours, Newsreader for the wordmark and headings / Inter for all interface and body text / no Fredoka on the website, spacing, buttons, cards. Logo: the fox-ear compass mark on its own (public/brand/mark.svg) plus the one-colour wordmark "Compass by Vavy" (#33503E on light, #F4E9D0 on dark). Favicon from mark.svg. Apple-touch-icon, Android icon and the Open Graph image from the green round version (public/brand/mark-on-green.png). Vavy-checked is the small green pill, used only for places Vineeta visited in person; remove the old round stamp everywhere. Until real photos exist, tiles are warm cream (#FBF6EC) with a thin forest-green line icon, never pastel colour blocks.
2. Header and footer on every page, exactly as specified: menu Discover · Plan · Guides · Account (Shop appears only when a book is on_sale, otherwise footer only), search "Search places, camps, classes" with the "City or region" picker, heart for Saved, "Join the waitlist" button. No "List your camp" in the header. Phones: logo, search icon, heart, menu button; no bottom tab bar.
3. Structure data: seed discover_categories, discover_subcategories and place_types from the workbook in data/taxonomy/ with scripts/seed-discover.ts (upsert by ID, safe to re-run). Use the new names Play & Fun (/play-fun) and Day Trips & Getaways (/day-trips-getaways); permanent redirects from any old slug. Do not import or change any listing data.
4. Launch shell mode: add site_settings.listings_live = false. While false, no place, camp, class, event, price, age, count or listing photo appears anywhere. Keep existing camp and indoor playground records untouched in the database; their public URLs send a temporary 302 redirect to their subcategory page and are left out of the sitemap.
5. Pages, all from "Site map" with the "Today (shell)" column as the rule: the home page (12 sections from "Home page", shell versions), the Discover hub (9 category cards with editorial lines, each listing every subcategory: the first 6 shown, the rest one tap away with "+ N more"), all 9 category pages and all 99 subcategory pages (intro, chips with Camps in When and Type rows and season ordering, "What you'll find here" from place_types, "What we check for every listing", Notify me), /everything, the PA days page, the Plan preview with an example week clearly labelled "Example" and the Saved shelf on the device, Guides (only real guides and printables; shelves with nothing real are hidden; no "Coming soon" grids; /learn redirects to /guides), Shop (the Québec City ages 6–8 book with Notify me, no price), Account preview, /about, /how-we-check, /for-camps, /contact, /privacy, /terms, /accessibility.
6. Every page title follows the page title patterns in "Discover: 9 categories and all 99 subcategories", with "Ontario" when no city is picked. Set descriptions and Open Graph images. While listings_live is false, subcategory pages are noindex and left out of the sitemap; the sitemap lists the home page, Discover, the 9 category pages, Guides and the company pages.
7. Every email form (waitlist, Notify me, newsletter) uses the existing waitlist submit logic, with success and error states, an unticked consent box for marketing, and records category, subcategory and city where relevant. Keep the existing /waitlist page.
8. Brand copy is Ontario-wide, as in "Brand voice". Use the empty-state copy in "Launch shell mode".
9. Check every page at 1440px and 390px: rows and chips scroll sideways, tap targets at least 44px, no bottom tab bar, contrast at least 4.5:1.

Don't invent venues, prices, counts or photos of children. Don't delete any data. Open a pull request with a preview link and give me the review pack from the spec: files changed, screenshots at 1440px and 390px of the home page, Discover hub, one category page, one subcategory page, Plan, Guides, Shop and Account, the row counts seeded, the list of redirects, and anything not built exactly as the spec says.
```

### Job 1: Discover data (before January 1)

```
Read docs/compass-master-spec.md: "Data model, tech and rules" and the appendix. Finish the Discover data. Extend scripts/seed-discover.ts to upsert Discover Filters, Regions Reference and the Feature Matrix (only C and ? cells, into place_type_features). Add the place columns from GAP-009, GAP-010, GAP-011, GAP-012, GAP-019 and GAP-021, plus the verifications, collections, collection_items, occasions, regions, locations, school_boards, school_calendar_days, notify_requests and site_settings tables if missing. For places already in the database, set primary_place_type_id where the match is obvious and list every place you could not map; don't guess. Parked and Merged place types must never be returned by a public query. Keep listings_live = false. Give me the review pack.
```

### Job 2: Discover listings (switch-on ready)

```
Read docs/compass-master-spec.md: "Discover page templates, listings, locations and collections" and the filters table in the appendix. Attach boards 2, 3 and 4. Build what shows when listings_live = true and a category's status = live: PlaceCard, FilterBar, FilterSheet (only filters with status Ready; gap filters hidden), map toggle, the place page answering all 14 questions ("Not confirmed yet" for gaps), "Latest verified [date]" and the Vavy-checked pill only where verified, and the household intelligence "Fits all my kids" toggle (shown when the family has 2 or more children). With listings_live = false the site must look exactly as it does in shell mode. Restore the original camp and indoor playground URLs when listings are live. Give me the review pack, with screenshots in both modes.
```

### Job 3: Collections and occasions

```
Read docs/compass-master-spec.md: "Collections, editorials and occasions" and "Home page". Build collection and occasion pages, the CollectionRail, home rows that read from collections by home_rank and season, and a simple admin page where Vineeta can create, order and schedule a collection without code. Create the 5 launch collections and 10 occasion pages. Rows hide when empty or when listings are off. Give me the review pack.
```

### Job 4: School calendars and PA days

```
Read docs/compass-master-spec.md: "Location, regions, drive time and PA days". Build the BoardPicker, the PA days page matching camps to the chosen board's dates, the family's board remembered on the device and in Account, and a way for private-school families to enter their own PA days. Load January–February 2027 PA days, winter break and March break for the 6 launch boards, each row with its source link and checked date. Give me the review pack.
```

### Job 5: Account

```
Read docs/compass-master-spec.md: "Account" and the Plan and Account tables. Attach board 8. Build Supabase Auth with email magic links and Google sign-in, /sign-in, /account, /account/reminders, /account/purchases, /account/privacy and /account/settings exactly as in "Account sections". Merge device saves on first sign-in with no duplicates. Build "Download my data" and "Delete my family's data" with tests proving deletion is complete. Only prompt sign-up at the three moments in the spec; no sign-up walls. Until January 1, keep "Join the waitlist" in the header. Give me the review pack.
```

### Job 6: The planner and household intelligence (needed by January 1)

```
Read docs/compass-master-spec.md: "Plan: the family planner", "Household intelligence" and the Plan tables. Attach boards 5 and 5b. Build Plan parts 1, 2, 3, 5, 6 and 7, and the 5 launch household intelligence features.
1. Inspect the schema first and reply with a short plan. Add plan_items and the other Plan tables. Device-only saves and plan items use local storage with a device_id and move to the account on sign-up.
2. /plan opens on the week view. Build Month, Week, Weekend and Day views (phones: a day-by-day list) showing no-school days from the family's board, bookings, plan items, registration dates, reminders and the weather, coloured by child.
3. Saved shelf beside the planner with Add to plan (day, time, children) and drag-onto-a-day on desktop.
4. Every free slot shows "Free: Get ideas". Get ideas follows "How Get ideas decides" exactly, as tested server code (unit tests for every hard rule and the ranking), Saved items first, labelled "From your Saved".
5. Household intelligence: Fits all my kids; the clash check in AddToPlan (same-day overlaps and drive time between items, for any child); sibling pricing from programs.sibling_discount in cards, Compare and totals; the opt-in Thursday weekend email; the Registration radar panel.
6. Weather from Environment and Climate Change Canada open data behind one swappable function.
7. SaveButton and CompareTray on every card; Compare up to 4.
8. Reminder emails: max one a day per family, one-click unsubscribe per type, CASL; Camp Watcher changes trigger "changed" and "spots low".
9. A private .ics subscribe link for Google and Apple Calendar.
No bottom tab bar. Give me the review pack plus the unit test results.
```

### Job 7: Breaks planner (needed by February 1)

```
Read docs/compass-master-spec.md: "Plan" and the February 1 rows of the household intelligence roadmap. Build /plan/breaks/[break], linked from the top of Plan and from any break in the month view. For a break (winter, March, summer or a single PA day) and the family's board, show a row per child and a column per school-off day: covered, free or weekend. Show the total cost (confirmed prices only, sibling discounts applied, with the number unconfirmed) and "Fill the gaps", which opens Get ideas for that date, child and drive time. Add One drop-off (camps where siblings can attend the same place on the same days), nap-time awareness (optional nap window per child under 3) and the snow-day plan. Phones: one child at a time. Give me the review pack.
```

### Job 8: Guides

```
Read docs/compass-master-spec.md: "Guides". Attach board 6. Build /guides, /guides/[slug] and /guides/printables/[slug], with guides stored as markdown in content/guides/ so Vineeta can add them without code. Support embedding a live Discover place card by place ID inside an article. /learn redirects to /guides. Printables download without an email; the monthly sign-up is optional with an unticked consent box. Give me the review pack.
```

### Job 9: Shop (when the first book is ready)

```
Read docs/compass-master-spec.md: "Shop". Attach board 7. Build the Shop tables, /shop, /shop/[book-slug], the free sample flow, Stripe Checkout (test mode first), the webhook that marks orders paid and emails a 7-day download link, /shop/thank-you, re-download from Account, and the automatic Shop menu item when a book is on_sale. Printed format shows "Coming soon" until a print-on-demand partner is added. Read prices from the books table; never invent them. Give me the review pack.
```

### Job 10: Ontario-wide browsing (after launch)

```
Read docs/compass-master-spec.md: "Location, regions, drive time and PA days". Build region pages for all 13 Ontario tourism regions at /regions/[region-slug] and the drive-time filter and sort from a postal code or device location (with consent). Day Trips & Getaways sorts by drive time by default. Give me the review pack.
```

### Review pack (Cursor sends this after every job)

1. Files created or changed
2. Screenshots at 1440px and 390px of every new page
3. Row counts per table after seeding, and any rows that failed
4. Lighthouse scores (performance and accessibility) for one page of each kind
5. Anything not built exactly as the spec says, and why
6. Routes left as placeholders and filters hidden for gaps
7. The preview link and the pull request link

## Roadmap, open items and checklists

### Roadmap to launch

| When | What goes live | Jobs |
| --- | --- | --- |
| Today, Nov 17 | The whole site in launch shell mode: every page, category and subcategory, no listings | Today |
| By Dec 15 (target) | Discover data, listings ready to switch on, collections, PA days, Account, Guides | 1, 2, 3, 4, 5, 8 |
| By Dec 22 (target) | The planner and the 5 household intelligence features | 6 |
| Jan 1, 2027 | Launch: listings on for Camps and Play & Fun in Mississauga and Oakville; "Join the waitlist" becomes "Sign in" | Settings only |
| Feb 1, 2027 | Breaks planner, One drop-off, nap-time aware, snow-day plan | 7 |
| When the first book is ready | Shop with Québec City, ages 6–8 | 9 |
| Spring 2027 onward | Other categories switch on as they're verified; regions; household intelligence roadmap | 10 and later |

### Open items for Vineeta

- [ ] Real photos for the home page, category tiles and founder note (no stock photos of children)
- [ ] Founder note (2–3 lines) and the About story
- [ ] Book prices, refund policy and HST handling; confirm tax with an accountant before the first sale
- [ ] Choose a print-on-demand partner for printed books
- [ ] Read and approve the plain-language Privacy, Terms and Accessibility pages before launch
- [ ] Confirm the weather data licence terms (Environment and Climate Change Canada) before launch
- [ ] Close old PR #75 once today's pull request is merged

* [ ] 4–6 small Vavy spot illustrations (planner intro, empty states, a guide header, the waitlist band): Vavy used sparingly, so the site feels grown-up to parents and magical to kids
* [ ] Phone (390px) designs for search, filters, the camp page, the planner and booking, before Jobs 2 and 6

**Phone design reference (November 17 app screens).** Use for the phone layouts in Jobs 2 and 6, not tonight: Plan as a day-by-day agenda list; "For your family" as the signed-in parent's personal page ("Perfect for both kids", "This weekend"); the Saved list with filters; the Nearby map with one card; the Guides list. **Later idea:** a trip itinerary page (for example Québec City, day by day, with "Add to plan") as part of Guides › Worth the drive, built only from verified places. **Not adopted:** a bottom tab bar on the website (it stays out; a native app may have one later); new menu items such as Trips, Stays, Things to Do or Road Trips (Day Trips & Getaways covers them); star ratings and review counts; a sign-up screen on arrival; AI-written itineraries.

### Checklist: today's launch shell

- [ ] The live site (from `main`) shows the fox-ear compass mark, one-colour wordmark, new header and footer on every page
- [ ] Menu is Discover · Plan · Guides · Account; Shop is in the footer only; no "List your camp" in the header
- [ ] The home page shows its 12 shell sections, including Everything on Compass with all 99 subcategory links
- [ ] The Discover hub shows 9 category cards, each with every subcategory
- [ ] All 9 category pages and all 99 subcategory pages open, with titles from the patterns
- [ ] No listing, price, age, count or listing photo appears anywhere
- [ ] Old camp and indoor playground URLs redirect (302) to their subcategory page; nothing is deleted
- [ ] Plan shows the example week labelled "Example"; the Saved shelf works on the device
- [ ] Guides, Shop and Account previews show; `/learn` redirects to `/guides`
- [ ] Every email form submits, with success and error states and an unticked consent box
- [ ] Phone at 390px: rows scroll sideways, no bottom tab bar

### Checklist: January 1 launch

- [ ] Seed script imports 9 live categories (plus 2 parked), 99 subcategories, 445 place types and 27 filters; re-running changes nothing
- [ ] Every live place type has exactly one subcategory; Parked and Merged never appear publicly
- [ ] Ready filters work; gap filters stay hidden
- [ ] Camps and Play & Fun listings are live for Mississauga and Oakville, every one answering the 14 questions
- [ ] The 5 launch collections and 10 occasion pages exist; home rows swap by season
- [ ] January–February 2027 PA days for the 6 boards, each with a source link and checked date
- [ ] Sign-in by email link and Google; device saves merge; download and delete work and are tested
- [ ] Plan opens on the week view; all 4 views work; free slots show "Free: Get ideas"
- [ ] Unit tests pass for all 7 hard rules and the ranking
- [ ] Fits all my kids, clash check, sibling pricing, Thursday email and Registration radar all work
- [ ] Reminder emails: at most one a day per family, one-click unsubscribe, CASL
- [ ] The .ics link works in Google and Apple Calendar
- [ ] Guides: a new markdown file appears with no code change; embedded place cards are live

### Checklist: February 1

- [ ] Breaks planner shows every school-off day per child as covered, free or weekend, for March break 2027 and the 6 boards
- [ ] "Fill the gaps" opens Get ideas for that date, child and drive time
- [ ] Totals use confirmed prices only, sibling discounts applied, and say how many are unconfirmed
- [ ] One drop-off, nap-time aware and the snow-day plan work

### Checklist: Shop (when the first book is ready)

- [ ] A Stripe test purchase marks the order paid and sends a working 7-day download link; a fresh link can be requested
- [ ] Signed-in buyers can download again from Account
- [ ] The free sample works, with its marketing box separate and unticked
- [ ] Shop appears in the menu only when a book is on sale; book and guide link to each other

## Appendix: filters and taxonomy gaps

Every place type, with its ID, is in the workbook's **Discover Map** sheet; the subcategory tables above list every live place type by name.

### All 27 filters

| # | Filter | Group | Shows on | How it decides | Features used | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Free | Cost | All | Admission for a child and an adult is 0 | — | Gap (GAP-009) |
| 2 | Price per family | Cost | All | Free, Under $25, $25–60, $60+ for 2 adults + 2 kids | — | Gap (GAP-009) |
| 3 | Ages | Kids | All | 0–2, 3–5, 6–8, 9–12; matches if the age range overlaps | — | Gap (GAP-010) |
| 4 | Indoor or outdoor | Place | All | Place type Indoor/Outdoor, or the place's own value | `FT-CF-012`, `FT-CF-013` | Ready |
| 5 | Rainy day | Weather | All | Indoor = true | `FT-CF-012` | Ready |
| 6 | Open today | Time | All | Hours include today and not seasonally closed | `FT-FD-095` | Gap (GAP-011) |
| 7 | Drive time | Location | All | Within 15, 30, 60 or 120 minutes | — | Computed |
| 8 | Stroller-friendly | Little ones | All | Any stroller feature is Yes | `FT-FB-025`, `FT-FB-026`, `FT-FB-027` | Ready |
| 9 | Toddler area | Little ones | All | Toddler play area or equipment is Yes | `FT-FB-042`, `FT-PE-002`, `FT-PE-020` | Ready |
| 10 | Change tables | Little ones | All | Baby change table is Yes | `FT-FB-001`, `FT-FB-005` | Ready |
| 11 | Nursing room | Little ones | All | Nursing room or private breastfeeding area is Yes | `FT-FB-012`, `FT-FB-013` | Ready |
| 12 | Accessible and inclusive | Access | All | Step-free entrance and accessible washroom, or inclusive play | `FT-AC-009`, `FT-AC-016`, `FT-AC-024`, `FT-AC-065`, `FT-PE-085`, `FT-PE-086` | Ready |
| 13 | Sensory-friendly hours | Access | All | Low-sensory hours or sensory-friendly environment is Yes | `FT-AC-041`, `FT-AC-038` | Ready |
| 14 | Drop-in, no registration | Booking | Classes & Programs; Play & Fun; Events | No registration needed | — | Gap (GAP-012) |
| 15 | Birthday parties | Occasion | Play & Fun; Food & Treats; Animals & Farms | Party room or party package is Yes | `FT-CF-034`, `FT-FD-028` | Ready |
| 16 | Free parking | Getting there | All | Free parking is Yes | `FT-TP-011` | Ready |
| 17 | Reachable by transit | Getting there | All | Transit nearby or accessible transit is Yes | `FT-TP-035`, `FT-AC-007` | Ready |
| 18 | Fenced | Safety | Parks & Nature; Play & Fun | Fully fenced site or fenced playground is Yes | `FT-SS-001`, `FT-SS-003` | Ready |
| 19 | Lifeguards | Safety | Parks & Nature; Classes & Programs; Play & Fun | Lifeguard on duty is Yes | `FT-SS-031` | Ready |
| 20 | Outside food allowed | Food | All | Outside food permitted is Yes | `FT-FD-021`, `FT-FD-022` | Ready |
| 21 | Allergy-friendly and nut-free | Food | Food & Treats; Camps; Play & Fun | Nut-free options or allergen information is Yes | `FT-FD-017`, `FT-FD-018` | Ready |
| 22 | Halal | Food | Food & Treats | Halal options is Yes | — | Gap (GAP-013) |
| 23 | Vegetarian | Food | Food & Treats | Vegetarian options is Yes | `FT-FD-013` | Ready |
| 24 | Kids' menu and high chairs | Food | Food & Treats | Children's menu or high chairs is Yes | `FT-FD-011`, `FT-FB-022` | Ready |
| 25 | French-language | Language | Classes & Programs; Camps; Events | Program offered in French | — | Gap (GAP-014) |
| 26 | Library or museum pass accepted | Cost | Learning & Culture; Animals & Farms | Free entry with a library museum pass | — | Gap (GAP-015) |
| 27 | Vavy-checked | Trust | All | Vineeta has visited and verified it | — | From the verification record |

### Taxonomy gaps

| Gap | What's missing | Applies to | Fix |
| --- | --- | --- | --- |
| GAP-009 | Admission price | All live place types | Add `admission_price_adult`, `admission_price_child`, `admission_free` and price notes to places |
| GAP-010 | Age range | All live place types and programs | Add `min_age_months` and `max_age_years` to places and programs |
| GAP-011 | Opening hours and season | All live place types | Add weekly hours, holiday exceptions, `season_start`, `season_end` |
| GAP-012 | Drop-in vs registration | Programs, events, play venues | Add `registration_type` (drop-in, book ahead, register for season) |
| GAP-013 | Halal options | Food & Treats | Add a Halal Options feature |
| GAP-014 | Program language | Classes, camps, events | Add `program_languages` to programs |
| GAP-015 | Library museum pass | Learning & Culture, Animals & Farms | Add Library Pass Accepted plus pass notes |
| GAP-016 | Tobogganing hill details | Tobogganing Hill | Add city-permitted, hill size, run-out hazards, lit for evening, winter washrooms, nearby warm-up spot |
| GAP-017 | Descriptor place types | Inclusive, toddler, waterfront and school playgrounds; inclusive splash pad; supervised beach; playground with splash pad | Later: convert to filters; keep IDs until converted |
| GAP-018 | Events modelled as venues | Events | Later: event records linked to a venue and an Events subcategory |
| GAP-019 | Visit planning fields | All live place types | Add `typical_visit_length`, `quiet_times`, `weather_backup` |
| GAP-020 | School board calendars | Camps (PA days), Account, Plan | Add `school_boards` and `school_calendar_days` |
| GAP-021 (new) | Sibling discount | Camps and classes | Add `programs.sibling_discount` (percent or amount, plus a note) for sibling pricing |

GAP-021 is new on November 17 and still needs adding to the workbook's Taxonomy Gaps sheet.
