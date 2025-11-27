import React from 'react';
import { User, CheckCircle } from 'lucide-react';

export interface InternalSigner {
  id: number;
  name: string;
  email: string;
  signing_order: number;
  role?: string;
}

interface InternalSignersSectionProps {
  signers: InternalSigner[];
}

export function InternalSignersSection({ signers }: InternalSignersSectionProps) {
  if (signers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          ✍️ Người ký nội bộ (từ workflow)
        </h3>
        <span className="text-xs text-gray-500">
          ({signers.length} người)
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Danh sách người ký nội bộ được tự động load từ workflow template. 
            Bạn không thể chỉnh sửa danh sách này.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {signers.map((signer) => (
          <div
            key={signer.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            {/* Order Badge */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              {signer.signing_order}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {signer.name}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Nội bộ
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {signer.email}
              </p>
              {signer.role && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {signer.role}
                </p>
              )}
            </div>

            {/* Lock Icon */}
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
