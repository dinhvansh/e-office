"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, History, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AVAILABLE_EVENTS = [
  { value: "document.created", label: "Tài liệu được tạo" },
  { value: "document.updated", label: "Tài liệu được cập nhật" },
  { value: "document.deleted", label: "Tài liệu bị xóa" },
  { value: "approval.started", label: "Phê duyệt bắt đầu" },
  { value: "approval.completed", label: "Phê duyệt hoàn thành" },
  { value: "approval.rejected", label: "Phê duyệt bị từ chối" },
  { value: "sign.started", label: "Ký bắt đầu" },
  { value: "sign.completed", label: "Ký hoàn thành" },
  { value: "sign.declined", label: "Ký bị từ chối" },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  created_at: string;
}

export default function WebhooksPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);
  
  // Form state
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [active, setActive] = useState(true);

  // Fetch webhooks
  const { data: webhooks = [], isLoading, error } = useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: async () => {
      console.log('🔍 Fetching webhooks...');
      try {
        const response = await fetchJson("/webhooks");
        console.log('📦 Webhooks response:', response);
        
        // Handle different response formats
        if (Array.isArray(response)) {
          console.log('✅ Got array directly:', response.length, 'webhooks');
          return response;
        }
        if (response && typeof response === 'object' && 'data' in response) {
          console.log('✅ Got data field:', response.data?.length || 0, 'webhooks');
          return response.data || [];
        }
        console.log('⚠️ Unexpected response format:', response);
        return [];
      } catch (err) {
        console.error('❌ Error fetching webhooks:', err);
        throw err;
      }
    },
  });

  console.log('🎯 Webhooks state:', { count: webhooks.length, isLoading, error });

  const createMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[]; secret?: string; active: boolean }) => {
      const endpoint = editingWebhook ? `/webhooks/${editingWebhook.id}` : "/webhooks";
      const method = editingWebhook ? "PUT" : "POST";
      
      await fetchJson(endpoint, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success(editingWebhook ? "Webhook đã được cập nhật!" : "Webhook đã được tạo thành công!");
      resetForm();
      setIsDialogOpen(false);
      // Delay before refetch to ensure DB has been updated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      }, 300);
    },
    onError: () => {
      toast.error("Không thể lưu webhook. Vui lòng thử lại.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson(`/webhooks/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook đã được xóa!");
    },
    onError: () => {
      toast.error("Không thể xóa webhook. Vui lòng thử lại.");
    },
  });

  const resetForm = () => {
    setUrl("");
    setSelectedEvents([]);
    setSecret("");
    setActive(true);
    setEditingWebhook(null);
  };

  const handleOpenDialog = (webhook?: Webhook) => {
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

  const handleSubmit = () => {
    // Validate URL
    if (!url) {
      toast.error("Vui lòng nhập URL");
      return;
    }

    // Validate URL format
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        toast.error("URL phải bắt đầu bằng http:// hoặc https://");
        return;
      }
    } catch (error) {
      toast.error("URL không hợp lệ. Vui lòng nhập URL đúng định dạng (ví dụ: https://api.example.com/webhook)");
      return;
    }

    // Validate events
    if (selectedEvents.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sự kiện");
      return;
    }

    createMutation.mutate({ url, events: selectedEvents, secret: secret || undefined, active });
  };

  const toggleEvent = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue) ? prev.filter((e) => e !== eventValue) : [...prev, eventValue]
    );
  };

  const filteredWebhooks = webhooks.filter(
    (webhook) =>
      webhook.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      webhook.events.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Webhooks</h1>
          <p className="text-muted-foreground">
            Tự động hóa quy trình bằng cách nhận thông báo về các sự kiện xảy ra trong hệ thống E-Office.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Chỉnh sửa Webhook" : "Thêm Webhook mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Secret (tùy chọn)</label>
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Nhập secret để xác thực webhook"
                />
                <p className="text-xs text-muted-foreground">
                  Secret sẽ được gửi trong header X-Esign-Signature
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Trạng thái</label>
                  <p className="text-xs text-muted-foreground">Kích hoạt webhook này</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sự kiện đã đăng ký</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg">
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
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang lưu..." : editingWebhook ? "Cập nhật" : "Tạo Webhook"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Nhật ký gửi</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo URL hoặc sự kiện..."
              className="pl-10"
            />
          </div>

          {/* Webhooks Table */}
          <div className="border rounded-lg overflow-hidden">
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
                      <p className="text-muted-foreground">Chưa có webhook nào</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Nhấn "Thêm Webhook" để bắt đầu
                      </p>
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
                        {webhook.created_at}
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
                          <Button variant="ghost" size="icon" title="Lịch sử">
                            <History className="h-4 w-4" />
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

        <TabsContent value="logs" className="space-y-4">
          <div className="border rounded-lg p-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nhật ký gửi webhook</p>
            <p className="text-sm text-muted-foreground mt-1">Tính năng đang được phát triển</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingWebhook}
        onOpenChange={(open) => !open && setDeletingWebhook(null)}
        title="Xóa Webhook"
        description={`Bạn có chắc chắn muốn xóa webhook "${deletingWebhook?.url}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (deletingWebhook) {
            deleteMutation.mutate(deletingWebhook.id);
            setDeletingWebhook(null);
          }
        }}
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
}
