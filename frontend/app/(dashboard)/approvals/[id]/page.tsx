'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SignatureModal from '@/components/signature/SignatureModal';
import DocumentPDFViewer from '@/components/pdf/DocumentPDFViewer';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  ArrowLeft,
  Download
} from 'lucide-react';

interface ApprovalDetail {
  id: number;
  action: string;
  comment: string | null;
  created_at: string;
  acted_at: string | null;
  workflow: {
    id: number;
    name: string;
    description: string | null;
  };
  document: {
    id: number;
    title: string;
    original_file_name: string;
    tenant_id: number;
    owner: {
      id: number;
      full_name: string | null;
      email: string;
    };
  };
  approver: {
    id: number;
    full_name: string | null;
    email: string;
  };
  workflow_step: {
    id: number;
    step_order: number;
    step_name: string;
    approver_type: string;
  };
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson, user } = useAuth();
  const approvalId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'request_info' | null>(null);
  const [comments, setComments] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovalDetail();
  }, [approvalId]);

  const fetchApprovalDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchJson(`/approvals/${approvalId}`) as ApprovalDetail;
      setApproval(data);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải thông tin phê duyệt');
      router.push('/my-tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionType: 'approve' | 'reject' | 'request_info') => {
    setAction(actionType);
    if (actionType === 'approve') {
      setShowSignatureModal(true);
    }
  };

  const handleSignatureConfirm = (data: string, type: 'drawn' | 'uploaded' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
    setShowSignatureModal(false);
    toast.success('Chữ ký đã được tạo');
  };

  const handleSubmitAction = async () => {
    if (!action) return;

    if (action === 'approve' && !signatureData) {
      toast.error('Vui lòng tạo chữ ký');
      setShowSignatureModal(true);
      return;
    }

    if ((action === 'reject' || action === 'request_info') && !comments.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = `/approvals/${approvalId}/${action.replace('_', '-')}`;
      const body: any = { comments: comments.trim() || undefined };
      
      if (action === 'approve' && signatureData) {
        body.signature_data = signatureData;
        body.signature_type = signatureType;
      }

      await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      toast.success('Thành công!');
      router.push('/my-tasks');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Không tìm thấy</p>
      </div>
    );
  }

  const isProcessed = approval.action !== 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Button variant="ghost" onClick={() => router.push('/my-tasks')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Phê duyệt tài liệu</h1>
          <p className="text-gray-600">
            {approval.workflow.name} - Bước {approval.workflow_step.step_order}: {approval.workflow_step.step_name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Thông tin tài liệu</h2>
              <div className="space-y-2">
                <p><strong>Tiêu đề:</strong> {approval.document.title}</p>
                <p><strong>File:</strong> {approval.document.original_file_name}</p>
                <p><strong>Người tạo:</strong> {approval.document.owner.full_name || approval.document.owner.email}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Xem trước</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const authData = localStorage.getItem('esign.auth');
                      if (!authData) throw new Error('Not authenticated');
                      
                      const parsed = JSON.parse(authData);
                      const token = parsed?.tokens?.accessToken;
                      if (!token) throw new Error('No token');

                      const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${approval.document.id}/download`,
                        {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        }
                      );
                      
                      if (!response.ok) throw new Error('Download failed');
                      
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = approval.document.original_file_name || 'document.pdf';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast.success('Tải xuống thành công');
                    } catch (error) {
                      toast.error('Không thể tải xuống');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải xuống
                </Button>
              </div>
              <DocumentPDFViewer documentId={approval.document.id} />
            </div>
          </div>

          <div className="space-y-6">
            {!isProcessed && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Hành động</h2>
                
                {!action && (
                  <div className="space-y-3">
                    <Button onClick={() => handleActionClick('approve')} className="w-full bg-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Phê duyệt
                    </Button>
                    <Button onClick={() => handleActionClick('reject')} variant="destructive" className="w-full">
                      <XCircle className="w-4 h-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button onClick={() => handleActionClick('request_info')} variant="outline" className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Yêu cầu bổ sung
                    </Button>
                  </div>
                )}

                {action && (
                  <div className="space-y-4">
                    {action === 'approve' && signatureData && (
                      <div className="border rounded p-4">
                        <Label>Chữ ký</Label>
                        <img src={signatureData} alt="Signature" className="max-h-24 mx-auto" />
                        <Button onClick={() => setShowSignatureModal(true)} variant="outline" size="sm" className="w-full mt-2">
                          Thay đổi
                        </Button>
                      </div>
                    )}

                    {action === 'approve' && !signatureData && (
                      <Button onClick={() => setShowSignatureModal(true)} variant="outline" className="w-full">
                        ✍️ Tạo chữ ký
                      </Button>
                    )}

                    <div>
                      <Label>Nhận xét</Label>
                      <Textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSubmitAction} disabled={submitting} className="flex-1">
                        {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                      </Button>
                      <Button onClick={() => { setAction(null); setComments(''); setSignatureData(''); }} variant="outline" disabled={submitting}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isProcessed && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Đã xử lý</h2>
                <p className="text-sm text-gray-600">
                  Trạng thái: <strong>{approval.action === 'approved' ? 'Đã phê duyệt' : approval.action === 'rejected' ? 'Đã từ chối' : 'Yêu cầu bổ sung'}</strong>
                </p>
                {approval.comment && (
                  <p className="text-sm mt-2">Nhận xét: {approval.comment}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <SignatureModal
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onConfirm={handleSignatureConfirm}
          signerName={user?.email || 'User'}
        />
      </div>
    </div>
  );
}
