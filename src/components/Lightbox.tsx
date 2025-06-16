import { Dialog } from "@headlessui/react";
import { X, Download, ArrowLeft } from "lucide-react";

export default function Lightbox({ photo, onClose }: { photo: any; onClose: () => void }) {
  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${photo.r2_key}?width=1600&format=webp`;
    link.download = photo.filename || 'photo.webp';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open onClose={onClose} className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative flex h-full w-full items-center justify-center p-4">
        <img
          src={`${photo.r2_key}?width=1600&format=webp`}
          alt={photo.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        
        {/* 顶部控制栏 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
            <span>返回网格</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Download size={24} />
            <span>下载图片</span>
          </button>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
        >
          <X size={32} />
        </button>
      </div>
    </Dialog>
  );
} 