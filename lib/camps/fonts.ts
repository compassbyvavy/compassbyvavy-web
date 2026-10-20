/**
 * Camps-scoped font loaders (next/font).
 *
 * Used by the Camps, Discover and Plan (saved list) layouts. Do not apply to the root
 * layout. Combine the variables with `.camps-theme` from camps.css.
 */

import { Inter, Newsreader } from "next/font/google";

export const campsNewsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--camps-font-display",
  display: "swap",
});

export const campsInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--camps-font-body",
  display: "swap",
});

/** Class names to compose on a camps layout wrapper with `.camps-theme`. */
export const campsFontVariables = `${campsNewsreader.variable} ${campsInter.variable}`;
