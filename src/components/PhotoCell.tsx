import { FC } from "react";

interface Props {
  photo: any;
  size: number;
  onOpen: () => void;
}

export const PhotoCell: FC<Props> = ({ photo, size, onOpen }) => {
  const thumb = `${photo.r2_key}?width=${size}&height=${size}&fit=cover&gravity=auto&format=webp`;

  return (
    <div
      className="absolute inset-0 overflow-hidden photo-cell"
      style={{
        width: size,
        height: size,
        background: photo.dominant_rgb,
        padding: 0,
        margin: 0,
        cursor: "pointer",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <img
        src={thumb}
        alt={photo.filename}
        className="w-full h-full object-cover"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};