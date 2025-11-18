"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChangeEvent, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord } from "@/lib/types";

export default function DocumentsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Vui long chon file PDF");
      }
      const base64 = await fileToBase64(selectedFile);
      await fetchJson("/documents", {
        method: "POST",
        body: JSON.stringify({ file_name: fileName || selectedFile.name, file_base64: base64 }),
      });
    },
    onSuccess: () => {
      setSelectedFile(null);
      setFileName("");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setFileName(file?.name ?? "");
  };

  const handleDelete = async (id: number) => {
    await fetchJson(`/documents/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
    <div className="space-y-8">
      <section className="card">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tài liệu</p>
            <h2 className="text-2xl font-semibold text-slate-900">Upload PDF mới</h2>
            <p className="text-sm text-slate-500">Áp dụng chuẩn bảo mật và lưu trên storage của tenant.</p>
          </div>
          <span className="chip">{documents?.length ?? 0} file</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Tên hiển thị
            <input className="input mt-2" value={fileName} placeholder="Hợp đồng đối tác 2025" onChange={(e) => setFileName(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Chọn file PDF
            <div className="mt-2 flex h-32 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 text-slate-500">
              <input className="absolute h-32 w-full cursor-pointer opacity-0" type="file" accept="application/pdf" onChange={handleFileChange} />
              <div className="text-center text-xs">
                {selectedFile ? (
                  <>
                    <p className="font-semibold text-slate-700">{selectedFile.name}</p>
                    <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-700">Kéo thả PDF vào đây</p>
                    <p>Hoặc click để chọn file</p>
                  </>
                )}
              </div>
            </div>
          </label>
        </div>
        <button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending} className="button-primary mt-6">
          {uploadMutation.isPending ? "Đang tải..." : "Tải tài liệu"}
        </button>
        {uploadMutation.error && <p className="mt-2 text-sm text-red-600">{(uploadMutation.error as Error).message}</p>}
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Danh sách tài liệu</h2>
            <p className="text-sm text-slate-500">Theo dõi trạng thái, phiên bản và chủ sở hữu.</p>
          </div>
          <span className="chip">{isLoading ? "Đang tải" : `${documents?.length ?? 0} tài liệu`}</span>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : documents && documents.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tên file</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-slate-100 text-slate-600">
                    <td className="px-4 py-3 font-semibold text-slate-900">#{doc.id}</td>
                    <td className="px-4 py-3">{doc.file_path.split("/").pop()}</td>
                    <td className="px-4 py-3">
                      <span className="chip capitalize">{doc.status ?? "draft"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{dayjs(doc.created_at).format("DD/MM/YYYY HH:mm")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(doc.id)} className="text-sm font-semibold text-red-500 hover:underline">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            Chưa có tài liệu nào được tải lên.
          </div>
        )}
      </section>
    </div>
  );
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString().split(",")[1];
      if (!result) {
        reject(new Error("Khong the doc file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Khong the doc file"));
    reader.readAsDataURL(file);
  });
};
