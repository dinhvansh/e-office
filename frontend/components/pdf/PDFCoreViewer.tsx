'use client';

import { ReactNode, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface OverlayContext {
  pageNumber: number;
  totalPages: number;
  pageWidth: number;
  pageHeight: number;
  scale: number;
}

interface CanvasClickContext extends OverlayContext {
  event: ReactMouseEvent<HTMLCanvasElement>;
}

interface PDFCoreViewerProps {
  pdfUrl?: string | null;
  loading?: boolean;
  error?: string | null;
  loadingLabel?: string;
  errorTitle?: string;
  minScale?: number;
  maxScale?: number;
  fitPadding?: number;
  backgroundClassName?: string;
  toolbarClassName?: string;
  enableDragPan?: boolean;
  canvasCursor?: string;
  onCanvasClick?: (context: CanvasClickContext) => void;
  renderOverlay?: (context: OverlayContext) => ReactNode;
}

export default function PDFCoreViewer({
  pdfUrl,
  loading = false,
  error = null,
  loadingLabel = 'Đang tải PDF...',
  errorTitle = 'Không thể tải PDF',
  minScale = 0.35,
  maxScale = 2.5,
  fitPadding = 16,
  backgroundClassName = 'bg-gray-100',
  toolbarClassName = 'border-b bg-gray-50',
  enableDragPan = false,
  canvasCursor = 'default',
  onCanvasClick,
  renderOverlay,
}: PDFCoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderVersionRef = useRef(0);
  const fitFrameRef = useRef<number | null>(null);
  const fitRequestVersionRef = useRef(0);
  const isAutoFitEnabledRef = useRef(true);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(true);
  const [autoFitTick, setAutoFitTick] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const getAvailableWidth = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 280;

    const styles = window.getComputedStyle(container);
    const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight || '0') || 0;
    return Math.max(280, container.clientWidth - paddingLeft - paddingRight - fitPadding);
  }, [fitPadding]);

  useEffect(() => {
    isAutoFitEnabledRef.current = isAutoFitEnabled;
  }, [isAutoFitEnabled]);

  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (loadError) {
        console.error('Error loading PDF document:', loadError);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const triggerAutoFit = () => {
      if (!isAutoFitEnabled) return;
      setAutoFitTick((tick) => tick + 1);
    };

    triggerAutoFit();

    const resizeObserver = new ResizeObserver(() => {
      triggerAutoFit();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', triggerAutoFit);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', triggerAutoFit);
    };
  }, [isAutoFitEnabled]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current || !isAutoFitEnabled) return;

    const requestVersion = ++fitRequestVersionRef.current;

    const fitWidth = async () => {
      const page = await pdfDoc.getPage(currentPage);
      if (!isAutoFitEnabledRef.current || requestVersion !== fitRequestVersionRef.current) return;
      const viewport = page.getViewport({ scale: 1 });
      const availableWidth = getAvailableWidth();
      const fitWidthScale = availableWidth / viewport.width;
      if (!isAutoFitEnabledRef.current || requestVersion !== fitRequestVersionRef.current) return;
      setScale(Math.max(minScale, Math.min(maxScale, fitWidthScale)));
    };

    fitFrameRef.current = requestAnimationFrame(() => {
      fitWidth();
    });

    return () => {
      if (fitFrameRef.current !== null) {
        cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = null;
      }
    };
  }, [autoFitTick, currentPage, getAvailableWidth, isAutoFitEnabled, maxScale, minScale, pdfDoc]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const renderVersion = ++renderVersionRef.current;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.clearRect(0, 0, canvas.width, canvas.height);
        setPageSize({ width: viewport.width, height: viewport.height });
        requestAnimationFrame(() => {
          const rect = canvas.getBoundingClientRect();
          setDisplaySize({ width: rect.width, height: rect.height });
        });

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
        if (renderVersion !== renderVersionRef.current) return;
      } catch (renderError) {
        if ((renderError as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', renderError);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [currentPage, pdfDoc, scale]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const updateDisplaySize = () => {
      const rect = canvas.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    };

    updateDisplaySize();

    const resizeObserver = new ResizeObserver(() => {
      updateDisplaySize();
    });

    resizeObserver.observe(canvas);
    window.addEventListener('resize', updateDisplaySize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDisplaySize);
    };
  }, [currentPage]);

  const overlaySize =
    displaySize.width > 0 && displaySize.height > 0 ? displaySize : pageSize;

  const overlayContext: OverlayContext = {
    pageNumber: currentPage,
    totalPages,
    pageWidth: overlaySize.width,
    pageHeight: overlaySize.height,
    scale,
  };

  const handleZoomIn = () => {
    fitRequestVersionRef.current += 1;
    if (fitFrameRef.current !== null) {
      cancelAnimationFrame(fitFrameRef.current);
      fitFrameRef.current = null;
    }
    setIsAutoFitEnabled(false);
    setScale((current) => Math.min(current + 0.2, 3));
  };

  const handleZoomOut = () => {
    fitRequestVersionRef.current += 1;
    if (fitFrameRef.current !== null) {
      cancelAnimationFrame(fitFrameRef.current);
      fitFrameRef.current = null;
    }
    setIsAutoFitEnabled(false);
    setScale((current) => Math.max(current - 0.2, 0.5));
  };

  const handleFitToWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const availableWidth = getAvailableWidth();
    const fitWidthScale = availableWidth / viewport.width;
    setIsAutoFitEnabled(true);
    setScale(Math.max(minScale, Math.min(maxScale, fitWidthScale)));
  };

  useEffect(() => {
    if (!enableDragPan || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      if (!panStateRef.current) return;
      const deltaX = event.clientX - panStateRef.current.startX;
      const deltaY = event.clientY - panStateRef.current.startY;
      container.scrollLeft = panStateRef.current.scrollLeft - deltaX;
      container.scrollTop = panStateRef.current.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      panStateRef.current = null;
      container.style.cursor = scale > 1 ? 'grab' : 'default';
      container.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enableDragPan, scale]);

  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center ${backgroundClassName}`}>
        <div className="text-center text-gray-600">{loadingLabel}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-full items-center justify-center ${backgroundClassName}`}>
        <div className="text-center text-red-500">
          <p className="font-semibold">{errorTitle}</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className={`flex h-full items-center justify-center ${backgroundClassName}`}>
        <div className="text-center text-gray-500">Không có PDF để hiển thị</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className={`shrink-0 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 ${toolbarClassName}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{`Page ${currentPage} / ${totalPages}`}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[56px] text-center text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToWidth} title="Vừa chiều ngang">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className={`min-h-0 min-w-0 flex-1 overflow-auto p-2 sm:p-4 ${backgroundClassName}`}>
        <div className="mx-auto w-fit bg-white shadow-lg">
          <div className="relative" style={{ width: overlaySize.width ? `${overlaySize.width}px` : 'fit-content' }}>
            <canvas
              ref={canvasRef}
              className="block"
              style={{ cursor: enableDragPan && scale > 1 ? 'grab' : canvasCursor }}
              onMouseDown={(event) => {
                if (!enableDragPan || !containerRef.current || scale <= 1) return;
                if ((event.target as HTMLElement).closest('button')) return;

                panStateRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  scrollLeft: containerRef.current.scrollLeft,
                  scrollTop: containerRef.current.scrollTop,
                };
                containerRef.current.style.cursor = 'grabbing';
                containerRef.current.style.userSelect = 'none';
              }}
              onClick={(event) => {
                onCanvasClick?.({
                  event,
                  ...overlayContext,
                });
              }}
            />

            {renderOverlay ? (
              <div
                className="absolute left-0 top-0"
                style={{ width: `${overlaySize.width}px`, height: `${overlaySize.height}px` }}
                onClick={(event) => {
                  if (event.target !== event.currentTarget || !onCanvasClick || !canvasRef.current) {
                    return;
                  }

                  onCanvasClick({
                    event: {
                      clientX: event.clientX,
                      clientY: event.clientY,
                      currentTarget: canvasRef.current,
                    } as unknown as ReactMouseEvent<HTMLCanvasElement>,
                    ...overlayContext,
                  });
                }}
              >
                {renderOverlay(overlayContext)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
