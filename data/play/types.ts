export type EvidenceKind =
  | "official_location"
  | "official_chain"
  | "review_signal"
  | "compass_assessment"
  | "first_hand";

export type VerificationStatus = "verified" | "needs_review";

export type Source = {
  id: string;
  label: string;
  url: string;
  kind: EvidenceKind;
  capturedAt: string;
};

export type SourcedText = {
  text: string;
  sourceIds: string[];
  status: VerificationStatus;
};

export type PriceOption = {
  id: string;
  name: string;
  priceCad: number;
  cadence: "ticket" | "month" | "year";
  access: string;
  benefits?: string[];
  sourceIds: string[];
};

export type Offer = {
  id: string;
  name: string;
  summary: string;
  priceCad?: number;
  promoCode?: string;
  terms?: string[];
  validUntil?: string;
  sourceIds: string[];
};

export type PlayVenue = {
  id: `PE-${string}`;
  slug: string;
  name: string;
  status: VerificationStatus;
  lastResearched: string;
  websiteUrl: string;
  bookingUrl?: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    note?: string;
  };
  setting: "Indoor" | "Outdoor" | "Indoor/Outdoor";
  primaryCategory: string;
  additionalCategories: string[];
  summary: SourcedText;
  officialEligibility: SourcedText;
  compassBestAges: string;
  ageNotes: string[];
  activities: Array<{
    name: string;
    description: string;
    bestAges?: string;
    sourceIds: string[];
  }>;
  programs: Array<{
    name: string;
    availability: "scheduled" | "needs_local_confirmation";
    description: string;
    sourceIds: string[];
  }>;
  pricing: PriceOption[];
  offers: Offer[];
  partySummary: SourcedText;
  practical: Array<{
    label: string;
    value: string;
    sourceIds: string[];
    status: VerificationStatus;
  }>;
  amenities: Array<{
    label: string;
    value: "Yes" | "No" | "Needs confirmation";
    note?: string;
    sourceIds: string[];
  }>;
  reviewSignal: {
    status: "strong" | "moderate" | "limited";
    sourceNote: string;
    bestLiked: string[];
    notLiked: string[];
    sourceIds: string[];
  };
  compassVerdict: {
    bestFor: string[];
    lessIdealFor: string[];
    parentTips: string[];
  };
  firstHandNote?: SourcedText;
  sources: Source[];
};
