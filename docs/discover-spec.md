# Compass by Vavy — Discover build spec for Cursor

Nov 16, 2026 · @Vineeta Agarwal

This is the single source of truth for Discover on compassbyvavy.ca. It covers the 9 categories, every subcategory, the filters, the details every listing must answer, PA day calendars, region and occasion browsing, collections, and exactly what Cursor builds. If the website and this doc ever disagree, this doc wins.

## How to use this doc

**For you:** come back here whenever you add a venue, plan a collection or review a Cursor build. The decision log below records every call we've made and why.

**For Cursor:** give it two things together.

1. **The workbook** `MT-003xMT-004_Place_Type_Feature_Applicability_Matrix_v2_Discover.xlsx`. Save it in the repo at `data/taxonomy/`. Its **Discover Map**, **Place Types** and **Discover Filters** sheets are the seed data. Cursor must import these, never retype them.
2. **This doc.** Export it (Share › Export › Markdown) and save it as `docs/discover-spec.md` in the repo. Then tell Cursor: *"Read docs/discover-spec.md and data/taxonomy/ and build Phase 1. Stop and give me the review pack before Phase 2."*

**Build in phases**, one Cursor job each, with a review between each:

1. **Data:** tables, seed import, mapping every place type to its Discover subcategory
2. **Discover pages:** hub, category pages, subcategory pages, filters, place cards
3. **Collections and occasions:** collection pages, home page rows, occasion pages
4. **School calendars:** school boards, PA days, the family's board in Profile, matching PA day camps
5. **Ontario-wide browsing:** regions, drive time, day trips

For the January 1, 2027 launch you need Phases 1–3, plus Phase 4 for the Mississauga and Oakville boards (January–February 2027 PA days).

## Today's website update: home page and Discover

Today's update is three Cursor jobs, run in this order: the Discover data, then the home page, then the Discover pages. Each job ends with a review pack you bring back to Claude before starting the next.

### Before you start (15 minutes)

- [ ] **Confirm the heading font.** Claude recommends Newsreader for page headings, with Fredoka only in the logo and Vavy moments. If you'd rather use Fredoka everywhere, change the font line in Job 2 before pasting.
- [ ] Save the workbook `MT-003xMT-004_Place_Type_Feature_Applicability_Matrix_v2_Discover.xlsx` in the repo at `data/taxonomy/`.
- [ ] Export this doc (Share › Export › Markdown) and save it as `docs/discover-spec.md` in the repo.
- [ ] Unzip `compass-by-vavy-logo-set.zip` into `public/brand/` and rename the files: `logo.svg` (full logo), `logo-dark.svg` (for dark backgrounds), `mark.svg` (compass only), `vavy-checked.svg` (stamp), `mark-on-green.png` (Instagram picture).
- [ ] On the logo canvas, export the **Home page** board as a PNG, to attach to Job 2.

### Job 1: Discover data (Phase 1)

```
Read docs/discover-spec.md (all of it) and the workbook in data/taxonomy/. Build Phase 1 only.

1. Inspect the existing Supabase schema and migrations first. Reply with a short plan: which tables you will add, which you will extend, and anything in the spec that conflicts with what exists. Then build it.
2. Create or extend the tables in the "Data model (Supabase)" section. Keep the existing model: camps and classes are programs linked to a venue and provider; events are separate from places.
3. Write scripts/seed-discover.ts that reads these sheets and upserts by ID: Discover Categories, Discover Subcategories, Discover Map, Discover Filters, Regions Reference, and Feature Matrix (only C and ? cells, into place_type_features). Re-running it must change nothing.
4. Add the new place columns from GAP-009, GAP-010, GAP-011, GAP-012 and GAP-019 in the Taxonomy Gaps sheet.
5. For places already in the database (camps, indoor playgrounds), set primary_place_type_id where the match is obvious. List every place you could not map. Don't guess.
6. Parked and Merged place types must never be returned by any public query.

Don't build any pages yet. When done, give me the review pack from the spec.
```

### Job 2: Home page

```
Read docs/discover-spec.md, section "Collections, editorials, occasions and the home page". The attached PNG is the approved home page design. Build the home page at "/" to match it, with these changes and rules.

Brand: page ground #FBF6EC, forest green #33503E, fox orange #C9702F (never for small text on cream; use #8A4A1E), compass gold #E0A526, cream #F4E9D0, ink #2B2622, body grey #4E5549. Headings: Newsreader. Body: Inter. Logo wordmark: Fredoka. Put these in the existing theme setup. Header logo /public/brand/mark.svg; favicon and apple-touch-icon from mark.svg; footer logo-dark.svg; Open Graph image mark-on-green.png.

Sections, in order: (1) header with logo, city picker + search, and Discover, Plan, Learn, Shop, Account; (2) hero with the waitlist (big until launch); (3) CategoryIconRow reading the 9 categories from discover_categories, Camps first, each linking to /[city]/[category]; (4) "This weekend in [city]"; (5) 2–3 CollectionRail rows from the collections table, by home_rank and season; (6) Camps block (winter break and PA days); (7) Plan teaser; (8) From Learn; (9) Vavy-checked trust strip, newsletter and footer. Sections 4 and 5 hide themselves when they have no data. Never show an empty row.

Wire the waitlist form to the same submit logic as the current waitlist page, with success and error states. Don't delete the old waitlist page. Phone at 390px: no bottom tab bar, category row and rails scroll sideways. Don't invent venues, prices or counts. When done, give me the review pack from the spec.
```

### Job 3: Discover pages (Phase 2)

```
Read docs/discover-spec.md, sections "The Discover structure", "Pages and routes", "UI components", "Filters", "Copy for every category card", "What every listing must answer" and "Rules and do-nots". Build Phase 2.

Build the Discover hub, the 9 category pages and every subcategory page, using the routes in the spec, all reading from the database seeded in Job 1. Build the components in the UI components table and reuse them. Coming-soon categories show their intro, subcategory list and a Notify me form, never an empty grid. Only filters with status Ready show; gap filters stay hidden. Place cards show "Latest verified [date]" and the Vavy-checked badge only where verified. Keep every existing camp and indoor playground URL working, and add redirects if a route changes. Phone at 390px: chips scroll, filters open as a full-screen sheet, no bottom tab bar. When done, give me the review pack from the spec.
```

