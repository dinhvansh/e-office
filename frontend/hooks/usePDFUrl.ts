import { useState, useEffect, useRef } from 'react';

export function usePDFUrl(apiUrl: string, token: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() => token ? null : 'No authentication token');
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function fetchPDF() {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status}`);
        }

        const blob = await response.blob();
        
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchPDF();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [apiUrl, token]);

  return { blobUrl, loading, error };
}
