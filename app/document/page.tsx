'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/?view=document');
  }, [router]);
  
  return null;
}