After Job 3, the next jobs are Phase 3 (collections and occasions) and Phase 4 (PA days for the six Mississauga and Oakville boards). Both are needed before January 1.

## Decision log

All made on November 16, 2026. Newest first.

| # | Decision | Why |
| --- | --- | --- |
| 15 | Every listing must answer the same core parent questions (see "What every listing must answer") | Parents shouldn't need to look anywhere else |
| 14 | PA days come from each family's school board, stored as calendar data | 72 Ontario boards, each with different PA days |
| 13 | Browse by region, drive time and occasion, alongside categories | City alone stops working once Compass covers all of Ontario |
| 12 | New subcategories for gaps found across Ontario: amusement and theme parks; hockey, skating and ringette; parent and baby classes; clubs and youth groups; sports games to watch; boat tours and paddling; caves; stargazing; fishing; paint-your-own pottery; escape rooms; horse riding; flower fields; holiday lights and Santa | These are things Ontario families do that had no home |
| 11 | Fishing spots come back (they had been parked) | Ontario runs licence-free family fishing weekends. Claude had parked fishing piers by mistake |
| 10 | Tobogganing hills, outdoor rinks, skating trails, snowshoe and cross-country ski trails go in a new **Winter fun** subcategory under Parks and Nature | Missing from the taxonomy, and the top outdoor search in January |
| 9 | Things that describe a place (inclusive, toddler, waterfront, supervised, free) become **filters**, not subcategories | A place can be all of them at once. Converting the existing descriptor place types is a later clean-up |
| 8 | Birthday parties are a filter plus a collection, not a category | Most play venues host parties |
| 7 | Events are organised by what's happening, not by venue | Parents search "puppet show," not "performance hall" |
| 6 | Splash pads stay in Parks and Nature | Outdoor, free and city-run |
| 5 | **Drop-in swims and skates go in Classes and Programs** (Vineeta's call), in a **Community Recreation** group with the host venues: community centres, public pools and arenas | They're scheduled sessions at a venue, booked through city systems like lessons are |
| 4 | EarlyON and family resource centres move to Play and Entertainment | They're drop-in play, and already listed with indoor play |
| 3 | New category **Animals and Farms**. Zoos, aquariums, safari parks, butterfly conservatories and educational farms move in from Learning and Culture, bird sanctuaries from Parks, and farm markets from Shopping | Kids ask for it by name, and farm outings had no home |
| 2 | **Services** and **Shopping** come out of Discover. Their place types stay in the data, marked Parked | Services is a separate, higher-risk job for later. Shopping clashes with the Compass **Shop** in the menu |
| 1 | Discover has **9 categories**, with Camps first | Camps is the launch focus |

**IDs never change.** A moved place type keeps its ID, for example `PT-LC-032` (City Zoo) now sits in Animals and Farms. The prefix shows where a type started, not where it lives now.

## The Discover structure

Nine categories, in this order. Each subcategory groups several place types from the workbook. **New** marks a subcategory or place type added on November 16, 2026. Every place type below is in the workbook's **Discover Map** sheet with its ID.

### 1. Camps

`/camps` · Live at launch

| Subcategory | Place types in it |
| --- | --- |
| Winter break and holidays | Winter Camp Centre, Holiday Camp Venue |
| PA days | PA Day Camp Facility |
| March break | March Break Camp Centre |
| Summer | Day Camp Centre, Outdoor Camp Campus, Community Day Camp |
| Overnight | Residential Camp |
| Sports | Sports Training Camp, Soccer Camp Facility, Basketball Camp Facility, Hockey Camp Arena, Aquatic Camp Centre |
| Arts and performing | Dance Camp Studio, Music Camp Campus, Art Camp Studio, Drama Camp Theatre, Photography Studio |
| STEM | STEM Camp Centre, Robotics Lab Camp, Coding Camp Lab, Science Discovery Camp, Chess Academy, Math Learning Centre, Innovation Hub |
| Nature, farm and animals | Nature Education Centre, Adventure Camp Base, Wilderness Camp, Educational Farm Camp, Animal Learning Centre |
| Language, leadership and cooking | Leadership Training Centre, Communication Academy, Teaching Kitchen, Baking Studio, Language Learning Centre, French Immersion Centre, Youth Leadership Camp |
| Inclusive and special needs | Inclusive Camp Centre, Universal Access Camp |
| Multi-activity | Multi-Activity Campus |

Camp season (winter break, PA days, March break, summer) really comes from each session's dates, not the facility. A camp running summer and March break sessions shows in both.

### 2. Play & Entertainment

`/play-entertainment` · Live at launch

| Subcategory | Place types in it |
| --- | --- |
| Indoor playgrounds | Soft Play Centre, Adventure Play Centre, Toddler Play Centre, Multi-Level Play Centre, Inflatable Play Park |
| EarlyON and drop-in play **(new)** | EarlyON Child and Family Centre, Family Resource Centre |
| Trampoline and ninja parks | Family Trampoline Park, Ninja Trampoline Park, Ninja Training Gym |
| Climbing gyms | Bouldering Gym, Top Rope Climbing Gym |
| Adventure and ropes parks | Ropes Course, Zipline Park, Aerial Adventure Park, Obstacle Course |
| Amusement and theme parks **(new)** | Amusement Park (new), Theme Park (new) |
| Water parks | Indoor Water Park, Outdoor Water Park |
| Ski and snow tubing hills **(new)** | Local Ski Hill (new), Snow Tubing Park (new) |
| Arcades, bowling and games | Family Arcade, Redemption Arcade, 10-Pin Bowling Centre, Boutique Bowling, Indoor Mini Golf, Outdoor Mini Golf, Glow-in-the-Dark Mini Golf, Indoor Laser Tag Arena, Outdoor Laser Tag, VR Arcade, VR Escape Experience, Indoor Go Kart Track, Outdoor Go Kart Track, FEC, Board Game Café, Kid-Friendly Escape Room (new) |
| Roller and skate parks | Roller Rink, Indoor Skatepark, Concrete Skatepark |
| Paint-your-own pottery and crafts **(new)** | Paint-Your-Own Pottery Studio (new), Drop-In Craft Studio (new) |
| Movies and kids' theatre | Children's Theatre, Multiplex Cinema, Drive-In Cinema |

A local ski hill you visit for an afternoon goes here. A ski resort you stay at goes in Travel and Getaways.

### 3. Parks & Nature

`/parks-nature` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Playgrounds | Destination Playground, Community Playground, Inclusive Playground, Adventure Playground, Nature Playground, Toddler Playground, School Playground, Waterfront Playground, Playground with Splash Pad |
| Splash pads | Standalone Splash Pad, Splash Pad in Park, Inclusive Splash Pad |
| Parks **(new)** | Community Park (new), Neighbourhood Park (new), Destination Park (new), Waterfront Park (new), Urban Park (new), Regional Park (new), Heritage Park (new) |
| Winter fun **(new)** | Tobogganing Hill (new), Outdoor Rink (new), Skating Trail (new), Snowshoe Trail (new), Cross-Country Ski Trail (new) |
| Trails | Walking Trail, Hiking Trail, Waterfront Trail, Cycling Trail, Boardwalk Trail, Forest Trail |
| Beaches | Lake Beach, Sand Beach, Pebble Beach, Supervised Beach |
| Conservation and provincial parks | Camping Provincial Park, Day Use Provincial Park, Waterfront Provincial Park, National Park, Conservation Area |
| Gardens and nature centres | Nature Centre, Botanical Garden, Arboretum |
| Picnic spots | Reservable Picnic Area, Open Picnic Area |
| Waterfalls and lookouts | Scenic Waterfall, Scenic Lookout |
| Boat tours and paddling **(new)** | Boat Tour (new), Passenger Ferry (new), Canoe & Kayak Rental (new) |
| Caves and rock formations **(new)** | Show Cave (new) |
| Stargazing spots **(new)** | Dark-Sky Preserve (new) |
| Fishing spots **(new)** | Fishing Pier, Stocked Fishing Pond (new) |

School Playground listings must say when they're open to the public (usually after school hours and weekends). Outdoor rinks and skating trails are places you can turn up to any time. Scheduled public skates at arenas are in Classes and Programs.

### 4. Animals & Farms (new category)

`/animals-farms` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Zoos and safari parks | City Zoo, Safari Park |
| Aquariums | Public Aquarium |
| Farms and petting farms | Working Educational Farm, Petting Farm (new) |
| Pick-your-own **(new)** | Pick-Your-Own Farm (new) |
| Pumpkin patches and corn mazes **(new)** | Pumpkin Patch & Corn Maze (new) |
| Maple sugar bushes **(new)** | Maple Sugar Bush (new) |
| Christmas tree farms **(new)** | Christmas Tree Farm (new) |
| Horse riding and pony rides **(new)** | Horse Riding Stable (new) |
| Flower fields **(new)** | Flower Field (new) |
| Butterflies and birds | Bird Sanctuary, Butterfly Conservatory |
| Farm markets | Farm Market |

### 5. Learning & Culture

`/learning-culture` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Museums | General Museum, Children's Museum, Natural History Museum, Science Museum, Transportation Museum, Railway Museum, Aviation Museum, Maritime Museum, Military Museum, Art Museum, Travelling Exhibition |
| Science centres and planetariums | Interactive Science Centre, STEM Discovery Centre, Discovery Centre, Planetarium, Public Observatory, Robotics Discovery Centre |
| Libraries and story time | Public Library, Regional Library, Children's Library, Storytime Room |
| Art galleries | Public Art Gallery, Interactive Children's Gallery |
| Historic sites and pioneer villages | Historic House, Historic Fort, Pioneer Village, Living History Museum, Archaeological Park |
| Cultural centres | Multicultural Centre |
| Indigenous culture and heritage **(new)** | Indigenous Cultural Centre |
| Makerspaces | Library Makerspace, Innovation Hub |
| Public art | Public Art Trail, Sculpture Garden |

### 6. Classes & Programs

`/classes-programs` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Drop-ins: swim, skate and rec **(new)** | Community Arena, Community Recreation Centre, Public Pool / Aquatic Centre (new) |
| Swimming lessons | Swim School |
| Skating, hockey and ringette **(new)** | Figure Skating Club (new), Minor Hockey Association (new), Ringette Association (new) |
| Sports and gymnastics | Soccer Academy, Basketball Academy, Baseball Training Centre, Tennis Club, Gymnastics Club, Yoga Studio |
| Martial arts | Martial Arts Dojo, Karate Dojo, Taekwondo Dojang |
| Dance | Dance Studio, Ballet Academy, Hip Hop Studio |
| Music | Music School, Piano Academy, Guitar Studio, Strings Academy, Vocal Studio |
| Art and crafts | Art Studio, Painting Studio, Drawing Academy, Ceramics Studio, Craft Studio |
| Drama and public speaking | Drama School, Public Speaking Academy |
| STEM and coding | Coding Academy, Robotics Lab, STEM Learning Centre, Science Learning Centre |
| Academics and languages | Chess Academy, Mental Math Centre, Abacus Academy, English Learning Centre, French Language School, Hindi Language School, Phonics Centre, Reading Centre, Creative Writing Centre, Tutoring Centre |
| Cooking | Cooking School |
| Parent and baby classes **(new)** | Parent & Tot Studio (new) |
| Clubs and youth groups **(new)** | Scouts Group (new), Girl Guides Unit (new), 4-H Club (new), Youth Club (new) |

Drop-ins are program sessions (public swim, public skate, rec drop-in) linked to their host venue. The card copy names them so parents know to look here.

### 7. Events

`/events` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Festivals and fairs | Festival Grounds, Town Square, Community Park Event Space, Neighbourhood Park, Botanical Garden Event Space, Outdoor Event Park, Fairgrounds, Cultural Centre, Concert Grounds, Dance Theatre |
| Holiday and seasonal | Winter Festival Village, Seasonal Event Plaza, Holiday Light Display (new) |
| Markets | Farmers' Market Square, Night Market Venue, Holiday Market Square, Craft Market Hall |
| Shows: theatre, puppets, magic, circus | Performance Venue, Theatre, Children's Theatre, Performance Hall, Circus Tent, Meet & Greet Zone |
| Library, museum and learning events | Education Centre, STEM Centre, Science Centre Auditorium, Museum Event Hall, Library Program Room, Storytelling Room, Bookstore Event Space, Art Gallery, Workshop Studio |
| Nature walks and star nights | Nature Trailhead, Conservation Area Trailhead, Bird Observatory, Observatory |
| Sports days and fun runs | Sports Complex, Race Start Area, Community Sports Field |
| Sports games to watch **(new)** | Spectator Sports Venue (new) |
| Outdoor movies and fireworks | Outdoor Amphitheatre, Fireworks Viewing Area |

Holiday and seasonal includes holiday lights and Santa visits. Events are dated records linked to a venue. These venue types are only a stopgap until that clean-up (GAP-018).

### 8. Food & Treats

`/food-treats` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Family restaurants | Family Restaurant, Casual Restaurant, Food Truck, Farm-to-Table Restaurant, Buffet Restaurant, All-You-Can-Eat Restaurant, Birthday Party Restaurant, Healthy Café |
| Breakfast, brunch and cafés | Brunch Café, Breakfast Restaurant, Neighbourhood Café, Coffee House, Tea House |
| Play cafés and kids' cafés | Kids Café, Play Café |
| Ice cream and gelato | Ice Cream Parlour, Gelato Shop, Frozen Yogurt Bar |
| Bakeries and desserts | Dessert Café, Artisan Bakery, Cupcake Boutique, Donut Shop, Chocolate Boutique, Candy Shop, Cookie Bakery |
| Bubble tea and smoothies | Bubble Tea Café, Juice & Smoothie Bar |
| Pizza and burgers | Pizzeria, Burger Restaurant |
| World cuisines | Indian Restaurant, Italian Restaurant, Chinese Restaurant, Japanese Restaurant, Korean Restaurant, Mexican Restaurant, Middle Eastern Restaurant, Thai Restaurant |
| Patios and waterfront | Waterfront Restaurant, Patio Dining |

### 9. Travel & Getaways

`/travel-getaways` · Coming soon

| Subcategory | Place types in it |
| --- | --- |
| Day trips | Day Trip Destination |
| Weekend getaways and hotels | Family Hotel, Suite Hotel, Boutique Hotel, Weekend Resort, Urban Staycation Hotel |
| Family resorts | Resort, Family Resort, All-Inclusive Resort, Beach Resort, Lakefront Retreat, Waterfront Lodge, Island Resort, Eco Lodge |
| Cottages and cabins | Vacation Home, Vacation Apartment, Lake Cottage, Luxury Cottage, Log Cabin, Forest Cabin |
| Camping and glamping | Luxury Glamping Tent, Geodesic Dome, Yurt, Tent Campground, Serviced Campground, RV Campground, Camping Provincial Park, National Park Campground, Conservation Camping Area |
| Ski resorts | Mountain Ski Resort |
| Theme and water park resorts | Water Park Resort, Theme Park Resort |
| Farm stays | Farm Stay |
| Scenic drives and train rides | Scenic Road Trip Route, Scenic Drive, Heritage Railway |

### Parked and merged

These stay in the data but don't show in Discover. Parked items can come back later. Merged items are duplicates, and their listings move to the type named.

| Place type | ID | Status | Why |
| --- | --- | --- | --- |
| Off-Leash Dog Park | `PT-PN-031` | Parked | Low value for families with kids under 12 |
| Leashed Dog Park | `PT-PN-032` | Parked | Low value for families with kids under 12 |
| Public Marina | `PT-PN-035` | Parked | Low value for families with kids under 12 |
| Tent Campground | `PT-PN-040` | Merged | Duplicate of Travel & Getaways > Campgrounds > Tent Campground (`PT-TRV-018`) |
| Esports Lounge | `PT-PE-038` | Parked | Esports lounges are mostly 13+ |
| Paintball Arena | `PT-PE-040` | Parked | Paintball is mostly 13+ |
| Nature Centre | `PT-LC-029` | Merged | Duplicate of Parks & Nature > Nature Centres > Nature Centre (`PT-PN-028`) |
| Fine Dining Restaurant | `PT-FOOD-003` | Parked | Not a family outing |
| Business Hotel | `PT-TRV-001` | Parked | Not a family stay |
| Roadside Motel | `PT-TRV-008` | Parked | Not a family destination |
| Wine Country Inn | `PT-TRV-033` | Parked | Not a family destination |
| Cruise Terminal | `PT-TRV-038` | Parked | Out of scope for now |
| Memorial Park (new) | `PT-PN-048` | Parked | Low value for families with kids under 12 |
| Civic Park (new) | `PT-PN-049` | Parked | Low value for families with kids under 12 |
| Shopping (38 types) | `PT-SHP-…` | Parked | Shopping is out of Discover: it clashes with the Compass Shop. Farm Market moved to Animals and Farms |
| Chocolate Boutique | `PT-SHP-039` | Merged | Duplicate of Food and Treats > Chocolate Boutique (`PT-FOOD-018`) |
| Services (37 types) | `PT-SRV-…` | Parked | Kept for a separate Household Services section later. Community Recreation Centre, EarlyON and Family Resource Centres moved into Discover |

Data fix: `PT-CAMP-017` was named "leadership Training Centre" in the workbook. It's now "STEM Camp Centre", matching Sheet1.

**Totals:** 445 place types (45 new), 355 live in Discover, 90 parked or merged.

## What every listing must answer

No place page goes live until it answers every question below. A missing answer shows as "Not confirmed yet" and goes on the call sheet, never left blank and never guessed. Where the workbook has no field yet, the gap number shows what must be added (all are in the **Taxonomy Gaps** sheet).

### Every place

| # | Parent question | Where it's stored |
| --- | --- | --- |
| 1 | How much for my kids and for me? Is it free? | Admission price per child, adult and family, plus free entry (GAP-009) |
| 2 | Is it right for my kids' ages? | Minimum and maximum age (GAP-010). Ages are kept exactly as the venue publishes them, including teen tiers |
| 3 | Is it open today, and in which seasons? | Weekly hours, holiday exceptions, season start and end (GAP-011) |
| 4 | Can we just turn up, or do I book? Where do I book? | Drop-in, book ahead or register for a season (GAP-012), plus the booking link |
| 5 | Where do I park, and is it free? | `FT-TP-001`, `FT-TP-011`, `FT-TP-012` |
| 6 | Are there washrooms and change tables? | `FT-CF-014`, `FT-FB-001`, `FT-FB-005` |
| 7 | Can I bring a stroller? | `FT-FB-025` to `FT-FB-027` |
| 8 | Can we bring food, or is there food nearby? | `FT-FD-021`, `FT-FD-022`, nearby food note |
| 9 | How long should we plan to spend? When is it quietest? What if the weather turns? | Typical visit length, quiet times, weather backup (GAP-019) |
| 10 | Is it safe? Is it fenced? Are there lifeguards? | `FT-SS-001`, `FT-SS-003`, `FT-SS-031` |
| 11 | Is it accessible for my child or me? | `FT-AC-009`, `FT-AC-016`, `FT-AC-024`, plus sensory hours `FT-AC-041` |
| 12 | How far is it, and how do I get there? | Address, map pin, drive time, transit `FT-TP-035` |
| 13 | What does it actually look like? | Photos, Vineeta's own where possible |
| 14 | When was this checked, and has Compass been there? | Last verified date ("latest verified \[date\]", never "live") and Vavy-checked status |

### Extra for camps

Dates and sessions; daily hours; before- and after-care and its cost; ages or grades; cost per day, week and session, and sibling discounts; spots left (as close to real time as possible) and the camp's own booking link; what kids bring, and whether lunch is included; staff qualifications and ratio; allergy and medical policy; refund and cancellation policy; location and drop-off; and which school board's PA days a PA day camp matches.

### Extra for classes and drop-ins

Session days and times; term dates; drop-in or register; cost per class and per term; skill level; class size; language of instruction (GAP-014); trial class; and whether a parent stays (required for parent and baby classes).

### Extra for tobogganing hills

Whether the city permits tobogganing there (this goes at the top of the page); hill size (gentle, medium or steep); what's at the bottom (open run-out, or trees, a road, a pond or a fence); lit for evening; parking and the walk with sleds; washrooms open in winter; nearby warm-up spot. All of these are in GAP-016.

### Extra for events

Date and time; venue (linked to its place page); cost; ages; tickets or drop-in; and a weather plan for outdoor events.

## Location, regions, drive time and PA days

Across Ontario, parents decide by **how far** and **which day**, not by city alone. Discover supports four ways of placing a family, and PA days come from the family's school board.

### How a place is located

| Layer | What it is | Source |
| --- | --- | --- |
| City | The header location picker: city-level only (Mississauga, Oakville, Brampton, Toronto…), never neighbourhoods | Place address |
| Region | Ontario's 13 official tourism regions (including 13a–c), for travel, day trips and "near me" outside the GTA | **Regions Reference** sheet in the workbook, plus the **Location Lookup** in `Ontario_Regions.xlsx` (about 2,186 places mapped to regions) |
| Drive time | "Within 15, 30, 60 or 120 minutes" of the family's location | Computed from the place's coordinates and the family's location (postal code or device location, with consent) |
| Map | Map view on category and collection pages | Mapbox GL JS (50,000 free monthly loads, no mandatory billing) |

Rules: a place has one city and one region. Region pages list cities in that region. Day trips and Travel default to sorting by drive time.

### PA days and school boards

Ontario has **72 district school boards**: 31 English public, 29 English Catholic, 4 French public and 8 French Catholic ([Ontario education facts](https://www.ontario.ca/page/education-facts)). Each sets its own PA days, so PA day camps only work if Compass knows the family's board.

**How it works:**

1. A family picks their school board (or school) in Profile. Without an account, they pick it on the PA days page, and it's remembered on that device.
2. Compass stores each board's calendar: PA days, winter break, March break and holidays.
3. The PA day camps page shows the next PA days for that board, each with the camps running that day.
4. Plan shows PA days on the family calendar, with a reminder before registration deadlines.
5. Private and independent schools have their own calendars. The family can enter their school's PA days themselves.

**Launch scope (January 1, 2027):** PA days for January–February 2027 for the boards serving Mississauga and Oakville. That's Peel District School Board, Dufferin-Peel Catholic District School Board, Halton District School Board, Halton Catholic District School Board, Conseil scolaire Viamonde and Conseil scolaire catholique MonAvenir. Add the remaining boards region by region as Compass expands.

Every calendar row stores its source (the board's published calendar link) and the date it was checked.

## Collections, editorials, occasions and the home page

Categories are one way in. Collections, editorials and occasions are the others, and they're what bring parents back each week.

### Three kinds of content

| Kind | What it is | Lives in | Example |
| --- | --- | --- | --- |
| Hand-picked collection | A short intro plus place cards Vineeta chose, ideally Vavy-checked | Discover, own page | Best tobogganing hills in Mississauga |
| Automatic collection | Saved filters that stay current with no effort | Discover, own page | Free things to do this winter (Free + Winter + city) |
| Editorial or guide | An article in Vineeta's voice, which can include a collection | Learn | How to pick a winter break camp |

Collections are **data, not code**. Vineeta creates, edits, orders and schedules them in Supabase (or a simple admin page) without a Cursor job. Each has a season window, so winter rows swap to spring rows on their own.

### Occasions (entry points)

Each occasion is an automatic collection with its own page: Rainy day; Snow day; Hot day; PA day; Birthday party; Grandparents visiting; First outing with a baby; After school; Long weekend; Free this weekend.

### Where they appear

1. **Home page** rows (see below)
2. **Category pages:** 1–2 relevant collections under the subcategory chips (Parks shows "Best tobogganing hills" in winter)
3. **Inside Learn guides:** a guide can embed a collection
4. **Their own pages**, which are shareable and found through search

### Home page order

Clean and airy, like Airbnb or Netflix rows. No more than these sections:

1. Header with location and search
2. Short hero: big with the waitlist before launch, then one line plus search after January 1
3. Category icon row: the 9 categories, Camps first
4. "This weekend in \[city\]": dated, timely picks
5. Collections: 2–3 rows that change with the season
6. Camps: winter break and PA days at launch
7. Plan teaser: "Tell us your day"
8. From Learn: guides and free printables (for example, the Space Mission scavenger hunt)
9. Vavy-checked trust strip, newsletter and footer

### Launch collections (January 1, 2027)

- Best tobogganing hills in Mississauga (hand-picked, Vavy-checked after the first good snowfall)
- Free things to do this winter (automatic)
- Rainy-day and cold-day indoor play (automatic)
- Winter break camps (automatic)
- PA day camps, January–February 2027 (automatic, by school board)

## Data model (Supabase)

Categories, subcategories, place types and filters come from data, never hard-coded in components. **First, Cursor inspects the existing schema in compassbyvavy-web** (places, camps, programs, features) and extends it. It doesn't create duplicates. Camps and classes stay program records linked to a host venue and provider, and events stay separate from places.

### New or extended tables

| Table | Key columns | Seeded from |
| --- | --- | --- |
| `discover_categories` | `id` (CAT-…), `slug`, `name`, `sort_order`, `card_copy`, `icon`, `status` (live, coming\_soon, parked) | Workbook sheet **Discover Categories** |
| `discover_subcategories` | `id` (DS-…), `category_id`, `slug`, `name`, `sort_order`, `description`, `is_new` | **Discover Subcategories** |
| `place_types` | `id` (PT-…), `name`, `discover_subcategory_id`, `source_category`, `source_subcategory`, `indoor_outdoor`, `permanent_seasonal`, `primary_age_group`, `discover_status` (Live, Parked, Merged), `merged_into` | **Discover Map** |
| `place_type_features` | `place_type_id`, `feature_id`, `applicability` (C, ?, —) | **Feature Matrix** (Core and Conditional only) |
| `places` (extend) | `primary_place_type_id`, `secondary_place_type_ids[]`, `city`, `region_id`, `lat`, `lng`, admission prices, `min_age_months`, `max_age_years`, hours, season dates, `registration_type`, `visit_length`, `quiet_times`, `weather_backup`, `last_verified_on`, `vavy_checked` | GAP-009 to GAP-012 and GAP-019 |
| `place_feature_values` | `place_id`, `feature_id`, `value`, `source`, `verified_on` | Venue research |
| `discover_filters` | `slug`, `label`, `group`, `applies_to[]`, `logic`, `feature_ids[]`, `status` | **Discover Filters** |
| `collections` | `slug`, `city`, `title`, `intro`, `kind` (hand\_picked, automatic), `filter_query` (JSON), `season_start`, `season_end`, `home_rank`, `published` | Vineeta, by hand |
| `collection_items` | `collection_id`, `place_id`, `sort_order`, `note` | Vineeta, by hand |
| `occasions` | `slug`, `title`, `filter_query`, `sort_order` | The occasions list above |
| `regions` | `id`, `name`, `number` (1–13, including 13a–c) | **Regions Reference** |
| `locations` | `name`, `region_id`, `county` | **Location Lookup** in `Ontario_Regions.xlsx` |
| `school_boards` | `id`, `name`, `system` (English public, English Catholic, French public, French Catholic), `cities[]`, `calendar_url` | Boards' published calendars |
| `school_calendar_days` | `board_id`, `date`, `kind` (pa\_day, holiday, winter\_break, march\_break), `source_url`, `checked_on` | Boards' published calendars |
| `verifications` | `place_id`, `verified_on`, `method` (visited, phoned, emailed, website), `by`, `notes` | Vineeta |

### Rules

- A place has **one primary place type** (which decides its subcategory) and can have secondary types. An indoor playground with a party room still lives in Indoor playgrounds and also matches the Birthday parties filter.
- `Parked` and `Merged` place types never appear in Discover, search or sitemaps. A place whose type is Merged moves to the `merged_into` type.
- Filters read from `place_feature_values` or the core place columns, never from free text.
- Place type IDs never change. A reseed updates names and mappings by ID.
- Seed scripts live in `scripts/seed-discover.ts` and can be re-run safely (upsert by ID).

## Pages and routes

Every Discover page is city-aware. The city comes from the header location picker and appears in the URL so pages can be shared and found through search.

| Page | Route | What it shows |
| --- | --- | --- |
| Discover hub | `/[city]/discover` | The 9 category cards (copy below), "This weekend," 2 collections |
| Category | `/[city]/[category]`, for example `/mississauga/camps` | Category intro, subcategory chips, filter bar, place cards, 1–2 collections, map toggle |
| Subcategory | `/[city]/[category]/[subcategory]`, for example `/mississauga/parks-nature/winter-fun` | Same layout, pre-filtered |
| Place | `/[city]/places/[place-slug]` | Full listing answering every question in "What every listing must answer" |
| Collection | `/[city]/collections/[slug]`, for example `/mississauga/collections/best-tobogganing-hills` | Intro, place cards, Vavy-checked badges, share button |
| Occasion | `/[city]/ideas/[occasion]`, for example `/mississauga/ideas/rainy-day` | Automatic collection for that occasion |
| PA days | `/[city]/camps/pa-days` | Board picker, next PA days, camps running each day |
| Region | `/regions/[region-slug]` | Cities in the region, top places, day trips by drive time |

Rules:

- **Keep every URL that's already live** (camp pages, indoor playground pages). If a route has to change, add a permanent redirect. Never break a link.
- A **coming soon** category still has its page, with a short intro, its subcategory list and a "Notify me" email form. It never shows an empty grid.
- Slugs come from the workbook and never change once published.
- Each page sets its title, description and Open Graph image. Category and collection pages go in the sitemap; parked types never do.
- The header menu stays Discover · Plan · Learn · Shop · Account, with search. There's no bottom tab bar on phones.

## UI components

Build these once and reuse them on the home page, Discover, collections and Learn.

| Component | Where | Behaviour |
| --- | --- | --- |
| `CategoryIconRow` | Home page, Discover hub | 9 icons with labels, Camps first. Line icons in forest green (Camps in fox orange). Scrolls sideways on phones. Coming-soon categories still link to their page |
| `CategoryCard` | Discover hub | Icon, name, card copy, and "Browse" (live) or "Notify me" (coming soon). Never "Coming soon" in capitals on every card |
| `SubcategoryChips` | Category pages | One chip per subcategory, in workbook order. "New" subcategories get no special badge for parents. Scrolls sideways on phones |
| `FilterBar` | Category, subcategory, collection and occasion pages | 4–5 quick chips (Free, Ages, Indoor or outdoor, Open today, Drive time), then "More filters" for the rest. Only filters that apply to that category show. Active filters show as removable chips |
| `FilterSheet` | "More filters" | Full-screen sheet on phones, side panel on desktop. Grouped as in the filters table. Shows how many places match before applying |
| `PlaceCard` | Everywhere places are listed | Photo, name, Vavy-checked badge, price for a family, ages, drive time or distance, open today, 2–3 key features, "Latest verified \[date\]" |
| `CollectionRail` | Home page, category pages | Title, "See all," horizontal row of `PlaceCard`s |
| `NotifyMe` | Coming-soon category pages | Email field, with the same submit logic as the waitlist |
| `BoardPicker` | PA days page, Profile | Search for a school board or school. Remembered on the device without an account |
| `EmptyState` | No results | "No places match these filters," a button to clear the last filter, and 3 nearby suggestions. Never a blank page |

**Icons** (lucide-react names): Camps `Tent`, Play and Entertainment `FerrisWheel`, Parks and Nature `Trees`, Animals and Farms `PawPrint`, Learning and Culture `Landmark`, Classes and Programs `GraduationCap`, Events `CalendarDays`, Food and Treats `IceCreamCone`, Travel and Getaways `Car`. Replace with custom fox-brand icons later. No emoji.

**Phones:** chips and rails scroll sideways; filters open as a full-screen sheet; tap targets are at least 44px; there's no bottom tab bar.

**Accessibility:** real links and buttons, visible focus rings, labels on every input, text contrast at least 4.5:1. Fox orange is never used for small text on cream (use `#8A4A1E`).

## Filters

27 filters work across Discover. Things that describe a place are filters, not subcategories. 17 are ready now from features in the workbook, 1 comes from the verification record, 1 is computed, and 8 need new fields first (gaps listed in the **Taxonomy Gaps** sheet). Until a gap is filled, its filter stays hidden: never shown with empty results.

| # | Filter | Group | Shows on | How it decides | Features used | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Free | Cost | All | Admission price for a child and an adult is 0 | — | Gap: needs admission price fields (GAP-009) |
| 2 | Price per family | Cost | All | Bands: Free, Under $25, $25–60, $60+ for 2 adults + 2 kids | — | Gap: needs admission price fields (GAP-009) |
| 3 | Ages | Kids | All | 0–2, 3–5, 6–8, 9–12; a place matches if its age range overlaps | — | Gap: needs min/max age fields (GAP-010) |
| 4 | Indoor or outdoor | Place | All | Place Types Indoor/Outdoor column, or the place's own value | `FT-CF-012`, `FT-CF-013` | Ready |
| 5 | Rainy day | Weather | All | Indoor = true | `FT-CF-012` | Ready |
| 6 | Open today | Time | All | Hours include today and the place isn't seasonally closed | `FT-FD-095` | Gap: needs opening hours and season dates (GAP-011) |
| 7 | Drive time | Location | All | Within 15, 30, 60 or 120 minutes of the family's location | — | Computed from coordinates |
| 8 | Stroller-friendly | Little ones | All | Any of the stroller features is Yes | `FT-FB-025`, `FT-FB-026`, `FT-FB-027` | Ready |
| 9 | Toddler area | Little ones | All | Toddler play area or toddler equipment is Yes | `FT-FB-042`, `FT-PE-002`, `FT-PE-020` | Ready |
| 10 | Change tables | Little ones | All | Baby change table is Yes | `FT-FB-001`, `FT-FB-005` | Ready |
| 11 | Nursing room | Little ones | All | Nursing room or private breastfeeding area is Yes | `FT-FB-012`, `FT-FB-013` | Ready |
| 12 | Accessible and inclusive | Access | All | Step-free entrance and accessible washroom, or inclusive play features | `FT-AC-009`, `FT-AC-016`, `FT-AC-024`, `FT-AC-065`, `FT-PE-085`, `FT-PE-086` | Ready |
| 13 | Sensory-friendly hours | Access | All | Low-sensory hours or sensory-friendly environment is Yes | `FT-AC-041`, `FT-AC-038` | Ready |
| 14 | Drop-in, no registration | Booking | Classes & Programs; Play & Entertainment; Events | Session or place does not require registration | — | Gap: needs a registration type field (GAP-012) |
| 15 | Birthday parties | Occasion | Play & Entertainment; Food & Treats; Animals & Farms | Party room or party package is Yes | `FT-CF-034`, `FT-FD-028` | Ready |
| 16 | Free parking | Getting there | All | Free parking is Yes | `FT-TP-011` | Ready |
| 17 | Reachable by transit | Getting there | All | Transit nearby or accessible transit connection is Yes | `FT-TP-035`, `FT-AC-007` | Ready |
| 18 | Fenced | Safety | Parks & Nature; Play & Entertainment | Fully fenced site or fenced playground is Yes | `FT-SS-001`, `FT-SS-003` | Ready |
| 19 | Lifeguards | Safety | Parks & Nature; Classes & Programs; Play & Entertainment | Lifeguard on duty is Yes | `FT-SS-031` | Ready |
| 20 | Outside food allowed | Food | All | Outside food permitted is Yes | `FT-FD-021`, `FT-FD-022` | Ready |
| 21 | Allergy-friendly and nut-free | Food | Food & Treats; Camps; Play & Entertainment | Nut-free options or allergen information is Yes | `FT-FD-017`, `FT-FD-018` | Ready |
| 22 | Halal | Food | Food & Treats | Halal options is Yes | — | Gap: needs a Halal Options feature (GAP-013) |
| 23 | Vegetarian | Food | Food & Treats | Vegetarian options is Yes | `FT-FD-013` | Ready |
| 24 | Kids' menu and high chairs | Food | Food & Treats | Children's menu or high chairs is Yes | `FT-FD-011`, `FT-FB-022` | Ready |
| 25 | French-language | Language | Classes & Programs; Camps; Events | Program is offered in French | — | Gap: needs a program language field (GAP-014) |
| 26 | Library or museum pass accepted | Cost | Learning & Culture; Animals & Farms | Free entry with a library museum pass | — | Gap: needs a library pass field (GAP-015) |
| 27 | Vavy-checked | Trust | All | Vineeta has visited and verified it | — | Comes from the verification record |

The city and region come from the location picker, and the season comes from dates. They're not filters, so parents never set them twice.

## Copy for every category card

Use exactly this copy. It's also in the **Discover Categories** sheet.

| # | Category | Card copy | At launch |
| --- | --- | --- | --- |
| 1 | Camps | Day camps for school breaks, PA days and summer. Check dates, ages, hours, cost and spots left. | Live |
| 2 | Play & Entertainment | Indoor playgrounds, trampoline parks, climbing, theme parks and rainy-day fun. | Live |
| 3 | Parks & Nature | Playgrounds, splash pads, trails, beaches and tobogganing hills. | Coming soon |
| 4 | Animals & Farms | Zoos, aquariums, farms, pick-your-own and pumpkin patches. | Coming soon |
| 5 | Learning & Culture | Museums, science centres, libraries, historic sites and culture. | Coming soon |
| 6 | Classes & Programs | Weekly lessons and drop-ins: swim, skate, sports, art, music and STEM. | Coming soon |
| 7 | Events | Festivals, shows, markets, holiday lights and seasonal celebrations. | Coming soon |
| 8 | Food & Treats | Family-friendly restaurants, play cafés and sweet stops. | Coming soon |
| 9 | Travel & Getaways | Day trips, family resorts, cottages and easy weekends away. | Coming soon |

A category switches from Coming soon to Live once it has verified listings for the selected city. Vineeta flips this in `discover_categories.status`; it isn't automatic.

## Rules and do-nots

**Trust**

- Never invent a venue, price, rating, count, age or date. A missing fact shows as "Not confirmed yet" and goes on the call sheet.
- Keep ages and prices exactly as the venue publishes them, including teen tiers. Compass is built for kids up to 12, but nothing is edited out.
- Show status as "Latest verified \[date\]", never "live" or "real-time" (except camp spot counts, which show when they were last updated).
- Vavy-checked only where Vineeta has visited.
- No paid ranking. Sponsored listings are always labelled. Provider payment never affects verification. Browsing is always free, with no login.
- Family and child data is never sold, never shared with providers without deliberate consent, and can be deleted anytime.

**Data**

- Categories, subcategories, filters, copy and collections come from the database, seeded from the workbook. Never hard-coded.
- Place type IDs and published slugs never change.
- Parked and merged types never appear in Discover, search or sitemaps.
- Every place gets one primary place type, so it shows in exactly one subcategory. Filters do the rest.
- Keep the existing data model: camps and classes are programs linked to a venue and provider, and events are separate from places.

**Website**

- Never break a live URL. Add redirects when a route changes.
- Clean and airy, like Airbnb or Netflix. No dense multi-section pages.
- No bottom tab bar on phones. The header menu is Discover · Plan · Learn · Shop · Account, plus search.
- Use the brand colours and fonts from the brand sheet. No emoji icons.
- Whatever can run as code on the site (filters, automatic collections, PA day matching, status changes) is built by Cursor and runs on the site, not done by hand or by Claude.

## Acceptance checklist and review pack

A phase is done only when every box for it is ticked. Cursor returns the review pack and Claude reviews it (approve or fix) before the next phase.

### Phase 1: data

- [ ] Seed script imports Discover Categories (9 live plus 2 parked), Discover Subcategories, Discover Map (445 place types) and Discover Filters (27)
- [ ] Every Live place type has exactly one Discover subcategory; there are no orphans
- [ ] Parked and Merged types are excluded from every public query
- [ ] Re-running the seed changes nothing (upsert by ID)
- [ ] New place columns from GAP-009 to GAP-012 and GAP-019 exist, plus the `verifications`, `collections`, `regions`, `school_boards` and `school_calendar_days` tables

### Phase 2: Discover pages

- [ ] Hub, 9 category pages and every subcategory page render for Mississauga and Oakville
- [ ] Coming-soon categories show intro, subcategories and Notify me, never an empty grid
- [ ] Each filter marked Ready works; gap filters stay hidden
- [ ] Existing camp and indoor playground URLs still work
- [ ] Phone layout at 390px: chips scroll, filters open as a full-screen sheet, no bottom tab bar

### Phase 3: collections and occasions

- [ ] Vineeta can create, order and schedule a collection without a code change
- [ ] The 5 launch collections and 10 occasion pages exist
- [ ] Home page rows read from `collections` and swap by season

### Phase 4: school calendars

- [ ] The 6 Mississauga and Oakville boards have January–February 2027 PA days, each with a source link and checked date
- [ ] The PA days page matches camps to the chosen board's dates
- [ ] A private-school family can enter their own PA days

### Phase 5: Ontario-wide browsing

- [ ] Region pages for all 13 regions
- [ ] Drive-time filter and sort work from a postal code or device location

### Review pack (Cursor sends this after every phase)

1. List of files created or changed
2. Screenshots at 1440px and 390px wide of every new page
3. Row counts per table after seeding, and any rows that failed
4. Lighthouse scores (performance and accessibility) for one page of each kind
5. Anything not built exactly as this doc says, and why
6. Routes left as placeholders and filters hidden for gaps
