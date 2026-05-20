'use client';

import { useEffect, useState } from 'react';
import PDFCoreViewer from '@/components/pdf/PDFCoreViewer';

interface SimplePDFViewerProps {
  pdfUrl: string;
}

export default function SimplePDFViewer({ pdfUrl }: SimplePDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const authData = localStorage.getItem('esign.auth');
        const token = authData ? JSON.parse(authData).tokens?.accessToken : null;
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(pdfUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status}`);
        }

        const blob = await response.blob();
        const nextBlobUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(nextBlobUrl);
          return;
        }

        setBlobUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return nextBlobUrl;
        });
      } catch (loadError: any) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load PDF');
          setBlobUrl((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return (
    <PDFCoreViewer
      pdfUrl={blobUrl}
      loading={loading}
      error={error}
      loadingLabel="Đang tải PDF..."
      errorTitle="Không thể tải PDF"
      enableDragPan
    />
  );
}
