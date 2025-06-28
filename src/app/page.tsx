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
  localStorage.setItem('grid_photos', JSON.stringify(photos));
  localStorage.setItem('grid_page', String(page));
  localStorage.setItem('grid_hasMore', String(hasMore));
  localStorage.setItem('grid_offset', JSON.stringify(offset));
}
function loadGridState() {
  const photos = JSON.parse(localStorage.getItem('grid_photos') || '[]');
  const page = parseInt(localStorage.getItem('grid_page') || '1');
  const hasMore = localStorage.getItem('grid_hasMore') === 'true';
  const offset = JSON.parse(localStorage.getItem('grid_offset') || '{"x":0,"y":0}');
  return { photos, page, hasMore, offset };
}

export default function Page() {
  // 1. 初始化时优先从 localStorage 恢复
  const { photos: savedPhotos, page: savedPage, hasMore: savedHasMore, offset: savedOffset } = loadGridState();
  const [photos, setPhotos] = useState(savedPhotos.length ? savedPhotos : mockPhotos);
  const [page, setPage] = useState(savedPage || 1);
  const [hasMore, setHasMore] = useState(savedHasMore ?? true);
  const [offset, setOffset] = useState(savedOffset || { x: 0, y: 0 });
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 2. 加载图片逻辑
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

  // 3. 首次挂载时恢复数据
  useEffect(() => {
    if (!savedPhotos.length) {
      loadPhotos(1);
    }
  }, []);

  // 4. 状态变化时保存到 localStorage
  useEffect(() => {
    saveGridState({ photos, page, hasMore, offset });
  }, [photos, page, hasMore, offset]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingRef.current) {
      loadPhotos(page + 1);
    }
  }, [hasMore, page, loadPhotos]);

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