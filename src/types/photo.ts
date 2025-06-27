export interface Photo {
  id: number;
  filename: string;
  r2_key: string;
  thumb_key: string;
  dominant_rgb: string;
  hue: number;
  saturation: number;
  lightness: number;
  is_bw: boolean;
  palette: string[];
} 