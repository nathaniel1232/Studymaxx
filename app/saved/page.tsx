'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SavedPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/?view=saved');
  }, [router]);
  
  return null;
}
