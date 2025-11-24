"use client";

import { useState } from "react";
import { Plus, Trash2, User, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
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
  externalOrgId?: number;
}

interface SignersSectionProps {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
}

export function SignersSection({ signers, onChange }: SignersSectionProps) {
  const { fetchJson } = useAuth();

  // Fetch external organizations
  const { data: externalOrgs, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["external-orgs"],
    queryFn: async () => {
      const response = await fetchJson<any>("/external-orgs");
      console.log("📦 External orgs RAW response:", response);
      // fetchJson already unwraps .data, so response IS the array
      const orgs = Array.isArray(response) ? response : [];
      console.log("📦 External orgs PARSED:", orgs);
      return orgs;
    },
  });

  console.log("🏢 External orgs FINAL:", externalOrgs, "Loading:", isLoadingOrgs);

  const addSigner = (type: "manual" | "external") => {
    const newSigner: Signer = {
      id: Date.now().toString(),
      type,
      email: "",
      name: "",
      order: signers.length + 1,
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
    console.log("🔄 updateSigner called:", { id, field, value });
    console.log("📊 Current signers:", signers);
    const updated = signers.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    console.log("✅ Updated signers:", updated);
    onChange(updated);
    console.log("📤 onChange called with updated signers");
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
            className="border rounded-lg p-3 space-y-3 bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {signer.type === "manual" ? (
                  <User className="h-4 w-4 text-purple-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-purple-600" />
                )}
                <span className="text-sm font-medium text-purple-600">
                  {signer.type === "manual" ? "Người ký" : "Tổ chức"} #{signer.order}
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
