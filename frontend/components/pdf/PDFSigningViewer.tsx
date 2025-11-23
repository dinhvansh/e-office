'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import SignatureCanvas from '@/components/signature/SignatureCanvas';

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
  completedFieldIds?: number[]; // Fields that have been signed
  guidedMode?: boolean; // Whether in guided mode
  onFieldComplete?: (fieldId: number, signature: string) => void; // Callback when field is signed
}

export default function PDFSigningViewer({
  pdfUrl,
  fields,
  signerId,
  onFieldClick,
  signatureData,
  currentFieldId,
  completedFieldIds = [],
  guidedMode = false,
  onFieldComplete,
}: PDFSigningViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFieldId, setActiveFieldId] = useState<number | null>(null);
  const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>({});

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

  const handleFieldClick = (field: SignatureField) => {
    if (field.type === 'signature') {
      setActiveFieldId(field.id);
    } else {
      onFieldClick(field);
    }
  };

  const handleClearSignature = () => {
    canvasRef.current?.clear();
  };

  const handleDoneSignature = () => {
    if (canvasRef.current?.isEmpty()) {
      return;
    }
    
    const signatureData = canvasRef.current?.toDataURL();
    const fieldId = activeFieldId!;
    
    setFieldSignatures({
      ...fieldSignatures,
      [fieldId]: signatureData,
    });
    setActiveFieldId(null);
    
    // In guided mode, notify parent component
    if (guidedMode && onFieldComplete) {
      onFieldComplete(fieldId, signatureData);
    } else {
      onFieldClick({ id: fieldId } as SignatureField);
    }
  };

  const handleCancelSignature = () => {
    setActiveFieldId(null);
  };

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
              const isActive = field.id === activeFieldId;
              const hasSigned = fieldSignatures[field.id] || completedFieldIds.includes(field.id);
              const isSignatureField = field.type === 'signature';
              const isCurrent = guidedMode && field.id === currentFieldId;
              const isDisabled = guidedMode && !isCurrent && !hasSigned;

              return (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  className={`absolute border-2 cursor-pointer pointer-events-auto transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-100 shadow-2xl z-30 ring-4 ring-blue-300 animate-pulse'
                      : isActive
                      ? 'border-blue-500 bg-white shadow-lg z-20'
                      : hasSigned
                      ? 'border-green-500 bg-green-50'
                      : isDisabled
                      ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 hover:shadow-md'
                  }`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: isActive ? `${field.width * 1.2}%` : `${field.width}%`,
                    height: isActive ? `${field.height * 2}%` : `${field.height}%`,
                  }}
                  onClick={() => !isActive && !isDisabled && handleFieldClick(field)}
                  title={
                    isCurrent
                      ? '👉 Ký vào đây (Bước hiện tại)'
                      : isDisabled
                      ? '⏳ Chờ đến lượt'
                      : field.label || 'Click to sign'
                  }
                >
                  {/* Active Signing Mode */}
                  {isActive && isSignatureField ? (
                    <div className="flex flex-col h-full p-2">
                      <div className="text-xs font-semibold mb-1 text-gray-700">
                        {field.label || 'Chữ ký'}
                      </div>
                      <div className="flex-1 border border-gray-300 rounded">
                        <SignatureCanvas ref={canvasRef} width={200} height={80} />
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClearSignature}
                          className="flex-1 text-xs h-7"
                        >
                          Xóa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelSignature}
                          className="flex-1 text-xs h-7"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDoneSignature}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                        >
                          ✓ Xong
                        </Button>
                      </div>
                    </div>
                  ) : hasSigned ? (
                    /* Signed Field */
                    <div className="relative h-full">
                      <img
                        src={fieldSignatures[field.id]}
                        alt="Signature"
                        className="w-full h-full object-contain p-1"
                      />
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                        ✓
                      </div>
                    </div>
                  ) : (
                    /* Empty Field */
                    <div className="flex items-center justify-center h-full text-xs font-semibold text-gray-700">
                      {field.label || '✍️ Click to sign'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {pageFields.length > 0 && (
        <div className={`p-4 border-t ${guidedMode ? 'bg-blue-100 border-blue-300' : 'bg-blue-50 border-blue-200'}`}>
          {guidedMode ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-900 font-semibold">
                🎯 Chế độ hướng dẫn: Ký vào ô màu xanh nhấp nháy
              </p>
              <span className="text-xs text-blue-700 bg-white px-3 py-1 rounded-full">
                {completedFieldIds.length} / {myFields.length} hoàn thành
              </span>
            </div>
          ) : (
            <p className="text-sm text-blue-800">
              💡 Click vào các ô màu vàng để ký tài liệu ({pageFields.length} vị trí cần ký)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
