import { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "About Us | Electronics, Smart Devices & Gadgets | PluggedIn",
  description: "PluggedIn is an online store in Dehiwala, Colombo for the latest electronics, smart devices and household gadgets in Sri Lanka — handpicked for quality, with fast island-wide delivery.",
  openGraph: {
    title: "About Us | Electronics, Smart Devices & Gadgets | PluggedIn",
    description: "The latest electronics, smart devices and household gadgets in Sri Lanka — handpicked for quality, with fast island-wide delivery.",
    url: "https://www.pluggedin.lk/about",
    images: ["/banner_1.webp"],
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
