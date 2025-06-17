'use client';

import { useEffect, useState } from "react";

/**
 * AgeGate modal:
 *  1. Prompt first-time visitors to confirm they are 18 +.
 *  2. When "Enter" is clicked we store a flag in localStorage so the banner
 *     will not show up again during future visits (unless storage is cleared).
 *  3. "Leave" redirects users away from the site (defaults to google.com).
 */
export default function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 客户端渲染阶段检查 localStorage
    if (typeof window !== "undefined") {
      const verified = localStorage.getItem("ageVerified");
      if (!verified) {
        setOpen(true);
      }
    }
  }, []);

  const confirmAge = () => {
    localStorage.setItem("ageVerified", "true");
    setOpen(false);
  };

  const leaveSite = () => {
    // Redirect to an external safe page.
    if (typeof window !== "undefined") {
      window.location.href = "https://www.google.com";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full bg-white text-black rounded-lg shadow-lg p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Mature Content Warning</h2>
        <p className="text-center text-sm leading-relaxed">
          This gallery showcases <strong>artistic nude photography</strong> featuring full
          and partial female nudity, including intimate close-ups. It is intended for
          <strong>adults 18&nbsp;years of age or older</strong>. By choosing "Enter" you
          confirm that you are at least 18 and that viewing such material is legal in
          your locale. If not, please click "Leave".
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <button
            className="px-5 py-2.5 rounded bg-black text-white hover:bg-gray-800 transition"
            onClick={confirmAge}
          >
            I&rsquo;m 18&nbsp;+ — Enter
          </button>
          <button
            className="px-5 py-2.5 rounded bg-gray-300 text-black hover:bg-gray-400 transition"
            onClick={leaveSite}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
} 