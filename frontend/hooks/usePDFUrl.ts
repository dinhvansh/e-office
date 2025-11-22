import { useState, useEffect } from 'react';

export function usePDFUrl(apiUrl: string, token: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No authentication token');
      setLoading(false);
      return;
    }

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
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [apiUrl, token]);

  return { blobUrl, loading, error };
}
