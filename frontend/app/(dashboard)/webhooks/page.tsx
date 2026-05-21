"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Edit, History, KeyRound, Plus, Search, Trash2, Webhook } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AVAILABLE_EVENTS = [
  { value: "document.created", label: "Tài liệu được tạo" },
  { value: "document.updated", label: "Tài liệu được cập nhật" },
  { value: "document.deleted", label: "Tài liệu bị xóa" },
  { value: "approval.started", label: "Phê duyệt bắt đầu" },
  { value: "approval.completed", label: "Phê duyệt hoàn thành" },
  { value: "approval.rejected", label: "Phê duyệt bị từ chối" },
  { value: "sign.started", label: "Ký điện tử bắt đầu" },
  { value: "sign.completed", label: "Ký điện tử hoàn thành" },
  { value: "sign.declined", label: "Ký điện tử bị từ chối" },
];

type WebhookItem = {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  created_at: string;
};

type ApiTokenItem = {
  id: string;
  name: string;
  token_prefix: string;
  created_by_email: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type CreateApiTokenResponse = {
  token: string;
  metadata: ApiTokenItem;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export default function WebhooksPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<WebhookItem | null>(null);
  const [deletingApiToken, setDeletingApiToken] = useState<ApiTokenItem | null>(null);
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const [apiTokenName, setApiTokenName] = useState("");

  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [active, setActive] = useState(true);

  const { data: webhooks = [] } = useQuery<WebhookItem[]>({
    queryKey: ["webhooks"],
    queryFn: () => fetchJson("/webhooks"),
  });

  const { data: apiTokens = [] } = useQuery<ApiTokenItem[]>({
    queryKey: ["webhooks", "api-tokens"],
    queryFn: () => fetchJson("/webhooks/api-tokens"),
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[]; secret?: string; active: boolean }) => {
      const endpoint = editingWebhook ? `/webhooks/${editingWebhook.id}` : "/webhooks";
      const method = editingWebhook ? "PUT" : "POST";

      await fetchJson(endpoint, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success(editingWebhook ? "Đã cập nhật webhook." : "Đã tạo webhook.");
      resetForm();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể lưu webhook.");
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson(`/webhooks/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Đã xóa webhook.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể xóa webhook.");
    },
  });

  const createApiTokenMutation = useMutation({
    mutationFn: async (name: string) =>
      fetchJson<CreateApiTokenResponse>("/webhooks/api-tokens", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (response) => {
      setLatestToken(response.token);
      setApiTokenName("");
      queryClient.invalidateQueries({ queryKey: ["webhooks", "api-tokens"] });
      toast.success("Đã tạo API token. Token đầy đủ chỉ hiển thị một lần.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể tạo API token.");
    },
  });

  const revokeApiTokenMutation = useMutation({
    mutationFn: async (id: string) =>
      fetchJson(`/webhooks/api-tokens/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", "api-tokens"] });
      toast.success("Đã thu hồi API token.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể thu hồi API token.");
    },
  });

  const resetForm = () => {
    setUrl("");
    setSelectedEvents([]);
    setSecret("");
    setActive(true);
    setEditingWebhook(null);
  };

  const handleOpenDialog = (webhook?: WebhookItem) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setUrl(webhook.url);
      setSelectedEvents(webhook.events);
      setSecret(webhook.secret || "");
      setActive(webhook.active);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmitWebhook = () => {
    if (!url) {
      toast.error("Vui lòng nhập URL.");
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        toast.error("URL phải bắt đầu bằng http:// hoặc https://.");
        return;
      }
    } catch {
      toast.error("URL không hợp lệ. Ví dụ: https://api.example.com/webhook");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sự kiện.");
      return;
    }

    createWebhookMutation.mutate({
      url,
      events: selectedEvents,
      secret: secret || undefined,
      active,
    });
  };

  const toggleEvent = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue) ? prev.filter((item) => item !== eventValue) : [...prev, eventValue]
    );
  };

  const handleCopy = async (value: string, successMessage = "Đã sao chép.") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Không thể sao chép vào clipboard.");
    }
  };

  const filteredWebhooks = webhooks.filter(
    (webhook) =>
      webhook.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      webhook.events.some((event) => event.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Webhooks và API Token</h1>
          <p className="text-muted-foreground">
            Cấu hình webhook để nhận sự kiện và tạo API token để hệ thống ngoài gọi vào E-Office.
          </p>
          <Link
            href="/docs/webhooks-api-token"
            target="_blank"
            className="inline-flex pt-2 text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            Mở documentation public
          </Link>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Chỉnh sửa webhook" : "Thêm webhook mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Secret</label>
                <Input
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="Nhập secret để ký header X-Esign-Signature"
                />
                <p className="text-xs text-muted-foreground">
                  Nếu có secret, hệ thống sẽ gửi thêm header `X-Esign-Signature`.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Trạng thái</p>
                  <p className="text-xs text-muted-foreground">Bật hoặc tắt webhook này.</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sự kiện đăng ký</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border p-4">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSubmitWebhook} disabled={createWebhookMutation.isPending}>
                  {createWebhookMutation.isPending ? "Đang lưu..." : editingWebhook ? "Cập nhật" : "Tạo webhook"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-token">API Token</TabsTrigger>
          <TabsTrigger value="logs">Nhật ký gửi</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo URL hoặc sự kiện..."
              className="pl-10"
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Endpoint URL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sự kiện
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWebhooks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Webhook className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Chưa có webhook nào.</p>
                      <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm webhook" để bắt đầu.</p>
                    </td>
                  </tr>
                ) : (
                  filteredWebhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={webhook.active ? "default" : "secondary"}>
                          <span className={`w-2 h-2 mr-2 rounded-full ${webhook.active ? "bg-green-500" : "bg-gray-500"}`} />
                          {webhook.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{webhook.url}</td>
                      <td className="px-6 py-4 text-sm">
                        {webhook.events.length > 2
                          ? `${webhook.events.slice(0, 2).join(", ")}...`
                          : webhook.events.join(", ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(webhook.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(webhook)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingWebhook(webhook)}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="api-token" className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Tạo API token</h2>
              <p className="text-sm text-muted-foreground">
                Token dùng để hệ thống ngoài gọi API. Token kế thừa quyền của user đang tạo token.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={apiTokenName}
                onChange={(event) => setApiTokenName(event.target.value)}
                placeholder="Ví dụ: ERP Integration"
              />
              <Button
                onClick={() => {
                  if (apiTokenName.trim().length < 3) {
                    toast.error("Tên token phải có ít nhất 3 ký tự.");
                    return;
                  }
                  createApiTokenMutation.mutate(apiTokenName.trim());
                }}
                disabled={createApiTokenMutation.isPending}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {createApiTokenMutation.isPending ? "Đang tạo..." : "Tạo API token"}
              </Button>
            </div>

            {latestToken ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-amber-900">Token mới tạo</p>
                    <p className="text-sm text-amber-800">
                      Token đầy đủ chỉ hiển thị một lần. Hãy sao chép và lưu ở nơi an toàn.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(latestToken, "Đã sao chép API token.")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Sao chép
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-white p-3 text-xs border">{latestToken}</pre>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Danh sách token</h2>
                <p className="text-sm text-muted-foreground">
                  Chỉ hiển thị tiền tố token. Có thể thu hồi bất cứ lúc nào.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  handleCopy(
                    "Authorization: Bearer <API_TOKEN>",
                    "Đã sao chép mẫu header Authorization."
                  )
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                Mẫu header
              </Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tên token
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tiền tố
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Người tạo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lần dùng cuối
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {apiTokens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <KeyRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Chưa có API token nào.</p>
                      </td>
                    </tr>
                  ) : (
                    apiTokens.map((token) => (
                      <tr key={token.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 text-sm font-medium">{token.name}</td>
                        <td className="px-6 py-4 text-sm font-mono">{token.token_prefix}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {token.created_by_email || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {token.revoked_at ? "Đã thu hồi" : formatDate(token.last_used_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingApiToken(token)}
                            disabled={!!token.revoked_at}
                            title="Thu hồi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Gọi API bằng token</p>
              <pre className="overflow-x-auto rounded-md bg-background p-3 border text-xs">{`curl -X GET "http://localhost:4000/api/v1/documents" \\
  -H "Authorization: Bearer <API_TOKEN>" \\
  -H "Content-Type: application/json"`}</pre>
              <p className="text-muted-foreground">
                Tài liệu chi tiết nằm tại <code>docs/WEBHOOK-API-TOKEN-GUIDE.md</code>.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="rounded-lg border p-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nhật ký gửi webhook</p>
            <p className="text-sm text-muted-foreground mt-1">
              Hiện backend đã lưu log gửi. Phần hiển thị chi tiết trên giao diện sẽ nối tiếp ở bước sau.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deletingWebhook}
        onOpenChange={(open) => !open && setDeletingWebhook(null)}
        title="Xóa webhook"
        description={`Bạn có chắc chắn muốn xóa webhook "${deletingWebhook?.url}"?`}
        onConfirm={() => {
          if (deletingWebhook) {
            deleteWebhookMutation.mutate(deletingWebhook.id);
            setDeletingWebhook(null);
          }
        }}
        confirmText="Xóa"
        cancelText="Hủy"
      />

      <ConfirmDialog
        open={!!deletingApiToken}
        onOpenChange={(open) => !open && setDeletingApiToken(null)}
        title="Thu hồi API token"
        description={`Bạn có chắc chắn muốn thu hồi token "${deletingApiToken?.name}"?`}
        onConfirm={() => {
          if (deletingApiToken) {
            revokeApiTokenMutation.mutate(deletingApiToken.id);
            setDeletingApiToken(null);
          }
        }}
        confirmText="Thu hồi"
        cancelText="Hủy"
      />
    </div>
  );
}
