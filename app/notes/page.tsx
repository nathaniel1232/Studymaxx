'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p style={{ color: '#5f6368' }} className="font-medium">Loading...</p>
      </div>
    </div>
  );
}
