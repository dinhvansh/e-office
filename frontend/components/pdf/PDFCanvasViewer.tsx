'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { usePDFUrl } from '@/hooks/usePDFUrl';
import { clampNormalizedBox, pctToPx, pxToPct } from '@/lib/coordinate.helper';
import { getResolvedFieldLabel } from '@/lib/sign-field.helper';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Field {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  pageIndex: number;
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
  onFieldMove?: (id: string, xPct: number, yPct: number) => void;
  onFieldResize?: (id: string, widthPct: number, heightPct: number) => void;
}

const DEFAULT_FIELD_SIZE_PX: Record<Field['type'], { width: number; height: number }> = {
  signature: { width: 120, height: 50 },
  text: { width: 100, height: 30 },
  date: { width: 100, height: 30 },
  checkbox: { width: 25, height: 25 },
};

export function PDFCanvasViewer({
  fileUrl,
  token,
  fields,
  signers,
  selectedSignerId,
  selectedFieldType = 'signature',
  onFieldAdd,
  onFieldMove,
  onFieldResize,
}: PDFCanvasViewerProps) {
  const { blobUrl, loading, error } = usePDFUrl(fileUrl, token);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { current: viewerId } = useRef(`pdf-canvas-viewer-${Math.random().toString(36).slice(2)}`);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [pageSizePx, setPageSizePx] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startPointerX: number;
    startPointerY: number;
    startWidthPct: number;
    startHeightPct: number;
  } | null>(null);

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

  useEffect(() => {
    if (!pdf || !containerRef.current) return;

    const fitPage = async () => {
      const page = await pdf.getPage(pageNum);
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
  }, [pdf, pageNum]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setPageSizePx({ width: viewport.width, height: viewport.height });

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    };

    renderPage();
  }, [pdf, pageNum, scale]);

  useEffect(() => {
    if (!dragState || !canvasRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const pageRect = canvasRef.current!.getBoundingClientRect();
      const activeField = fields.find((field) => field.id === dragState.id);
      if (!activeField) return;

      const activeFieldPx = pctToPx(activeField, pageRect.width, pageRect.height);
      const nextBox = pxToPct(
        {
          left: event.clientX - pageRect.left - dragState.offsetX,
          top: event.clientY - pageRect.top - dragState.offsetY,
          width: activeFieldPx.width,
          height: activeFieldPx.height,
        },
        pageRect.width,
        pageRect.height
      );

      onFieldMove?.(dragState.id, nextBox.xPct, nextBox.yPct);
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, fields, onFieldMove]);

  useEffect(() => {
    if (!resizeState || !canvasRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const pageRect = canvasRef.current!.getBoundingClientRect();
      const activeField = fields.find((field) => field.id === resizeState.id);
      if (!activeField) return;

      const deltaXPx = event.clientX - resizeState.startPointerX;
      const deltaYPx = event.clientY - resizeState.startPointerY;

      const candidate = clampNormalizedBox({
        xPct: activeField.xPct,
        yPct: activeField.yPct,
        widthPct: resizeState.startWidthPct + deltaXPx / pageRect.width,
        heightPct: resizeState.startHeightPct + deltaYPx / pageRect.height,
      });

      onFieldResize?.(resizeState.id, candidate.widthPct, candidate.heightPct);
    };

    const handleMouseUp = () => {
      setResizeState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fields, onFieldResize, resizeState]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedSignerId) return;

    const pageRect = canvasRef.current.getBoundingClientRect();
    const pointerLeft = event.clientX - pageRect.left;
    const pointerTop = event.clientY - pageRect.top;
    const defaultSize = DEFAULT_FIELD_SIZE_PX[selectedFieldType];

    const normalized = pxToPct(
      {
        left: pointerLeft,
        top: pointerTop,
        width: defaultSize.width,
        height: defaultSize.height,
      },
      pageRect.width,
      pageRect.height
    );

    const signer = signers.find((item) => item.id === selectedSignerId);
    onFieldAdd?.({
      type: selectedFieldType,
      pageIndex: pageNum - 1,
      xPct: normalized.xPct,
      yPct: normalized.yPct,
      widthPct: normalized.widthPct,
      heightPct: normalized.heightPct,
      assigned_signer_id: selectedSignerId,
      signer_name: signer?.name,
    });
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-500">Loading PDF...</div>;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-500">
          <p className="font-semibold">Failed to load PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const pageFields = fields.filter((field) => field.pageIndex === pageNum - 1);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNum(Math.max(1, pageNum - 1))}
            disabled={pageNum <= 1}
            className="rounded border bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm">Page {pageNum} / {numPages}</span>
          <button
            onClick={() => setPageNum(Math.min(numPages, pageNum + 1))}
            disabled={pageNum >= numPages}
            className="rounded border bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(Math.max(0.5, scale - 0.25))} className="rounded border bg-white px-3 py-1 hover:bg-gray-50">
            -
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(3, scale + 0.25))} className="rounded border bg-white px-3 py-1 hover:bg-gray-50">
            +
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-4">
        <div
          className="relative mx-auto bg-white shadow-lg"
          style={{ width: pageSizePx.width ? `${pageSizePx.width}px` : 'fit-content' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="block cursor-crosshair"
          />

          <div
            id={viewerId}
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: `${pageSizePx.width}px`, height: `${pageSizePx.height}px` }}
          >
            {pageFields.map((field) => {
              const colors = [
                { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:border-blue-600 hover:bg-blue-200' },
                { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:border-green-600 hover:bg-green-200' },
                { border: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:border-purple-600 hover:bg-purple-200' },
                { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:border-orange-600 hover:bg-orange-200' },
              ];

              const signer = signers.find((item) => item.id === field.assigned_signer_id);
              const colorIndex = signer ? (signer.signing_order - 1) % colors.length : 0;
              const color = colors[colorIndex];
              const boxPx = pctToPx(field, pageSizePx.width, pageSizePx.height);

              return (
                <div
                  key={field.id}
                  className={`pointer-events-auto group absolute rounded-md border-2 ${color.border} ${color.bg} ${color.hover} cursor-move bg-opacity-30 transition-all duration-75`}
                  style={{
                    left: `${boxPx.left}px`,
                    top: `${boxPx.top}px`,
                    width: `${boxPx.width}px`,
                    height: `${boxPx.height}px`,
                  }}
                  onMouseDown={(event) => {
                    if ((event.target as HTMLElement).dataset.resizeHandle === 'true') {
                      return;
                    }

                    event.preventDefault();
                    setDragState({
                      id: field.id,
                      offsetX: event.clientX - event.currentTarget.getBoundingClientRect().left,
                      offsetY: event.clientY - event.currentTarget.getBoundingClientRect().top,
                    });
                  }}
                >
                  <div className={`p-1 text-xs font-semibold ${color.text}`}>
                    {getResolvedFieldLabel(field)}
                    {field.signer_name && <div className="truncate text-xs opacity-75">{field.signer_name}</div>}
                  </div>

                  <div
                    data-resize-handle="true"
                    className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-blue-600 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:bg-blue-700"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setResizeState({
                        id: field.id,
                        startPointerX: event.clientX,
                        startPointerY: event.clientY,
                        startWidthPct: field.widthPct,
                        startHeightPct: field.heightPct,
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
