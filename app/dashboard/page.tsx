"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../utils/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        // User is logged in, redirect to home where dashboard will render
        window.location.href = '/?view=dashboard';
      } else {
        // Not logged in, redirect to home
        router.replace('/');
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [router]);
  
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-white text-lg">Loading dashboard...</div>
      </div>
    );
  }
  
  return null;
}
