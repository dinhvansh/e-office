"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { SignRequestRecord } from "@/lib/types";

export default function SignRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const signRequestId = Number(params.id);

  const { data: signRequest, isLoading } = useQuery({
    queryKey: ["sign-request", signRequestId],
    queryFn: async () => {
      const data = await fetchJson<{ sign_request: SignRequestRecord }>(`/sign-requests/${signRequestId}`);
      return data.sign_request;
    },
  });

  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});

  const sendOtpMutation = useMutation({
    mutationFn: async (signerId: number) => {
      const data = await fetchJson<{ otp: string; message: string }>(`/signers/${signerId}/send-otp`, {
        method: "POST",
      });
      return { signerId, ...data };
    },
    onSuccess: (data) => {
      alert(`✅ OTP đã được gửi!\n\nOTP: ${data.otp}\n\n(Trong production, OTP sẽ được gửi qua email)`);
      queryClient.invalidateQueries({ queryKey: ["sign-request", signRequestId] });
    },
    onError: (error) => {
      alert(`❌ Lỗi: ${(error as Error).message}`);
    },
  });

  const signMutation = useMutation({
    mutationFn: async ({ signerId, otp }: { signerId: number; otp: string }) => {
      await fetchJson(`/signers/${signerId}/sign`, {
        method: "POST",
        body: JSON.stringify({ otp }),
      });
    },
    onSuccess: () => {
      alert("✅ Ký thành công!");
      queryClient.invalidateQueries({ queryKey: ["sign-request", signRequestId] });
      setOtpInputs({});
    },
    onError: (error) => {
      alert(`❌ Lỗi: ${(error as Error).message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  if (!signRequest) {
    return (
      <div className="card">
        <p className="text-red-600">Không tìm thấy quy trình ký</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "otp_sent":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Quay lại
        </button>
      </div>

      {/* Sign Request Info */}
      <section className="card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{signRequest.title || "Quy trình ký"}</h1>
            <p className="mt-1 text-sm text-slate-500">ID: #{signRequest.id}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(signRequest.status || "")}`}>
            {signRequest.status}
          </span>
        </div>

        {signRequest.message && (
          <div className="mb-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{signRequest.message}</p>
          </div>
        )}

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-slate-500">Loại quy trình</p>
            <p className="font-medium text-slate-900">{signRequest.workflow_type || "sequential"}</p>
          </div>
          <div>
            <p className="text-slate-500">Tài liệu</p>
            <p className="font-medium text-slate-900">#{signRequest.document_id}</p>
          </div>
          <div>
            <p className="text-slate-500">Ngày tạo</p>
            <p className="font-medium text-slate-900">
              {new Date(signRequest.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
      </section>

      {/* Signers */}
      <section className="card">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Người ký ({signRequest.signers?.length || 0})
        </h2>

        <div className="space-y-4">
          {signRequest.signers?.map((signer) => (
            <div
              key={signer.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                      {signer.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{signer.name}</p>
                      <p className="text-sm text-slate-500">{signer.email}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(signer.status || "")}`}>
                      {signer.status}
                    </span>
                    {signer.signed_at && (
                      <span className="text-xs text-slate-500">
                        Đã ký: {new Date(signer.signed_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {/* Send OTP Button */}
                  {signer.status === "pending" && (
                    <button
                      onClick={() => sendOtpMutation.mutate(signer.id)}
                      disabled={sendOtpMutation.isPending}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {sendOtpMutation.isPending ? "Đang gửi..." : "📧 Gửi OTP"}
                    </button>
                  )}

                  {/* Sign Form */}
                  {(signer.status === "otp_sent" || signer.status === "pending") && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập OTP"
                        maxLength={6}
                        value={otpInputs[signer.id] || ""}
                        onChange={(e) =>
                          setOtpInputs((prev) => ({ ...prev, [signer.id]: e.target.value }))
                        }
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                      <button
                        onClick={() => {
                          const otp = otpInputs[signer.id];
                          if (!otp || otp.length !== 6) {
                            alert("Vui lòng nhập OTP 6 số");
                            return;
                          }
                          signMutation.mutate({ signerId: signer.id, otp });
                        }}
                        disabled={signMutation.isPending || !otpInputs[signer.id]}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        ✍️ Ký
                      </button>
                    </div>
                  )}

                  {signer.status === "completed" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium">Đã ký</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Document Info */}
      {signRequest.document && (
        <section className="card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Tài liệu</h2>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">File path</p>
            <p className="font-mono text-sm text-slate-900">{signRequest.document.file_path}</p>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span>ID: #{signRequest.document.id}</span>
              <span>Status: {signRequest.document.status}</span>
              <span>Version: {signRequest.document.version}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
