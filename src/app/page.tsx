'use client';

import ThiingsGrid from "../components/ThiingsGrid";
import { PhotoCell } from "../components/PhotoCell";
import { useState, useEffect, useCallback, useRef } from "react";
import { photos as mockPhotos } from "../lib/mockData";
import { useRouter } from "next/navigation";
import { Photo } from "../types/photo";

const GRID = 240; // 150 on mobile

// 伪随机hash函数，打乱图片分布，避免对称
function pseudoRandomIndex(x: number, y: number, n: number) {
  const seed = x * 73856093 ^ y * 19349663;
  return Math.abs(seed) % n;
}

// localStorage 持久化工具
function saveGridState({ photos, page, hasMore, offset }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('grid_photos', JSON.stringify(photos));
  localStorage.setItem('grid_page', String(page));
  localStorage.setItem('grid_hasMore', String(hasMore));
  localStorage.setItem('grid_offset', JSON.stringify(offset));
}
function loadGridState() {
  if (typeof window === 'undefined') return { photos: [], page: 1, hasMore: true, offset: { x: 0, y: 0 } };
  const photos = JSON.parse(localStorage.getItem('grid_photos') || '[]');
  const page = parseInt(localStorage.getItem('grid_page') || '1');
  const hasMore = localStorage.getItem('grid_hasMore') === 'true';
  const offset = JSON.parse(localStorage.getItem('grid_offset') || '{"x":0,"y":0}');
  return { photos, page, hasMore, offset };
}

export default function Page() {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rehydrated, setRehydrated] = useState(false);
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { photos: savedPhotos, page: savedPage, hasMore: savedHasMore, offset: savedOffset } = loadGridState();
      if (savedPhotos.length) setPhotos(savedPhotos);
      if (savedPage) setPage(savedPage);
      if (typeof savedHasMore === 'boolean') setHasMore(savedHasMore);
      if (savedOffset) setOffset(savedOffset);
      setRehydrated(true);
    }
  }, []);

  const loadPhotos = useCallback(async (pageNum: number = 1) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
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
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { photos: savedPhotos } = loadGridState();
      if (!savedPhotos.length) {
        loadPhotos(1);
      }
    }
  }, [loadPhotos]);

  useEffect(() => {
    saveGridState({ photos, page, hasMore, offset });
  }, [photos, page, hasMore, offset]);

  if (!rehydrated) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <span className="text-lg opacity-60">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <ThiingsGrid
        gridSize={GRID}
        initialPosition={offset}
        onOffsetChange={setOffset}
        renderItem={({ gridIndex, position, isMoving }) => {
          const idx = pseudoRandomIndex(position.x, position.y, photos.length);
          const photo = photos[idx];
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
        onItemClick={(gridIndex, position) => {
          const idx = pseudoRandomIndex(position.x, position.y, photos.length);
          const photo = photos[idx];
          router.push(`/photo/${photo.id}`);
        }}
      />
    </div>
  );
} 