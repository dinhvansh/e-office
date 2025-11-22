"use client";

import { ChangeEvent, useRef } from "react";
import { Plus, X, Paperclip, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface AttachmentsSectionProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function AttachmentsSection({ files, onChange }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file count
    if (files.length + selectedFiles.length > 5) {
      alert("Tối đa 5 file đính kèm");
      return;
    }

    // Validate file size (10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = selectedFiles.filter((f) => f.size > maxSize);
    if (invalidFiles.length > 0) {
      alert(`File quá lớn: ${invalidFiles.map((f) => f.name).join(", ")}. Tối đa 10MB/file.`);
      return;
    }

    onChange([...files, ...selectedFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "🖼️";
    if (["doc", "docx"].includes(ext || "")) return "📝";
    if (["xls", "xlsx"].includes(ext || "")) return "📊";
    return "📎";
  };

  return (
    <div className="space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-purple-600" />
            📎 File đính kèm
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tối đa 5 files, 10MB/file
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= 5}
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm file
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
      />

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-white rounded border"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-2 hover:bg-gray-100 rounded-full p-1"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Chưa có file đính kèm. Click "Thêm file" để upload.
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{files.length}/5 files</span>
          <span>
            Tổng: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
