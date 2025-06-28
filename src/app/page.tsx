'use client';

import ThiingsGrid from "../components/ThiingsGrid";
import { PhotoCell } from "../components/PhotoCell";
import { useState, useEffect, useCallback } from "react";
import { photos as mockPhotos } from "../lib/mockData";
import { useRouter } from "next/navigation";
import { Photo } from "../types/photo";

const GRID = 240; // 150 on mobile

export default function Page() {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadPhotos = useCallback(async (pageNum: number = 1) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/photos?page=${pageNum}&limit=100`);
      if (!res.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await res.json() as {
        photos: Photo[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
          totalPages: number;
        };
      };
      
      if (pageNum === 1) {
        setPhotos(data.photos);
      } else {
        setPhotos(prev => [...prev, ...data.photos]);
      }
      
      setHasMore(data.pagination.hasMore);
      setPage(data.pagination.page);
    } catch (error) {
      console.error("Error fetching photos:", error);
      // Keep existing data as fallback
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadPhotos(1);
  }, [loadPhotos]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadPhotos(page + 1);
    }
  }, [hasMore, loading, page, loadPhotos]);

  return (
    <div className="w-full h-screen overflow-hidden">
      <ThiingsGrid
        gridSize={GRID}
        renderItem={({ gridIndex, isMoving }) => {
          // 如果超出已加载的图片数量，尝试加载更多
          if (gridIndex >= photos.length && hasMore && !loading) {
            // 延迟加载，避免频繁请求
            setTimeout(handleLoadMore, 100);
            // 在加载期间，使用模运算显示已有图片
            const photo = photos[gridIndex % photos.length];
            return (
              <PhotoCell
                key={gridIndex}
                photo={photo}
                isMoving={isMoving}
                size={GRID}
                onClick={() => router.push(`/photo/${photo.id}`)}
              />
            );
          }
          
          // 无限循环：使用模运算确保永远有图片显示
          const photo = photos[gridIndex % photos.length];
          return (
            <PhotoCell
              key={gridIndex}
              photo={photo}
              isMoving={isMoving}
              size={GRID}
              onClick={() => router.push(`/photo/${photo.id}`)}
            />
          );
        }}
        onItemClick={(gridIndex) => {
          const photo = photos[gridIndex % photos.length];
          router.push(`/photo/${photo.id}`);
        }}
      />
    </div>
  );
} 