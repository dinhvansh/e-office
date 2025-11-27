'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FlowTimeline } from '@/components/flow/FlowTimeline';
import { FlowActivities } from '@/components/flow/FlowActivities';
import { FlowParticipants } from '@/components/flow/FlowParticipants';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useState } from 'react';

export default function DocumentFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'activities' | 'participants'>('activities');

  // Fetch flow data
  const { data: flowData, isLoading } = useQuery({
    queryKey: ['document-flow', documentId],
    queryFn: async () => {
      const response = await fetchJson(`/documents/${documentId}/flow`);
      return response;
    },
  });

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

  const { document, phases, steps, activities, can_approve, can_sign } = flowData;

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
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {document.document_number} • {document.document_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Tải xuống
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Timeline */}
          <div className="lg:col-span-1">
            <FlowTimeline
              steps={steps}
              canApprove={can_approve}
              canSign={can_sign}
            />
          </div>

          {/* Center: Document Viewer */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Xem tài liệu</h2>
              <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">PDF Viewer</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tích hợp PDF viewer ở đây
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Activities & Participants */}
          <div className="lg:col-span-1">
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
