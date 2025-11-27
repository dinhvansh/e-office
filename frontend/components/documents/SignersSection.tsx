"use client";

import { useState } from "react";
import { Plus, Trash2, User, Building2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Signer {
  id: string;
  type: "manual" | "external";
  email: string;
  name: string;
  order: number;
  role?: string; // ✅ Added: 'signer' or 'approver'
  externalOrgId?: number;
}

interface SignersSectionProps {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  externalOrgs: any[]; // Pass from parent to avoid multiple API calls
}

export function SignersSection({ signers, onChange, externalOrgs }: SignersSectionProps) {
  const isLoadingOrgs = false; // Data already loaded by parent
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addSigner = (type: "manual" | "external") => {
    const newSigner: Signer = {
      id: Date.now().toString(),
      type,
      email: "",
      name: "",
      order: signers.length + 1,
      role: "signer", // ✅ Default role
    };
    onChange([...signers, newSigner]);
  };

  const removeSigner = (id: string) => {
    const updatedSigners = signers.filter((s) => s.id !== id);
    // Reorder remaining signers
    const reorderedSigners = updatedSigners.map((s, index) => ({
      ...s,
      order: index + 1,
    }));
    onChange(reorderedSigners);
  };

  const updateSigner = (id: string, field: keyof Signer, value: any) => {
    const updated = signers.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    onChange(updated);
  };

  // ✅ Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSigners = [...signers];
    const draggedItem = newSigners[draggedIndex];
    newSigners.splice(draggedIndex, 1);
    newSigners.splice(index, 0, draggedItem);

    // Update order numbers
    const reorderedSigners = newSigners.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    onChange(reorderedSigners);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            ✍️ Người ký bên ngoài (External Signers)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Đối tác, khách hàng - Ký qua email, không cần đăng nhập (như DocuSign)
          </p>
          {signers.length > 1 && (
            <p className="text-xs text-purple-600 mt-1">
              🔄 Kéo thả để sắp xếp lại thứ tự
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSigner("manual")}
          >
            <User className="w-4 h-4 mr-1" />
            Thêm người ký
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSigner("external")}
          >
            <Building2 className="w-4 h-4 mr-1" />
            Thêm tổ chức
          </Button>
        </div>
      </div>

      {/* Signers list */}
      <div className="space-y-3">
        {signers.map((signer, index) => (
          <div
            key={signer.id}
            draggable={true}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`border rounded-lg p-3 space-y-3 bg-white cursor-move hover:bg-purple-50 hover:border-purple-300 transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* ✅ Drag Handle */}
                <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {/* Order Badge */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                  {signer.order}
                </div>
                
                {signer.type === "manual" ? (
                  <User className="h-4 w-4 text-purple-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-purple-600" />
                )}
                <span className="text-sm font-medium text-purple-600">
                  {signer.type === "manual" ? "Người ký" : "Tổ chức"}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Ký qua email, không cần đăng nhập)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSigner(signer.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            {signer.type === "manual" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`signer-email-${signer.id}`} className="text-xs">
                      Email *
                    </Label>
                    <Input
                      id={`signer-email-${signer.id}`}
                      type="email"
                      placeholder="email@example.com"
                      value={signer.email}
                      onChange={(e) =>
                        updateSigner(signer.id, "email", e.target.value)
                      }
                      className="h-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`signer-name-${signer.id}`} className="text-xs">
                      Họ tên *
                    </Label>
                    <Input
                      id={`signer-name-${signer.id}`}
                      placeholder="Nguyễn Văn A"
                      value={signer.name}
                      onChange={(e) =>
                        updateSigner(signer.id, "name", e.target.value)
                      }
                      className="h-9"
                    />
                  </div>
                </div>
                
                {/* ✅ Role Selector */}
                <div>
                  <Label htmlFor={`signer-role-${signer.id}`} className="text-xs">
                    Vai trò *
                  </Label>
                  <select
                    id={`signer-role-${signer.id}`}
                    value={signer.role || 'signer'}
                    onChange={(e) => updateSigner(signer.id, "role", e.target.value)}
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white hover:border-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  >
                    <option value="signer">👤 Người ký</option>
                    <option value="approver">✅ Người phê duyệt</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor={`signer-order-${signer.id}`} className="text-xs font-semibold text-purple-700">
                    🔢 Thứ tự ký *
                  </Label>
                  <Input
                    id={`signer-order-${signer.id}`}
                    type="number"
                    min="1"
                    value={signer.order}
                    onChange={(e) =>
                      updateSigner(
                        signer.id,
                        "order",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="h-9 border-purple-300 focus:border-purple-500"
                    placeholder="1, 2, 3..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Số nhỏ ký trước. Cùng số = ký song song
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`signer-org-${signer.id}`} className="text-xs">
                    Tổ chức *
                  </Label>
                  <Select
                    value={signer.externalOrgId?.toString() || ""}
                    onValueChange={(value) => {
                      if (!value) return;
                      const orgId = parseInt(value);
                      const org = externalOrgs?.find((o: any) => o.id === orgId);
                      console.log("🔍 Selected org ID:", orgId, "Found:", org, "Current signer:", signer);
                      if (org) {
                        // Update all fields at once
                        const updated = signers.map((s) => 
                          s.id === signer.id 
                            ? {
                                ...s,
                                externalOrgId: orgId,
                                email: org.email || org.contact_email || "",
                                name: org.contact_person || org.name,
                              }
                            : s
                        );
                        console.log("🔄 Updated signers:", updated);
                        onChange(updated);
                      }
                    }}
                  >
                    <SelectTrigger id={`signer-org-${signer.id}`} className="h-9">
                      <SelectValue placeholder={isLoadingOrgs ? "Đang tải..." : "-- Chọn tổ chức --"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingOrgs ? (
                        <div className="p-2 text-sm text-muted-foreground">Đang tải...</div>
                      ) : !externalOrgs || externalOrgs.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Chưa có tổ chức. Vui lòng tạo tổ chức bên ngoài trước.
                        </div>
                      ) : (
                        externalOrgs.map((org: any) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{org.name} ({org.code})</span>
                                <span className="text-xs text-muted-foreground">
                                  {org.contact_person || "N/A"} • {org.email || org.contact_email || "N/A"}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {signer.email && (
                    <div className="mt-2 text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
                      <div>🏢 {signer.name}</div>
                      <div>📧 {signer.email}</div>
                    </div>
                  )}
                </div>
                
                {/* ✅ Role Selector */}
                <div>
                  <Label htmlFor={`signer-role-${signer.id}`} className="text-xs">
                    Vai trò *
                  </Label>
                  <select
                    id={`signer-role-${signer.id}`}
                    value={signer.role || 'signer'}
                    onChange={(e) => updateSigner(signer.id, "role", e.target.value)}
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white hover:border-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  >
                    <option value="signer">👤 Người ký</option>
                    <option value="approver">✅ Người phê duyệt</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor={`signer-order-${signer.id}`} className="text-xs font-semibold text-purple-700">
                    🔢 Thứ tự ký *
                  </Label>
                  <Input
                    id={`signer-order-${signer.id}`}
                    type="number"
                    min="1"
                    value={signer.order}
                    onChange={(e) =>
                      updateSigner(
                        signer.id,
                        "order",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="h-9 border-purple-300 focus:border-purple-500"
                    placeholder="1, 2, 3..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Số nhỏ ký trước. Cùng số = ký song song
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {signers.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground bg-purple-50 rounded-lg border border-purple-200">
          <p className="font-medium">Chưa có người ký bên ngoài</p>
          <p className="text-xs mt-1">Click "Thêm người ký" hoặc "Thêm tổ chức" để thêm đối tác/khách hàng</p>
          <p className="text-xs mt-1">💡 Họ sẽ nhận email với link ký, không cần đăng nhập hệ thống</p>
        </div>
      )}
    </div>
  );
}
