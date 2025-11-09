'use client';

import { useEffect, useState } from 'react';

interface PhotoCountProps {
  className?: string;
}

export default function PhotoCount({ className = '' }: PhotoCountProps) {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    // Fetch photos from API to work in both development and production environments
    async function fetchPhotoCount() {
      try {
        const response = await fetch('/api/photos?page=1&limit=1');
        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }
        const data = await response.json() as { photos?: any[]; pagination?: { total?: number } };
        // 兼容新老格式
        if (data?.pagination?.total) {
          setCount(data.pagination.total);
        } else if (Array.isArray(data)) {
          setCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching photo count:', error);
        // Fallback to null, which won't display anything
      }
    }
    
    fetchPhotoCount();
  }, []);

  if (count === null) return null;

  return (
    <div className={`fixed top-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm 
                    px-3 py-1 rounded-lg text-white text-opacity-80 z-50 ${className}`}>
      {count} Photos
    </div>
  );
}