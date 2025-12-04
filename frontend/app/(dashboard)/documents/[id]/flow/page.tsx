'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FlowTimeline } from '@/components/flow/FlowTimeline';
import { FlowActivities } from '@/components/flow/FlowActivities';
import { FlowParticipants } from '@/components/flow/FlowParticipants';
import SimplePDFViewer from '@/components/pdf/SimplePDFViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DocumentFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'activities' | 'participants'>('activities');
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Fetch flow data with auto-refresh to show new signatures
  const { data: flowData, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ['document-flow', documentId],
    queryFn: async () => {
      const response = await fetchJson(`/documents/${documentId}/flow`);
      return response;
    },
    refetchInterval: (data) => {
      // Auto-refresh every 10 seconds if document is in progress
      // Stop refreshing when completed or rejected
      const status = data?.document?.status;
      if (status === 'in_progress' || status === 'pending') {
        return 10000; // 10 seconds
      }
      return false; // Stop auto-refresh
    },
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  // Set PDF URL - use progressive/signed version if available
  useEffect(() => {
    if (typeof window !== 'undefined' && documentId && flowData) {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // Priority: Use signed_file_path if exists (progressive or completed)
      // This shows the latest PDF with signatures as they are added
      const hasSignedFile = flowData?.document?.signed_file_path;
      const endpoint = hasSignedFile ? 'view-signed' : 'view';
      
      // Add timestamp to force reload when signed_file_path changes
      // This prevents browser from showing cached old PDF
      const timestamp = Date.now();
      const cacheBuster = hasSignedFile ? `?t=${timestamp}` : '';
      
      setPdfUrl(`${apiUrl}/documents/${documentId}/${endpoint}${cacheBuster}`);
    }
  }, [documentId, flowData?.document?.signed_file_path, flowData?.document?.status]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!flowData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">Không tìm thấy tài liệu</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const document = flowData?.document;
  const phases = flowData?.phases || [];
  const steps = flowData?.steps || [];
  const activities = flowData?.activities || [];
  const can_approve = flowData?.can_approve;
  const can_sign = flowData?.can_sign;

  // Calculate progress percentage
  const completedSteps = steps.filter((s: any) => 
    s.status === 'approved' || s.status === 'signed'
  ).length;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h1 className="text-xl font-semibold">{document.title}</h1>
                  {(document.status === 'in_progress' || document.status === 'pending') && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      Tự động cập nhật
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {document.document_number} • {document.document_type}
                  {document.signed_file_path && (
                    <span className="ml-2 text-green-600">
                      • {document.status === 'completed' ? 'Có PDF hoàn thành' : 'Có PDF đang ký'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Làm mới để xem cập nhật mới nhất"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    if (!process.env.NEXT_PUBLIC_API_URL) {
                      throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
                    }
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                    // Use signed file if available (progressive or completed)
                    const hasSignedFile = document?.signed_file_path;
                    const endpoint = hasSignedFile ? 'download-signed' : 'download';
                    
                    const authData = localStorage.getItem('esign.auth');
                    const token = authData ? JSON.parse(authData).tokens?.accessToken : null;
                    
                    const response = await fetch(`${apiUrl}/documents/${documentId}/${endpoint}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) throw new Error('Download failed');
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    
                    // Add status to filename
                    const statusLabel = document?.status === 'completed' ? 'hoan-thanh' : 'dang-ky';
                    const filename = hasSignedFile 
                      ? `${document.document_number || 'document'}-${statusLabel}.pdf`
                      : `${document.document_number || 'document'}.pdf`;
                    
                    a.download = filename;
                    window.document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    window.document.body.removeChild(a);
                  } catch (error) {
                    console.error('Download error:', error);
                    alert('Không thể tải xuống file');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải xuống {document?.signed_file_path ? (document?.status === 'completed' ? '(Hoàn thành)' : '(Đang ký)') : ''}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Tiến độ: {completedSteps}/{steps.length} bước
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="flex gap-2 mt-4">
            {phases.map((phase: any) => (
              <div
                key={phase.key}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center ${
                  phase.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : phase.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-700'
                    : phase.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {phase.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Timeline */}
          <div className="lg:col-span-3">
            <FlowTimeline
              steps={steps}
              canApprove={can_approve}
              canSign={can_sign}
            />
          </div>

          {/* Center: Document Viewer - Larger */}
          <div className="lg:col-span-6">
            {pdfUrl && (
              <SimplePDFViewer 
                key={`${documentId}-${flowData?.document?.signed_file_path || 'original'}`}
                pdfUrl={pdfUrl} 
              />
            )}
          </div>

          {/* Right: Activities & Participants */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tabs */}
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      activeTab === 'activities'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Hoạt động
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      activeTab === 'participants'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Người tham gia
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'activities' ? (
                  <FlowActivities activities={activities} />
                ) : (
                  <FlowParticipants steps={steps} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
