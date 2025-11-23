'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SignatureField {
  id: number;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  assigned_signer_id?: number;
}

interface PDFSigningViewerProps {
  pdfUrl: string;
  fields: SignatureField[];
  signerId: number;
  onFieldClick: (field: SignatureField) => void;
  signatureData?: string; // Base64 signature to overlay
  currentFieldId?: number; // Currently selected field
}

export default function PDFSigningViewer({
  pdfUrl,
  fields,
  signerId,
  onFieldClick,
  signatureData,
  currentFieldId,
}: PDFSigningViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter fields for current signer
  const myFields = fields.filter(
    (f) => !f.assigned_signer_id || f.assigned_signer_id === signerId
  );

  // Get fields for current page
  const pageFields = myFields.filter((f) => f.page === currentPage);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4"
        style={{ position: 'relative' }}
      >
        <div
          className="relative mx-auto bg-white shadow-lg"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s',
          }}
        >
          {/* PDF Iframe */}
          <iframe
            src={`${pdfUrl}#page=${currentPage}`}
            className="w-full"
            style={{ height: '842px', border: 'none' }} // A4 height
            title="PDF Document"
            onLoad={(e) => {
              // Try to get total pages (may not work with iframe)
              // For now, assume 1 page
              setTotalPages(1);
            }}
          />

          {/* Signature Fields Overlay */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {pageFields.map((field) => {
              const isSelected = field.id === currentFieldId;
              const hasSignature = signatureData && isSelected;

              return (
                <div
                  key={field.id}
                  className={`absolute border-2 cursor-pointer pointer-events-auto transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : hasSignature
                      ? 'border-green-500 bg-green-50'
                      : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                  }`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  onClick={() => onFieldClick(field)}
                  title={field.label || 'Click to sign'}
                >
                  {/* Field Label */}
                  {!hasSignature && (
                    <div className="flex items-center justify-center h-full text-xs font-semibold text-gray-700">
                      {field.label || '✍️ Click to sign'}
                    </div>
                  )}

                  {/* Signature Preview */}
                  {hasSignature && signatureData && (
                    <img
                      src={signatureData}
                      alt="Signature"
                      className="w-full h-full object-contain p-1"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {pageFields.length > 0 && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            💡 Click vào các ô màu vàng để ký tài liệu ({pageFields.length} vị trí cần ký)
          </p>
        </div>
      )}
    </div>
  );
}
