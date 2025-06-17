import '../globals.css';
import AgeGate from "../components/AgeGate";

export const metadata = {
  title: {
    default: "Love Venus",
    template: "%s | Love Venus",
  },
  description:
    "Love Venus is an interactive, hue-sorted gallery of artistic female nude photography. Explore a spectrum of color-graded images celebrating the elegance of the female form.",
  keywords: [
    "art nude photography",
    "female body art",
    "color gradient photo grid",
    "hue sorted gallery",
    "artistic nude",
    "Love Venus",
  ],
  authors: [{ name: "Love Venus" }],
  creator: "Love Venus",
  themeColor: "#000000",
  openGraph: {
    title: "Love Venus – Artistic Nude Photo Spectrum",
    description:
      "Discover an immersive wall of artistic female nude photographs, arranged by color for a seamless visual journey.",
    url: "https://lovevenus.art",
    siteName: "Love Venus",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Love Venus – Artistic Nude Photo Spectrum",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Love Venus – Artistic Nude Photo Spectrum",
    description:
      "Experience a hue-sorted gallery of refined female nude photography.",
    images: [
      {
        url: "/og.png",
        alt: "Love Venus – Artistic Nude Photo Spectrum",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      maxVideoPreview: -1,
      maxImagePreview: "large",
      maxSnippet: -1,
    },
  },
  metadataBase: new URL("https://lovevenus.art"),
};

// Viewport & browser chrome color
export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body className="bg-black text-white"><AgeGate />{children}</body></html>;
} 