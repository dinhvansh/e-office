'use client';

import { useEffect, useState } from 'react';

interface DocumentPDFViewerProps {
  documentId: number;
  pdfUrl?: string;
}

export default function DocumentPDFViewer({ documentId, pdfUrl }: DocumentPDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadPDF();
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [documentId, pdfUrl]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Wait for localStorage to be available
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }

      // Get token from auth storage
      const authData = localStorage.getItem('esign.auth');
      console.log('🔑 Auth data:', authData ? 'Found' : 'NOT FOUND');
      
      if (!authData) {
        throw new Error('Không tìm thấy thông tin xác thực. Vui lòng đăng nhập lại.');
      }

      const parsed = JSON.parse(authData);
      const token = parsed?.tokens?.accessToken;
      console.log('🔑 Access token:', token ? `Found (${token.substring(0, 20)}...)` : 'NOT FOUND');
      
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }

      const url = pdfUrl || `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${documentId}/view`;
      console.log('📡 Fetching PDF from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('✅ PDF blob received:', blob.size, 'bytes');
      
      const blobUrl = URL.createObjectURL(blob);
      setBlobUrl(blobUrl);
    } catch (err: any) {
      console.error('❌ PDF load error:', err);
      setError(err.message || 'Không thể tải PDF');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Không thể tải PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-gray-100">
      <iframe
        src={blobUrl}
        className="w-full h-full border-0"
        title="PDF Document"
      />
    </div>
  );
}
