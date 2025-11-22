'use client';

import { usePDFUrl } from '@/hooks/usePDFUrl';

interface PDFViewerProps {
  fileUrl: string;
  token: string;
  onLoadSuccess?: (numPages: number) => void;
}

export function PDFViewer({ fileUrl, token }: PDFViewerProps) {
  const { blobUrl, loading, error } = usePDFUrl(fileUrl, token);

  return (
    <div className="flex flex-col h-full">
      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-gray-100">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading PDF...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">
              <p className="font-semibold">Failed to load PDF</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {blobUrl && !error && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        )}
      </div>
    </div>
  );
}
