import { Metadata } from "next";
import BlogClient from "./BlogClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "Setup Journal | Workspace Guides & Custom Keyboards | PluggedIn",
  description: "Read the PluggedIn Setup Journal. Expert strategies on workspace organization, mechanical keyboards, GaN electronics, and lifestyle shopping in Sri Lanka.",
  openGraph: {
    title: "Setup Journal | Workspace Guides & Custom Keyboards | PluggedIn",
    description: "Read the PluggedIn Setup Journal. Sourcing workspace organization and custom mechanical keyboards in Sri Lanka.",
    url: "https://www.pluggedin.lk/blog",
    images: ["/banner_1.webp"],
  },
};

export default function Page() {
  return <BlogClient />;
}
