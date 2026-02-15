"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../utils/supabase";

export default function SummarizerPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        window.location.href = '/?view=summarizer';
      } else {
        router.replace('/');
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [router]);
  
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-white text-lg">Loading Summarizer...</div>
      </div>
    );
  }
  
  return null;
}
