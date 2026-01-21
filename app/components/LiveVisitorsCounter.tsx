"use client";

import { useState, useEffect } from "react";

export default function LiveVisitorsCounter() {
  const [visitorCount, setVisitorCount] = useState(15);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Base visitors (always minimum 15)
    const baseVisitors = 15;
    
    // Add random fluctuation for realism
    const updateVisitors = () => {
      const randomChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const newCount = Math.max(baseVisitors, baseVisitors + randomChange + Math.floor(Math.random() * 8));
      
      setIsAnimating(true);
      setVisitorCount(newCount);
      setTimeout(() => setIsAnimating(false), 300);
    };

    // Update every 8-15 seconds for realism
    const interval = setInterval(updateVisitors, 8000 + Math.random() * 7000);
    
    // Initial random count
    updateVisitors();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#22c55e' }}></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: '#22c55e' }}></span>
      </span>
      <span className="text-sm font-medium" style={{ color: '#16a34a' }}>
        {visitorCount} people taking test now
      </span>
    </div>
  );
}
