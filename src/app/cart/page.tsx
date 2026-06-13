import { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://pluggedin.lk"),
  title: "Shopping Cart | Review Setup Essentials | PluggedIn",
  description: "Review your creative setup essentials, select product quantities, and proceed to secure checkout on PluggedIn.",
};

export default function Page() {
  return <CartClient />;
}
