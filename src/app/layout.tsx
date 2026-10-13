import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ProductFooter } from "@/components/public-product/footer";
import { Header } from "@/components/header";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Bountini — Small quests. Real rewards.",
    template: "%s | Bountini",
  },
  description:
    "A clear brief. One contributor. Rewards held in Solana Devnet escrow until you approve.",
  icons: { icon: "/brand/favicon.svg", apple: "/brand/apple-touch-icon.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <ProductFooter />
        </Providers>
      </body>
    </html>
  );
}
