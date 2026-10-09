import type { Metadata } from "next";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import { LangProvider } from "@/i18n";

export const metadata: Metadata = {
  title: "Livable Area: how much of Toronto is within 30 minutes",
  description:
    "Modeled 30-minute travel-time isochrones from Union Station, Toronto, by transit and car, plus marginal analysis of proposed transit lines ranked by km² per billion dollars. Open data, MIT licensed.",
  metadataBase: new URL("https://livable.canada.nshipyard.com"),
  alternates: { canonical: "https://livable.canada.nshipyard.com" },
  openGraph: {
    title: "Livable Area: how much of Toronto is within 30 minutes",
    description:
      "Modeled isochrones from Union Station, Toronto, by transit and car. Which proposed line buys the most 30-minute land per billion dollars?",
    url: "https://livable.canada.nshipyard.com",
    siteName: "Open Nshipyard",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
