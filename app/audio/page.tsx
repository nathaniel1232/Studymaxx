"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AudioPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to home with audio view param
    window.location.href = '/?view=audio';
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="text-white text-lg">Loading audio recorder...</div>
    </div>
  );
}
