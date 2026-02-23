"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home with upgrade modal
    router.replace('/?upgrade=true');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
      <p style={{ color: '#94a3b8' }}>Redirecting...</p>
    </div>
  );
}