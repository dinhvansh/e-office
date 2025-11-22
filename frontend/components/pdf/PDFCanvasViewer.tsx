'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { usePDFUrl } from '@/hooks/usePDFUrl';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Field {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  assigned_signer_id?: number | null;
  signer_name?: string;
}

interface Signer {
  id: number;
  name: string;
  email: string;
  signing_order: number;
}

interface PDFCanvasViewerProps {
  fileUrl: string;
  token: string;
  fields: Field[];
  signers: Signer[];
  selectedSignerId?: number;
  selectedFieldType?: 'signature' | 'text' | 'date' | 'checkbox';
  onFieldAdd?: (field: Omit<Field, 'id'>) => void;
  onFieldMove?: (id: string, x: number, y: number) => void;
}

export function PDFCanvasViewer({ 
  fileUrl, 
  token, 
  fields, 
  signers, 
  selectedSignerId, 
  selectedFieldType = 'signature',
  onFieldAdd, 
  onFieldMove 
}: PDFCanvasViewerProps) {
  const { blobUrl, loading, error } = usePDFUrl(fileUrl, token);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [draggingField, setDraggingField] = useState<string | null>(null);

  // Load PDF
  useEffect(() => {
    if (!blobUrl) return;

    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(blobUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };

    loadPDF();
  }, [blobUrl]);

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    };

    renderPage();
  }, [pdf, pageNum, scale]);

  // Handle canvas click to add field
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedSignerId) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add field at clicked position with selected signer
    const signer = signers.find(s => s.id === selectedSignerId);
    onFieldAdd?.({
      type: selectedFieldType,
      x,
      y,
      width: selectedFieldType === 'signature' ? 200 : selectedFieldType === 'checkbox' ? 30 : 150,
      height: selectedFieldType === 'signature' ? 80 : selectedFieldType === 'checkbox' ? 30 : 40,
      page: pageNum,
      assigned_signer_id: selectedSignerId,
      signer_name: signer?.name,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          <p className="font-semibold">Failed to load PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNum(Math.max(1, pageNum - 1))}
            disabled={pageNum <= 1}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm">
            Page {pageNum} / {numPages}
          </span>
          <button
            onClick={() => setPageNum(Math.min(numPages, pageNum + 1))}
            disabled={pageNum >= numPages}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.25))}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
          >
            -
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(3, scale + 0.25))}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto bg-white shadow-lg relative">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-crosshair"
          />
          
          {/* Render fields overlay */}
          {fields
            .filter(f => f.page === pageNum)
            .map(field => {
              // Color by signer
              const colors = [
                { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:border-blue-600 hover:bg-blue-200' },
                { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:border-green-600 hover:bg-green-200' },
                { border: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:border-purple-600 hover:bg-purple-200' },
                { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:border-orange-600 hover:bg-orange-200' },
              ];
              const signer = signers.find(s => s.id === field.assigned_signer_id);
              const colorIndex = signer ? (signer.signing_order - 1) % colors.length : 0;
              const color = colors[colorIndex];
              
              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingField(field.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={(e) => {
                    if (!canvasRef.current) return;
                    const rect = canvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
                      onFieldMove?.(field.id, x, y);
                    }
                    setDraggingField(null);
                  }}
                  className={`absolute border-2 ${color.border} ${color.bg} bg-opacity-30 cursor-move ${color.hover}`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                  }}
                >
                  <div className={`text-xs ${color.text} p-1 font-semibold`}>
                    {field.type}
                    {field.signer_name && (
                      <div className="text-xs opacity-75 truncate">{field.signer_name}</div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
