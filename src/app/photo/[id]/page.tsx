'use client';
export const runtime = 'edge';

import { photos as mockPhotos } from '../../../lib/mockData';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect } from 'react';

const mockTags = [
  ['摄影', '黑白'],
  ['人体艺术', '摄影'],
  ['黑白', '人体艺术'],
  ['摄影'],
  ['黑白'],
  ['人体艺术'],
];
const mockDesc = [
  '一幅极具张力的黑白摄影作品，展现了光影与人体的完美结合。',
  '人体艺术与摄影的碰撞，捕捉瞬间的美感与力量。',
  '黑白色调下的人体线条，极致的艺术表现。',
  '摄影师用镜头记录下独特的瞬间，展现出人与环境的和谐。',
  '极简黑白，纯粹的视觉冲击力。',
  '人体与光影的交融，艺术与现实的对话。',
];

const getPhotoUrl = (filename: string, r2_key: string) => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_R2_BASE && window.location.hostname !== 'localhost') {
    // 生产环境用 R2 桶
    const baseUrl = process.env.NEXT_PUBLIC_R2_BASE;
    
    // 规范化 r2_key - 移除开头的斜杠（如果有）
    const normalizedKey = r2_key.startsWith('/') ? r2_key.substring(1) : r2_key;
    
    // 规范化基础URL - 确保末尾有斜杠
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    // 将它们组合起来，确保中间有正确的分隔符
    return `${normalizedBase}${normalizedKey}`;
  }
  // 开发环境用 public 目录
  return `/${r2_key}`;
};

export default function PhotoDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  // 当用户按下 "s" 键时，返回上一页
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') {
        router.back();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [router]);
  const photo = mockPhotos.find((p: any) => String(p.id) === params.id);
  if (!photo) return <div className="p-8 text-xl">图片不存在</div>;
  // mock 标签和描述
  const tagIdx = Number(params.id) % mockTags.length;
  const descIdx = Number(params.id) % mockDesc.length;
  const tags = mockTags[tagIdx];
  const desc = mockDesc[descIdx];

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#faf9f6] px-4 lg:px-8">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12 max-w-screen-lg w-full">
        {/* 图片 */}
        <img
          src={`${getPhotoUrl(photo.filename, photo.r2_key)}?width=800&format=webp`}
          alt={photo.filename}
          className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-[600px] rounded-xl shadow-2xl bg-white object-contain"
        />
        {/* 信息区域 */}
        <div className="flex flex-col justify-center w-full lg:min-w-[320px] text-center lg:text-left">
          <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700">{tag}</span>
            ))}
          </div>
          <p className="mb-6 text-gray-700 leading-relaxed px-2 lg:px-0">{desc}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors min-w-[140px]"
              onClick={() => router.back()}
            >
              Back to Grid
            </button>
            <a
              href={`${getPhotoUrl(photo.filename, photo.r2_key)}?width=1600&format=webp`}
              download={photo.filename}
              className="inline-flex items-center justify-center px-6 py-2 rounded-full border border-black text-black text-sm font-medium hover:bg-black hover:text-white transition-colors min-w-[140px]"
            >
              Download Image
            </a>
          </div>
          {/* 键盘快捷键提示 */}
          <p className="mt-2 text-xs text-gray-500 italic select-none sm:ml-[2px]">Press "s" to close</p>
        </div>
      </div>
      {/* 右上角关闭按钮 */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 text-gray-600 hover:text-black transition-colors"
        aria-label="关闭"
      >
        <X size={28} />
      </button>
    </div>
  );
} 