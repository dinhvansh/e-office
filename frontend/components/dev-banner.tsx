'use client';

import { useState } from 'react';
import { X, Info, TestTube } from 'lucide-react';
import { Button } from './ui/button';

export function DevBanner() {
  const [isVisible, setIsVisible] = useState(true);

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;
  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              <span className="font-medium">Development Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Môi trường phát triển - Không sử dụng trong production</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="text-white hover:bg-white/20 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
