'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import SignatureCanvas from '@/components/signature/SignatureCanvas';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';
import { pctToPx } from '@/lib/coordinate.helper';
import { getResolvedFieldLabel, getResolvedFieldPlaceholder } from '@/lib/sign-field.helper';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface SignatureField {
  id: number;
  type: string;
  pageIndex: number;
  page?: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
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
  existingFieldValues?: Record<number, string>; // Existing field values from parent
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
  existingFieldValues = {},
}: PDFSigningViewerProps) {
  console.log('🔄 PDFSigningViewer render - guidedMode:', guidedMode);
  console.log('🔄 currentFieldId:', currentFieldId);
  console.log('🔄 completedFieldIds:', completedFieldIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<any>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFieldId, setActiveFieldId] = useState<number | null>(null);
  const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>(existingFieldValues);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

  // Sync fieldSignatures with existingFieldValues from parent
  useEffect(() => {
    console.log('🔄 Syncing existingFieldValues:', existingFieldValues);
    setFieldSignatures(existingFieldValues);
  }, [existingFieldValues]);

  // Initialize SignaturePad when canvas is active
  useEffect(() => {
    if (!canvasRef.current || !activeFieldId) return;

    const initSignaturePad = async () => {
      const SignaturePad = (await import('signature_pad')).default;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 0)',
      });
      
      signaturePadRef.current = pad;
    };
    
    initSignaturePad();
    
    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [activeFieldId]);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        console.log('📄 PDF loaded:', pdf.numPages, 'pages');
      } catch (error) {
        console.error('❌ Error loading PDF:', error);
      }
    };

    loadPDF();
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const fitPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const container = containerRef.current;
      if (!container) return;

      const availableWidth = Math.max(280, container.clientWidth - 16);
      const availableHeight = Math.max(320, container.clientHeight - 16);
      const fitWidthScale = availableWidth / viewport.width;
      const fitHeightScale = availableHeight / viewport.height;
      const prefersLandscape = viewport.width > viewport.height;
      const fitScale = prefersLandscape ? Math.min(fitWidthScale, fitHeightScale) : fitWidthScale;
      setScale(Math.max(0.85, Math.min(2.5, fitScale)));
    };

    fitPage();
  }, [pdfDoc, currentPage]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || pageRendering) return;

    const renderPage = async () => {
      setPageRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = pdfCanvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Calculate viewport
        const viewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Store dimensions for field positioning
        setPdfDimensions({ width: viewport.width, height: viewport.height });

        // Render PDF page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        console.log('✅ Page rendered:', currentPage, 'dimensions:', viewport.width, 'x', viewport.height);
      } catch (error) {
        console.error('❌ Error rendering page:', error);
      } finally {
        setPageRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Filter fields for current signer
  const myFields = fields.filter(
    (f) => !f.assigned_signer_id || f.assigned_signer_id === signerId
  );

  // Get fields for current page
  const pageFields = myFields.filter((f) => f.pageIndex === currentPage - 1);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleFieldClick = (field: SignatureField) => {
    console.log('🎯 handleFieldClick called:', field.id, 'type:', field.type);
    console.log('🎯 Current state:', { activeFieldId, guidedMode, currentFieldId });
    
    // Always set active for any field type
    setActiveFieldId(field.id);
  };

  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleDoneSignature = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      console.log('❌ Canvas is empty');
      return;
    }
    
    const signatureData = signaturePadRef.current.toDataURL();
    const fieldId = activeFieldId!;
    
    console.log('✍️ Signature done for field:', fieldId);
    console.log('🎯 Guided mode:', guidedMode);
    console.log('📞 onFieldComplete exists:', !!onFieldComplete);
    
    setFieldSignatures({
      ...fieldSignatures,
      [fieldId]: signatureData,
    });
    setActiveFieldId(null);
    
    // Notify parent component
    if (onFieldComplete) {
      console.log('📞 Calling onFieldComplete');
      onFieldComplete(fieldId, signatureData);
    }
    
    // Also call onFieldClick for backward compatibility
    if (!guidedMode) {
      console.log('📞 Calling onFieldClick');
      onFieldClick({ id: fieldId } as SignatureField);
    }
  };

  const handleCancelSignature = () => {
    setActiveFieldId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-100 p-3 sm:p-4">
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
        className="flex-1 overflow-auto bg-gray-200 p-2 sm:p-4"
        style={{ position: 'relative' }}
      >
        <div
          className="relative mx-auto bg-white shadow-lg"
          style={{
            width: 'fit-content',
          }}
        >
          {/* PDF Canvas */}
          <canvas
            ref={pdfCanvasRef}
            className="block"
            style={{ maxWidth: '100%', height: 'auto' }}
          />

          {/* Signature Fields Overlay */}
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{ 
              width: `${pdfDimensions.width}px`,
              height: `${pdfDimensions.height}px`,
              zIndex: 10 
            }}
          >
            {pageFields.map((field) => {
              const isActive = field.id === activeFieldId;
              const hasSigned = (field.id in fieldSignatures) || completedFieldIds.includes(field.id);
              const isSignatureField = field.type === 'signature';
              const isCurrent = guidedMode && field.id === currentFieldId;
              const isDisabled = guidedMode && !isCurrent && !hasSigned;
              const boxPx = pctToPx(field, pdfDimensions.width, pdfDimensions.height);
              
              // Debug log for each field
              if (guidedMode) {
                console.log(`🔍 Field ${field.id}:`, {
                  isCurrent,
                  isDisabled,
                  isActive,
                  hasSigned,
                  currentFieldId,
                  label: field.label
                });
              }

              return (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  className={`absolute border-2 cursor-pointer pointer-events-auto transition-all ${
                    isCurrent && !isActive
                      ? 'border-blue-600 bg-white shadow-2xl z-30 ring-4 ring-blue-300 animate-pulse'
                      : isActive
                      ? 'border-blue-500 bg-white shadow-lg z-20'
                      : isCurrent && isActive
                      ? 'border-blue-600 bg-white shadow-2xl z-30 ring-4 ring-blue-300'
                      : hasSigned
                      ? 'border-green-500 bg-green-50'
                      : isDisabled
                      ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 hover:shadow-md'
                  }`}
                  style={{
                    left: `${boxPx.left}px`,
                    top: `${boxPx.top}px`,
                    width: `${boxPx.width}px`,
                    height: `${boxPx.height}px`,
                  }}
                  onClick={() => {
                    console.log('🖱️ Field clicked:', field.id, { 
                      isActive, 
                      isDisabled, 
                      isCurrent, 
                      guidedMode,
                      currentFieldId,
                      activeFieldId,
                      hasSigned 
                    });
                    
                    if (guidedMode) {
                      // In guided mode, only allow clicking current field
                      if (isCurrent && !isActive) {
                        console.log('✅ Guided mode: Activating current field');
                        handleFieldClick(field);
                      } else if (!isCurrent) {
                        console.log('⏳ Guided mode: Not current field, ignoring');
                      } else if (isActive) {
                        console.log('🔄 Guided mode: Field already active, ignoring click');
                        // Don't close - user might be drawing signature
                      }
                    } else {
                      // Normal mode
                      if (!isActive && !isDisabled) {
                        console.log('✅ Normal mode: Activating field');
                        handleFieldClick(field);
                      } else if (isDisabled) {
                        console.log('⏳ Normal mode: Field is disabled');
                      } else if (isActive) {
                        console.log('🔄 Normal mode: Field already active, ignoring click');
                        // Don't close - user might be drawing signature
                      }
                    }
                  }}
                  title={
                    isCurrent
                      ? '👉 Ký vào đây (Bước hiện tại)'
                      : isDisabled
                      ? '⏳ Chờ đến lượt'
                      : getResolvedFieldLabel(field)
                  }
                >
                  {/* Active Signing Mode */}
                  {isActive ? (
                    field.type === 'signature' ? (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
                          <div className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                            ✍️ {getResolvedFieldLabel(field)}
                          </div>
                          <div className="mb-3 overflow-hidden rounded-lg border-2 border-blue-400 bg-white">
                            <canvas
                              ref={canvasRef}
                              className="w-full h-60 cursor-crosshair"
                              style={{ touchAction: 'none' }}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mb-4 text-center">
                            Vẽ chữ ký của bạn trong khung trên
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <Button
                              variant="outline"
                              onClick={handleClearSignature}
                              className="h-11"
                            >
                              🗑️ Xóa
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelSignature}
                              className="h-11"
                            >
                              ❌ Hủy
                            </Button>
                            <Button
                              onClick={handleDoneSignature}
                              className="bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-base"
                            >
                              ✓ Xong
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : field.type === 'date' ? (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                          <div className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                            📅 {getResolvedFieldLabel(field)}
                          </div>
                          <input
                            type="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="mb-3 w-full rounded-lg border-2 border-blue-400 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                              const dateValue = new Date(e.target.value).toLocaleDateString('vi-VN');
                              setFieldSignatures({
                                ...fieldSignatures,
                                [field.id]: dateValue,
                              });
                            }}
                          />
                          <p className="text-sm text-gray-600 mb-4 text-center">
                            Chọn ngày ký tài liệu
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={handleCancelSignature}
                              className="flex-1 h-11"
                            >
                              ❌ Hủy
                            </Button>
                            <Button
                              onClick={() => {
                                const dateValue = fieldSignatures[field.id] || new Date().toLocaleDateString('vi-VN');
                                if (!fieldSignatures[field.id]) {
                                  setFieldSignatures({
                                    ...fieldSignatures,
                                    [field.id]: dateValue,
                                  });
                                }
                                
                                setActiveFieldId(null);
                                
                                // Always call onFieldComplete if available (not just in guided mode)
                                if (onFieldComplete) {
                                  onFieldComplete(field.id, dateValue);
                                }
                              }}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-base"
                            >
                              ✓ Xong
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                          <div className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                            ✏️ {getResolvedFieldLabel(field)}
                          </div>
                          <input
                            type="text"
                            placeholder={getResolvedFieldPlaceholder(field)}
                            defaultValue={fieldSignatures[field.id] || existingFieldValues?.[field.id] || ''}
                            className="mb-3 w-full rounded-lg border-2 border-blue-400 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                              setFieldSignatures({
                                ...fieldSignatures,
                                [field.id]: e.target.value,
                              });
                            }}
                          />
                          <p className="text-sm text-gray-600 mb-4 text-center">
                            Nhập thông tin vào trường này
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={handleCancelSignature}
                              className="flex-1 h-11"
                            >
                              ❌ Hủy
                            </Button>
                            <Button
                              onClick={() => {
                                const textValue = fieldSignatures[field.id] || '';
                                if (!textValue || textValue.trim() === '') {
                                  toast.error('Vui lòng nhập nội dung');
                                  return;
                                }
                                
                                setActiveFieldId(null);
                                
                                // Always call onFieldComplete if available (not just in guided mode)
                                if (onFieldComplete) {
                                  onFieldComplete(field.id, textValue);
                                }
                              }}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-base"
                            >
                              ✓ Xong
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : hasSigned ? (
                    /* Signed Field */
                    <div className="relative h-full">
                      {field.type === 'signature' ? (
                        <img
                          src={fieldSignatures[field.id]}
                          alt="Signature"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm font-semibold text-gray-800 p-1">
                          {fieldSignatures[field.id]}
                        </div>
                      )}
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
                        ✓
                      </div>
                    </div>
                  ) : (
                    /* Empty Field */
                    <div className="flex items-center justify-center h-full text-xs font-semibold text-gray-700">
                      {getResolvedFieldLabel(field)}
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
