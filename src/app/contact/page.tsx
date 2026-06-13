import { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://pluggedin.lk"),
  title: "Contact Support | Help Desk & Inquiries | PluggedIn",
  description: "Get in touch with PluggedIn support desk. Send us your questions about our premium workspace setup tools, shipping logistics, or customized collection bundles.",
};

export default function Page() {
  return <ContactClient />;
}
