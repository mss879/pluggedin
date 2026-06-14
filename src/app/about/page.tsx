import { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "About Us | Curated Electronics & Lifestyle Store | PluggedIn",
  description: "PluggedIn is a curated online store for electronics and lifestyle products in Sri Lanka — handpicked tech, workspace gear and accessories, fairly priced and delivered to your door.",
  openGraph: {
    title: "About Us | Curated Electronics & Lifestyle Store | PluggedIn",
    description: "A curated online store for electronics and lifestyle products in Sri Lanka — handpicked, fairly priced, and delivered to your door.",
    url: "https://www.pluggedin.lk/about",
    images: ["/banner_1.webp"],
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
