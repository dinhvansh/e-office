"use client";

import { useState } from "react";
import { Plus, Trash2, Mail, User, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Recipient {
  id: string;
  email: string;
  name: string;
  role: "signer" | "approver" | "cc";
  order: number;
}

interface AddRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (recipients: Recipient[]) => void;
  documentTitle: string;
}

export function AddRecipientsDialog({
  open,
  onOpenChange,
  onContinue,
  documentTitle,
}: AddRecipientsDialogProps) {
  const { fetchJson } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: "1",
      email: "",
      name: "",
      role: "signer",
      order: 1,
    },
  ]);
  const [recipientType, setRecipientType] = useState<"manual" | "external">("manual");

  // Fetch external organizations
  const { data: externalOrgs } = useQuery({
    queryKey: ["external-organizations"],
    queryFn: async () => {
      const data = await fetchJson<any>("/external-organizations");
      return Array.isArray(data) ? data : (data?.external_organizations || []);
    },
    enabled: open,
  });

  const addRecipient = () => {
    const newRecipient: Recipient = {
      id: Date.now().toString(),
      email: "",
      name: "",
      role: "signer",
      order: recipients.length + 1,
    };
    setRecipients([...recipients, newRecipient]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length === 1) return; // Keep at least one
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: any) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleContinue = () => {
    // Validate
    const hasEmptyFields = recipients.some((r) => !r.email || !r.name);
    if (hasEmptyFields) {
      alert("Vui lòng điền đầy đủ thông tin người ký");
      return;
    }

    onContinue(recipients);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "signer":
        return "Người ký";
      case "approver":
        return "Người duyệt";
      case "cc":
        return "Nhận bản sao";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "signer":
        return "text-blue-600";
      case "approver":
        return "text-green-600";
      case "cc":
        return "text-gray-600";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Thêm người nhận
          </DialogTitle>
          <DialogDescription>
            Thêm người ký và người nhận cho tài liệu: <strong>{documentTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {recipients.map((recipient, index) => (
            <div
              key={recipient.id}
              className="border rounded-lg p-4 space-y-3 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className={`h-4 w-4 ${getRoleColor(recipient.role)}`} />
                  <span className="font-medium">
                    Người nhận #{index + 1}
                  </span>
                  <span className={`text-sm ${getRoleColor(recipient.role)}`}>
                    ({getRoleLabel(recipient.role)})
                  </span>
                </div>
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecipient(recipient.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>

              {/* Type selector */}
              <div className="mb-3">
                <Label>Loại người nhận</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={recipientType === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecipientType("manual")}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Nhập thủ công
                  </Button>
                  <Button
                    type="button"
                    variant={recipientType === "external" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecipientType("external")}
                    className="flex-1"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Tổ chức bên ngoài
                  </Button>
                </div>
              </div>

              {recipientType === "manual" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`email-${recipient.id}`}>Email *</Label>
                    <Input
                      id={`email-${recipient.id}`}
                      type="email"
                      placeholder="email@example.com"
                      value={recipient.email}
                      onChange={(e) =>
                        updateRecipient(recipient.id, "email", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor={`name-${recipient.id}`}>Họ tên *</Label>
                    <Input
                      id={`name-${recipient.id}`}
                      placeholder="Nguyễn Văn A"
                      value={recipient.name}
                      onChange={(e) =>
                        updateRecipient(recipient.id, "name", e.target.value)
                      }
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor={`org-${recipient.id}`}>Chọn tổ chức *</Label>
                  <Select
                    value={recipient.email}
                    onValueChange={(value) => {
                      const org = externalOrgs?.find((o: any) => o.contact_email === value);
                      if (org) {
                        updateRecipient(recipient.id, "email", org.contact_email);
                        updateRecipient(recipient.id, "name", org.contact_person || org.name);
                      }
                    }}
                  >
                    <SelectTrigger id={`org-${recipient.id}`}>
                      <SelectValue placeholder="-- Chọn tổ chức --" />
                    </SelectTrigger>
                    <SelectContent>
                      {externalOrgs?.map((org: any) => (
                        <SelectItem key={org.id} value={org.contact_email}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{org.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {org.contact_person} - {org.contact_email}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {recipient.email && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div>Email: {recipient.email}</div>
                      <div>Người liên hệ: {recipient.name}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`role-${recipient.id}`}>Vai trò</Label>
                  <Select
                    value={recipient.role}
                    onValueChange={(value) =>
                      updateRecipient(recipient.id, "role", value)
                    }
                  >
                    <SelectTrigger id={`role-${recipient.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signer">
                        <span className="flex items-center gap-2">
                          ✍️ Người ký
                        </span>
                      </SelectItem>
                      <SelectItem value="approver">
                        <span className="flex items-center gap-2">
                          ✅ Người duyệt
                        </span>
                      </SelectItem>
                      <SelectItem value="cc">
                        <span className="flex items-center gap-2">
                          📧 Nhận bản sao
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`order-${recipient.id}`}>Thứ tự ký</Label>
                  <Input
                    id={`order-${recipient.id}`}
                    type="number"
                    min="1"
                    value={recipient.order}
                    onChange={(e) =>
                      updateRecipient(
                        recipient.id,
                        "order",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addRecipient}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm người nhận
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleContinue}>
            Tiếp tục đến Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
