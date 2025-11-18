"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord, SignRequestRecord } from "@/lib/types";

export default function SignRequestsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });

  const { data: signRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["sign-requests"],
    queryFn: async () => {
      const data = await fetchJson<{ sign_requests: SignRequestRecord[] }>("/sign-requests");
      return data.sign_requests;
    },
  });
  const [title, setTitle] = useState("Hop dong moi");
  const [message, setMessage] = useState("Vui long ky trong ngay");
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [signers, setSigners] = useState([{ email: "", name: "" }]);
  const [createdRequest, setCreatedRequest] = useState<SignRequestRecord | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) {
        throw new Error("Vui long chon tai lieu");
      }
      const payload = {
        document_id: documentId,
        title,
        message,
        workflow_type: "sequential",
        signers: signers.filter((s) => s.email && s.name),
      };
      const data = await fetchJson<{ sign_request: SignRequestRecord }>("/sign-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCreatedRequest(data.sign_request);
      queryClient.invalidateQueries({ queryKey: ["sign-requests"] });
    },
  });

  const updateSigner = (index: number, field: "email" | "name", value: string) => {
    setSigners((prev) => prev.map((signer, i) => (i === index ? { ...signer, [field]: value } : signer)));
  };

  const addSigner = () => setSigners((prev) => [...prev, { email: "", name: "" }]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "draft":
        return "bg-slate-100 text-slate-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Danh sach Sign Requests */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Quy trinh ky da gui</h2>
          <span className="text-sm text-slate-500">
            {isLoadingRequests ? "Dang tai..." : `${signRequests?.length || 0} quy trinh`}
          </span>
        </div>

        {isLoadingRequests ? (
          <div className="py-8 text-center text-slate-500">Dang tai...</div>
        ) : signRequests && signRequests.length > 0 ? (
          <div className="space-y-3">
            {signRequests.map((request) => (
              <a
                key={request.id}
                href={`/sign-requests/${request.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{request.title || "Quy trinh ky"}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(request.status || "")}`}>
                        {request.status}
                      </span>
                    </div>
                    {request.message && <p className="mt-1 text-sm text-slate-600">{request.message}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>ID: #{request.id}</span>
                      <span>Tai lieu: #{request.document_id}</span>
                      <span>Nguoi ky: {request.signers?.length || 0}</span>
                      <span>{new Date(request.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600">Chua co quy trinh ky nao</p>
            <p className="text-xs text-slate-500">Tao quy trinh moi ben duoi</p>
          </div>
        )}
      </section>
      <section className="card">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Tao quy trinh ky</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Tai lieu
            <select
              className="input mt-1"
              value={documentId ?? ""}
              onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- Chon tai lieu --</option>
              {documents?.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  #{doc.id} - {doc.file_path.split("/").pop()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tieu de
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            Loi nhan
            <textarea className="input mt-1" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        </div>
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Nguoi ky</p>
          {signers.map((signer, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="Email"
                value={signer.email}
                onChange={(e) => updateSigner(index, "email", e.target.value)}
              />
              <input
                className="input"
                placeholder="Ten"
                value={signer.name}
                onChange={(e) => updateSigner(index, "name", e.target.value)}
              />
            </div>
          ))}
          <button onClick={addSigner} className="text-sm text-brand-600 hover:underline">
            + Them nguoi ky
          </button>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {createMutation.isPending ? "Dang tao..." : "Gui quy trinh"}
        </button>
        {createMutation.error && <p className="mt-2 text-sm text-red-600">{(createMutation.error as Error).message}</p>}
      </section>
      {createdRequest && (
        <section className="card">
          <h2 className="mb-2 text-xl font-semibold text-slate-900">Quy trinh vua tao</h2>
          <p className="text-sm text-slate-500">ID: {createdRequest.id}</p>
          <p className="text-sm text-slate-500">Trang thai: {createdRequest.status}</p>
          <div className="mt-4 space-y-2">
            {createdRequest.signers?.map((signer) => (
              <div key={signer.id} className="rounded-xl border border-slate-100 px-4 py-2">
                <p className="font-medium text-slate-900">{signer.name}</p>
                <p className="text-sm text-slate-500">{signer.email}</p>
                <p className="text-xs text-slate-400">{signer.status}</p>
              </div>
            ))}
          </div>
          <a
            href={`/sign-requests/${createdRequest.id}`}
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
          >
            Xem chi tiet & Gui OTP →
          </a>
        </section>
      )}
    </div>
  );
}
