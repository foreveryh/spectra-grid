'use client';

import ThiingsGrid from "../components/ThiingsGrid";
import { PhotoCell } from "../components/PhotoCell";
import { useState } from "react";
import { photos as mockPhotos } from "../lib/mockData";
import { useRouter } from "next/navigation";

const GRID = 240; // 150 on mobile

export default function Page() {
  const photos = mockPhotos;
  const router = useRouter();

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