import '../globals.css';

export const metadata = { title: "Photo Grid" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body className="bg-black text-white">{children}</body></html>;
} 