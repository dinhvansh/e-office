'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import PDFCoreViewer from '@/components/pdf/PDFCoreViewer';
import { usePDFUrl } from '@/hooks/usePDFUrl';
import { clampNormalizedBox, pctToPx, pxToPct } from '@/lib/coordinate.helper';
import { getResolvedFieldLabel } from '@/lib/sign-field.helper';

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
  onFieldDelete?: (id: string) => void;
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
  onFieldDelete,
}: PDFCanvasViewerProps) {
  const { blobUrl, loading, error } = usePDFUrl(fileUrl, token);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startPointerX: number;
    startPointerY: number;
    startWidthPct: number;
    startHeightPct: number;
  } | null>(null);

  const colors = useMemo(
    () => [
      { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:border-blue-600 hover:bg-blue-200' },
      { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:border-green-600 hover:bg-green-200' },
      { border: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:border-purple-600 hover:bg-purple-200' },
      { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:border-orange-600 hover:bg-orange-200' },
    ],
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedFieldId || !onFieldDelete || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      onFieldDelete(selectedFieldId);
      setSelectedFieldId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFieldDelete, selectedFieldId]);

  return (
    <PDFCoreViewer
      pdfUrl={blobUrl}
      loading={loading}
      error={error}
      loadingLabel="Đang tải PDF..."
      errorTitle="Không thể tải PDF"
      backgroundClassName="bg-gray-100"
      toolbarClassName="border-b bg-gray-50"
      canvasCursor={selectedSignerId ? 'crosshair' : 'default'}
      onCanvasClick={({ event, pageNumber, pageWidth, pageHeight }) => {
        if (!selectedSignerId) return;
        if (pageWidth <= 0 || pageHeight <= 0) return;

        const pageRect = event.currentTarget.getBoundingClientRect();
        if (pageRect.width <= 0 || pageRect.height <= 0) return;
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
          pageIndex: pageNumber - 1,
          xPct: normalized.xPct,
          yPct: normalized.yPct,
          widthPct: normalized.widthPct,
          heightPct: normalized.heightPct,
          assigned_signer_id: selectedSignerId,
          signer_name: signer?.name,
        });
      }}
      renderOverlay={({ pageNumber, pageWidth, pageHeight }) => {
        const pageFields = fields.filter((field) => field.pageIndex === pageNumber - 1);

        return (
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
            {pageFields.map((field) => {
              const signer = signers.find((item) => item.id === field.assigned_signer_id);
              const colorIndex = signer ? (signer.signing_order - 1) % colors.length : 0;
              const color = colors[colorIndex];
              const boxPx = pctToPx(field, pageWidth, pageHeight);

              return (
                <div
                  key={field.id}
                  data-sign-field-id={field.id}
                  className={`pointer-events-auto group absolute rounded-md border-2 ${color.border} ${color.bg} ${color.hover} ${onFieldMove ? 'cursor-move' : 'cursor-default'} bg-opacity-30 transition-all duration-75 ${selectedFieldId === field.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                  style={{
                    left: `${boxPx.left}px`,
                    top: `${boxPx.top}px`,
                    width: `${boxPx.width}px`,
                    height: `${boxPx.height}px`,
                  }}
                  onMouseDown={(event) => {
                    if (!onFieldMove) return;
                    if ((event.target as HTMLElement).dataset.resizeHandle === 'true') {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedFieldId(field.id);
                    const fieldElement = event.currentTarget;
                    const pageElement = fieldElement.parentElement;
                    if (!pageElement) return;

                    const fieldRect = fieldElement.getBoundingClientRect();
                    const offsetX = event.clientX - fieldRect.left;
                    const offsetY = event.clientY - fieldRect.top;
                    setDragState({
                      id: field.id,
                      offsetX,
                      offsetY,
                    });

                    const moveHandler = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      const pageRect = pageElement.getBoundingClientRect();
                      const nextBox = pxToPct(
                        {
                          left: moveEvent.clientX - pageRect.left - offsetX,
                          top: moveEvent.clientY - pageRect.top - offsetY,
                          width: boxPx.width,
                          height: boxPx.height,
                        },
                        pageWidth,
                        pageHeight
                      );

                      onFieldMove?.(field.id, nextBox.xPct, nextBox.yPct);
                    };

                    const upHandler = () => {
                      document.removeEventListener('mousemove', moveHandler);
                      document.removeEventListener('mouseup', upHandler);
                      setDragState(null);
                    };

                    document.addEventListener('mousemove', moveHandler);
                    document.addEventListener('mouseup', upHandler);
                  }}
                >
                  <div className={`p-1 text-xs font-semibold ${color.text}`}>
                    {getResolvedFieldLabel(field)}
                    {field.signer_name ? <div className="truncate text-xs opacity-75">{field.signer_name}</div> : null}
                  </div>

                  {onFieldDelete ? <button
                    type="button"
                    aria-label={`Xóa ${getResolvedFieldLabel(field)}`}
                    title="Xóa vị trí ký"
                    className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow transition-opacity ${selectedFieldId === field.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onFieldDelete?.(field.id);
                      setSelectedFieldId(null);
                    }}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button> : null}

                  {onFieldResize ? <div
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

                      const moveHandler = (moveEvent: MouseEvent) => {
                        const candidate = clampNormalizedBox({
                          xPct: field.xPct,
                          yPct: field.yPct,
                          widthPct: field.widthPct + (moveEvent.clientX - event.clientX) / pageWidth,
                          heightPct: field.heightPct + (moveEvent.clientY - event.clientY) / pageHeight,
                        });
                        onFieldResize?.(field.id, candidate.widthPct, candidate.heightPct);
                      };

                      const upHandler = () => {
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', upHandler);
                        setResizeState(null);
                      };

                      document.addEventListener('mousemove', moveHandler);
                      document.addEventListener('mouseup', upHandler);
                    }}
                  /> : null}
                </div>
              );
            })}
          </div>
        );
      }}
    />
  );
}
