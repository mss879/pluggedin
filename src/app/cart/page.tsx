import { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pluggedin.lk"),
  title: "Shopping Cart | Review Setup Essentials | PluggedIn",
  description: "Review your creative setup essentials, select product quantities, and proceed to secure checkout on PluggedIn.",
  openGraph: {
    title: "Shopping Cart | PluggedIn",
    description: "Review your creative setup essentials and proceed to secure checkout.",
    url: "https://www.pluggedin.lk/cart",
    images: ["/banner_1.webp"],
  },
};

export default function Page() {
  return <CartClient />;
}
