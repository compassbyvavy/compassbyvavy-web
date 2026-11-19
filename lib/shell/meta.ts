import type { Metadata } from "next";

export function shellMeta({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      images: [{ url: "/brand/mark-on-green.png", alt: "Compass by Vavy" }],
    },
  };
}
