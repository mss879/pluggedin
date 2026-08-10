import { Inter } from "next/font/google";
import AdminGate from "./AdminGate";

/**
 * Inter is loaded here rather than in the root layout because it is used
 * exclusively by the admin dashboard (`font-inter` appears nowhere outside
 * src/app/admin). Loading it globally meant every storefront visitor
 * downloaded a font family they would never see a glyph of.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={inter.variable}>
      <AdminGate>{children}</AdminGate>
    </div>
  );
}
