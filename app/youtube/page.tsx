"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function YouTubePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to home with youtube view param
    window.location.href = '/?view=youtube';
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
      <div className="text-lg" style={{ color: '#64748b' }}>Loading YouTube extractor...</div>
    </div>
  );
}
