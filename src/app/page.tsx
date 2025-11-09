'use client';

import ThiingsGrid from "../components/ThiingsGrid";
import { PhotoCell } from "../components/PhotoCell";
import Lightbox from "../components/Lightbox";
import { useState, useEffect } from "react";
import { photos as mockPhotos } from "../lib/mockData";

const GRID = 240; // 150 on mobile

export default function Page() {
  const photos = mockPhotos;
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    console.log("📸 Available photos:", photos.length);
  }, [photos]);

  const handlePhotoOpen = (photo: any) => {
    console.log("🎯 Opening photo:", photo.filename);
    setCurrent(photo);
  };

  const handleClose = () => {
    console.log("🔒 Closing lightbox");
    setCurrent(null);
  };

  console.log("🔄 Page rendering, current photo:", current?.filename);

  return (
    <div className="w-full h-screen overflow-hidden">
      <ThiingsGrid
        gridSize={GRID}
        renderItem={({ gridIndex }) => {
          const photo = photos[gridIndex % photos.length];
          return (
            <PhotoCell
              key={gridIndex}
              photo={photo}
              size={GRID}
              onOpen={() => handlePhotoOpen(photo)}
            />
          );
        }}
      />
      {current && <Lightbox photo={current} onClose={handleClose} />}
    </div>
  );
} 