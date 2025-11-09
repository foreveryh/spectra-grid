export const metadata = { title: "Beauty Grid" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body className="bg-black text-white">{children}</body></html>;
} 