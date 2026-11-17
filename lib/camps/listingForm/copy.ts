/**
 * Wording for the listing form and the invite email.
 * The email is Vineeta's template. Change it here, not in the sender.
 */

export const listingCopy = {
  header: (camp: string) => `Compass by Vavy · Listing for ${camp}`,
  about: "Compass is a free guide that helps Mississauga parents find camps.",
  seeListing: "See the listing",
  unpublished: "The public page isn't up yet. This form is the listing we have so far.",
  you: "You",
  yourName: "Your name",
  role: "Role",
  email: "Email",
  phone: "Phone",
  privateNote: "Used by Compass only. Never shown on the listing.",
  publicPhone: "Public phone",
  publicEmail: "Public email",
  publicNote: "For parents, if it is different from the phone and email above.",
  check: "Check what we have",
  questions: "A few questions about your camp",
  ask: "What parents ask",
  other: "Your other camps",
  otherHelp: "PA days, March Break and summer: dates and register links, if they are posted. Each one becomes a proposed new session.",
  photos: "Photos and logo",
  photosHelp: "Up to 8 photos and 1 logo. JPG, PNG, HEIC or WEBP. 10 MB each.",
  caption: "Caption",
  credit: "Photo credit",
  photoRights: "I have the right to share these photos, and Compass by Vavy may show them on its listing and on social posts about the listing.",
  childPermission: "Any children shown are pictured with their parents' permission.",
  confirm: "Confirm",
  accuracy: "To my knowledge these details are correct as of today.",
  typedName: "Typed name",
  correct: "Correct",
  edit: "Edit",
  lastYear: "Last year's info: still true?",
  fillIn: "Fill in",
  send: "Send to Compass",
  saved: "Saved on this device.",
  badLink: "This link has expired, or it isn't one of ours. Email hello@compassbyvavy.ca and we'll send a new one.",
  optedOut: "This camp asked not to be listed. Email hello@compassbyvavy.ca if that was a mistake.",
  reviewed: "We've already reviewed this one. Email hello@compassbyvavy.ca to change it.",
  turnstileTest: "Spam check is using Cloudflare's test widget on this branch.",
  exampleBanner: "Example only. These answers are not from a camp.",
} as const;

export const inviteMail = {
  subject: (camp: string) => `${camp} on Compass by Vavy: please check your free listing`,
  cannotSend: "The mailing address is empty, so this email cannot be sent.",
};
