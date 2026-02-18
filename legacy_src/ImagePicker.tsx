
import React, { useState } from 'react';
import { tauriService } from '../services/tauriService';

interface ImagePickerProps {
  currentUrl: string;
  onUpdate: (newUrl: string) => void;
  label?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ currentUrl, onUpdate, label }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const newUrl = await tauriService.processImageUpdate(currentUrl, file);
      onUpdate(newUrl);
    } catch (err) {
      alert('Failed to update image: ' + err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold text-slate-700">{label}</label>}
      <div className="group relative aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 transition-all hover:border-emerald-500/50">
        <img 
          src={currentUrl || 'https://picsum.photos/800/450'} 
          alt="Preview" 
          className="h-full w-full object-cover transition-all group-hover:scale-105 group-hover:blur-[2px]"
        />
        
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
          <label className="cursor-pointer bg-white text-slate-900 px-6 py-2 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-transform">
            {isUploading ? 'Processing...' : 'Change Image'}
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={isUploading}
            />
          </label>
          <p className="text-white text-[10px] mt-2 font-medium uppercase tracking-widest opacity-80">
            Safe file handling active
          </p>
        </div>
        
        {isUploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="size-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-mono truncate">
        Current path: {currentUrl}
      </p>
    </div>
  );
};

export default ImagePicker;
