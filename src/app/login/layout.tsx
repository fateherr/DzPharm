import type { Metadata } from "next";

/**
 * P2-19 — The login page is indexable (robots: index, follow inherited from
 * the root layout). The login page has no value to searchers and indexing it
 * advertises the authentication pattern. Override to noindex, nofollow for
 * /login only (additive — the root layout's global robots config is unchanged).
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
