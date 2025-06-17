import { FC } from "react";

interface Props {
  photo: any;
  isMoving: boolean;
  size: number; // 240
  onClick?: () => void;
}

export const PhotoCell: FC<Props> = ({ photo, isMoving, size, onClick }) => {
  // Use the pre-generated AVIF thumbnail key directly.
  const thumbSrc = photo.thumb_key;

  // For fallback, you could construct a path to the original JPG/PNG.
  // const fallbackSrc = photo.r2_key;

  return (
    <div
      className="absolute inset-0 overflow-hidden cursor-pointer"
      style={{
        background: photo.dominant_rgb,
        width: size,
        height: size,
        padding: 0,
        margin: 0
      }}
      onClick={onClick}
    >
      <picture>
        <source srcSet={thumbSrc} type="image/avif" />
        <img
          src={thumbSrc} // Fallback for browsers that don't support <picture> or AVIF
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
      </picture>
    </div>
  );
};