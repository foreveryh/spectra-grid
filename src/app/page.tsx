'use client';

import ThiingsGrid from "../components/ThiingsGrid";
import { PhotoCell } from "../components/PhotoCell";
import { useState, useEffect } from "react";
import { photos as mockPhotos } from "../lib/mockData";
import { useRouter } from "next/navigation";
import { Photo } from "../types/photo";

const GRID = 240; // 150 on mobile

export default function Page() {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const router = useRouter();

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos');
        if (!res.ok) {
          throw new Error('Failed to fetch photos');
        }
        const data = await res.json() as Photo[];
        setPhotos(data);
      } catch (error) {
        console.error("Error fetching photos:", error);
        // Keep mock data as fallback
      }
    };

    fetchPhotos();
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden">
      <ThiingsGrid
        gridSize={GRID}
        renderItem={({ gridIndex, isMoving }) => {
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