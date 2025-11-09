import { FC, memo } from "react";

interface Props {
  photo: any;
  isMoving: boolean;
  size: number;
  onClick?: () => void;
  onOpen?: () => void;
}

const PhotoCellComponent: FC<Props> = ({ photo, isMoving, size, onClick, onOpen }) => {
  // Use the pre-generated AVIF thumbnail key directly
  const thumbSrc = photo.thumb_key;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag event
    if (onOpen) {
      onOpen();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden photo-cell cursor-pointer"
      style={{
        background: photo.dominant_rgb,
        width: size,
        height: size,
        padding: 0,
        margin: 0
      }}
      onClick={handleClick}
    >
      <picture>
        <source srcSet={thumbSrc} type="image/avif" />
        <img
          src={thumbSrc}
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

// Use React.memo to prevent unnecessary re-renders
export const PhotoCell = memo(PhotoCellComponent, (prevProps, nextProps) => {
  // Only re-render if photo, size, or isMoving changed
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.size === nextProps.size &&
    prevProps.isMoving === nextProps.isMoving
  );
});