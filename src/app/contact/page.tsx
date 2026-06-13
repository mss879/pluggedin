import { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "Contact Support | Help Desk & Inquiries | PluggedIn",
  description: "Get in touch with PluggedIn support desk. Send us your questions about our premium workspace setup tools, shipping logistics, or customized collection bundles.",
  openGraph: {
    title: "Contact Support | Help Desk & Inquiries | PluggedIn",
    description: "Get in touch with PluggedIn support desk. Send us your questions about our premium workspace setup tools.",
    url: "https://www.pluggedin.lk/contact",
    images: ["/banner_1.webp"],
  },
};

export default function Page() {
  return <ContactClient />;
}
