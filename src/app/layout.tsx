import '../globals.css';
import AgeGate from "../components/AgeGate";

export const metadata = { title: "Photo Grid" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body className="bg-black text-white"><AgeGate />{children}</body></html>;
} 