'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Users, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface Signer {
  id: number;
  name: string;
  email: string;
  role: string | null;
  signing_order: number | null;
  status: string;
  signed_at: string | null;
  is_internal: boolean;
}

interface SignRequest {
  id: number;
  title: string | null;
  message: string | null;
  status: string;
  workflow_type: string;
  created_at: string;
  deadline: string | null;
  document: {
    id: number;
    title: string | null;
    original_file_name: string;
    document_number: string | null;
  };
  signers: Signer[];
}

export default function SignRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const signRequestId = parseInt(params.id as string);
  const [pdfUrl, setPdfUrl] = React.useState<string>('');

  const { data: signRequest, isLoading } = useQuery({
    queryKey: ['sign-request', signRequestId],
    queryFn: async () => {
      const res = await fetchJson<{ sign_request: SignRequest }>(`/sign-requests/${signRequestId}`);
      return res.sign_request;
    },
  });

  // Load PDF with authentication
  React.useEffect(() => {
    if (!signRequest) return;

    const loadPDF = async () => {
      try {
        const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('esign.auth') || '{}')?.tokens?.accessToken : '';
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${signRequest.document.id}/view`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (error) {
        console.error('Failed to load PDF:', error);
      }
    };

    loadPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [signRequest]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
      case 'otp_sent':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'signed':
      case 'completed':
        return 'Đã ký';
      case 'rejected':
        return 'Đã từ chối';
      case 'otp_sent':
        return 'Đã gửi OTP';
      case 'pending':
        return 'Chờ ký';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Đã hoàn thành</Badge>;
      case 'in_progress':
      case 'pending':
        return <Badge className="bg-yellow-500">Đang xử lý</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">Nháp</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!signRequest) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">Không tìm thấy yêu cầu ký</div>
      </div>
    );
  }

  const signedCount = signRequest.signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
  const totalSigners = signRequest.signers.length;
  const progress = totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0;

  // Sort signers by signing order
  const sortedSigners = [...signRequest.signers].sort((a, b) => {
    if (a.signing_order === null) return 1;
    if (b.signing_order === null) return -1;
    return a.signing_order - b.signing_order;
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/sign-requests')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {signRequest.title || signRequest.document.title || signRequest.document.original_file_name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Mã: {signRequest.document.document_number || `#${signRequest.id}`}</span>
              <span>•</span>
              <span>Tạo: {dayjs(signRequest.created_at).format('DD/MM/YYYY HH:mm')}</span>
              {signRequest.deadline && (
                <>
                  <span>•</span>
                  <span>Hạn: {dayjs(signRequest.deadline).format('DD/MM/YYYY')}</span>
                </>
              )}
            </div>
          </div>
          {getStatusBadge(signRequest.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Document Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tài liệu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-4 min-h-[600px]">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[600px] border-0 rounded bg-white"
                    title="Document Preview"
                  />
                ) : (
                  <div className="w-full h-[600px] bg-white rounded flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
                      <p>Đang tải tài liệu...</p>
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right: Signing Progress */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tiến độ ký</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Đã ký: {signedCount}/{totalSigners}</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Loại: {signRequest.workflow_type === 'sequential' ? 'Ký tuần tự' : 'Ký song song'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Người ký ({totalSigners})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedSigners.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(signer.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {signer.signing_order !== null && (
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                            {signer.signing_order}
                          </span>
                        )}
                        <span className="font-medium truncate">{signer.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{signer.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(signer.status)}
                        </span>
                        {signer.signed_at && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {dayjs(signer.signed_at).format('DD/MM HH:mm')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          {signRequest.message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lời nhắn</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {signRequest.message}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
