import { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://pluggedin.lk"),
  title: "Secure Checkout | Complete Your Setup Order | PluggedIn",
  description: "Complete your order securely. Enter your shipping information and payment details to process your premium creator essentials.",
};

export default function Page() {
  return <CheckoutClient />;
}
