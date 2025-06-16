import { FC } from "react";

interface Props {
  photo: any;
  isMoving: boolean;
  size: number; // 240
}

export const PhotoCell: FC<Props> = ({ photo, isMoving, size }) => {
  const thumb = `${photo.r2_key}?width=${size}&height=${size}&fit=cover&gravity=auto&format=webp`;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ 
        background: photo.dominant_rgb,
        width: size,
        height: size,
        padding: 0,
        margin: 0
      }}
    >
      <img
        src={thumb}
        alt={photo.filename}
        className="w-full h-full object-cover"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center'
        }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};