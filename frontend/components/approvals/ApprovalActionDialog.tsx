'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SignatureModal from '@/components/signature/SignatureModal';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ApprovalActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (action: 'approved' | 'rejected' | 'request_info', comment: string, signatureData?: string, signatureType?: 'drawn' | 'uploaded' | 'typed') => void;
  action: 'approve' | 'reject' | 'request_info';
  approverName: string;
  documentTitle: string;
}

export default function ApprovalActionDialog({
  open,
  onClose,
  onConfirm,
  action,
  approverName,
  documentTitle,
}: ApprovalActionDialogProps) {
  const [comment, setComment] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Phê duyệt tài liệu',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          buttonText: 'Phê duyệt',
          buttonClass: 'bg-green-600 hover:bg-green-700',
          requireSignature: true,
        };
      case 'reject':
        return {
          title: 'Từ chối tài liệu',
          icon: XCircle,
          iconColor: 'text-red-600',
          buttonText: 'Từ chối',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          requireSignature: false,
        };
      case 'request_info':
        return {
          title: 'Yêu cầu bổ sung thông tin',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
          buttonText: 'Yêu cầu bổ sung',
          buttonClass: 'bg-orange-600 hover:bg-orange-700',
          requireSignature: false,
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleSignatureConfirm = (data: string, type: 'drawn' | 'uploaded' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
    setShowSignatureModal(false);
  };

  const handleSubmit = async () => {
    if (config.requireSignature && !signatureData) {
      // For approve action, signature is optional but recommended
      // User can still approve without signature
    }

    setSubmitting(true);
    try {
      const actionMap = {
        approve: 'approved' as const,
        reject: 'rejected' as const,
        request_info: 'request_info' as const,
      };

      await onConfirm(
        actionMap[action],
        comment,
        signatureData || undefined,
        signatureType
      );
      
      // Reset state
      setComment('');
      setSignatureData('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
              {config.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Document Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tài liệu:</p>
              <p className="font-semibold">{documentTitle}</p>
            </div>

            {/* Comment */}
            <div>
              <Label htmlFor="comment">
                Nhận xét {action === 'request_info' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  action === 'approve'
                    ? 'Nhận xét của bạn (không bắt buộc)'
                    : action === 'reject'
                    ? 'Lý do từ chối'
                    : 'Thông tin cần bổ sung'
                }
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Signature Section (only for approve) */}
            {config.requireSignature && (
              <div>
                <Label>Chữ ký (không bắt buộc)</Label>
                {signatureData ? (
                  <div className="mt-2 space-y-2">
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <Image
                        src={signatureData}
                        alt="Signature"
                        width={500}
                        height={128}
                        unoptimized
                        className="max-w-full h-auto max-h-32 mx-auto"
                      />
                    </div>
                    <Button
                      onClick={() => setShowSignatureModal(true)}
                      variant="outline"
                      className="w-full"
                      type="button"
                    >
                      Thay đổi chữ ký
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowSignatureModal(true)}
                    variant="outline"
                    className="w-full mt-2"
                    type="button"
                  >
                    ✍️ Thêm chữ ký
                  </Button>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Chữ ký giúp xác thực quyết định phê duyệt của bạn
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || (action === 'request_info' && !comment.trim())}
                className={config.buttonClass}
              >
                {submitting ? 'Đang xử lý...' : config.buttonText}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Modal */}
      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onConfirm={handleSignatureConfirm}
        signerName={approverName}
        title="Ký phê duyệt"
      />
    </>
  );
}
