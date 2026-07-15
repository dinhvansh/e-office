"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import NextImage from "next/image";
import { Image as ImageIcon, Loader2, Mail, Save, Settings, TestTube } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EmailConfig = {
  provider: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  smtp_from_name: string;
  use_oauth: boolean;
  oauth_client_id: string;
  oauth_client_secret: string;
  oauth_refresh_token: string;
};

type WatermarkFontFamily =
  | "helvetica"
  | "helvetica_bold"
  | "times_roman"
  | "times_bold"
  | "courier"
  | "courier_bold";

type WatermarkContentMode = "none" | "text" | "image" | "both";
type WatermarkStatusKey = "draft" | "in_progress" | "completed";

type WatermarkConfig = {
  enabled: boolean;
  text: string;
  draft_text: string;
  in_progress_text: string;
  completed_text: string;
  draft_mode: WatermarkContentMode;
  in_progress_mode: WatermarkContentMode;
  completed_mode: WatermarkContentMode;
  draft_image_data: string;
  draft_image_mime_type: string;
  in_progress_image_data: string;
  in_progress_image_mime_type: string;
  completed_image_data: string;
  completed_image_mime_type: string;
  image_scale: number;
  font_family: WatermarkFontFamily;
  position: "center" | "diagonal" | "top" | "bottom";
  opacity: number;
  fontSize: number;
  rotation: number;
  color: string;
  repeat: boolean;
};

const defaultEmailConfig: EmailConfig = {
  provider: "gmail",
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: false,
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  smtp_from_name: "E-Office",
  use_oauth: false,
  oauth_client_id: "",
  oauth_client_secret: "",
  oauth_refresh_token: "",
};

const defaultWatermarkConfig: WatermarkConfig = {
  enabled: false,
  text: "CHUA HOAN THANH",
  draft_text: "VAN BAN CHUA CO HIEU LUC",
  in_progress_text: "CHUA HOAN THANH",
  completed_text: "BAN PHAT HANH",
  draft_mode: "text",
  in_progress_mode: "text",
  completed_mode: "none",
  draft_image_data: "",
  draft_image_mime_type: "",
  in_progress_image_data: "",
  in_progress_image_mime_type: "",
  completed_image_data: "",
  completed_image_mime_type: "",
  image_scale: 0.35,
  font_family: "helvetica_bold",
  position: "diagonal",
  opacity: 0.15,
  fontSize: 60,
  rotation: 45,
  color: "#DC2626",
  repeat: true,
};

const watermarkFontOptions: Array<{ value: WatermarkFontFamily; label: string; preview: string }> = [
  { value: "helvetica_bold", label: "Helvetica Bold", preview: "Helvetica, Arial, sans-serif" },
  { value: "helvetica", label: "Helvetica", preview: "Helvetica, Arial, sans-serif" },
  { value: "times_bold", label: "Times Bold", preview: "\"Times New Roman\", Times, serif" },
  { value: "times_roman", label: "Times Roman", preview: "\"Times New Roman\", Times, serif" },
  { value: "courier_bold", label: "Courier Bold", preview: "\"Courier New\", Courier, monospace" },
  { value: "courier", label: "Courier", preview: "\"Courier New\", Courier, monospace" },
];

const watermarkModeOptions: Array<{ value: WatermarkContentMode; label: string }> = [
  { value: "none", label: "Tắt" },
  { value: "text", label: "Chỉ chữ" },
  { value: "image", label: "Chỉ ảnh" },
  { value: "both", label: "Chữ + ảnh" },
];

const statusMeta: Record<WatermarkStatusKey, { title: string; description: string; textKey: keyof WatermarkConfig; modeKey: keyof WatermarkConfig; imageDataKey: keyof WatermarkConfig; imageMimeKey: keyof WatermarkConfig }> = {
  draft: {
    title: "Trạng thái nháp",
    description: "Dùng khi tài liệu còn ở trạng thái draft.",
    textKey: "draft_text",
    modeKey: "draft_mode",
    imageDataKey: "draft_image_data",
    imageMimeKey: "draft_image_mime_type",
  },
  in_progress: {
    title: "Trạng thái đang xử lý",
    description: "Dùng cho pending approval, pending signature, in progress, rejected.",
    textKey: "in_progress_text",
    modeKey: "in_progress_mode",
    imageDataKey: "in_progress_image_data",
    imageMimeKey: "in_progress_image_mime_type",
  },
  completed: {
    title: "Trạng thái hoàn thành",
    description: "Dùng khi tài liệu đã completed hoặc signed.",
    textKey: "completed_text",
    modeKey: "completed_mode",
    imageDataKey: "completed_image_data",
    imageMimeKey: "completed_image_mime_type",
  },
};

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(defaultEmailConfig);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(defaultWatermarkConfig);
  const [testEmail, setTestEmail] = useState("");
  const [watermarkPreviewMode, setWatermarkPreviewMode] = useState<WatermarkStatusKey>("draft");

  useEffect(() => {
    void loadSettings();
  }, []);

  const previewFontFamily = useMemo(() => {
    return watermarkFontOptions.find((option) => option.value === watermarkConfig.font_family)?.preview
      || "Helvetica, Arial, sans-serif";
  }, [watermarkConfig.font_family]);

  const previewVariant = useMemo(() => resolvePreviewVariant(watermarkConfig, watermarkPreviewMode), [watermarkConfig, watermarkPreviewMode]);

  async function loadSettings() {
    try {
      setLoading(true);
      const [emailRes, watermarkRes] = await Promise.all([
        api.get("/settings/email"),
        api.get("/settings/watermark"),
      ]);

      if (emailRes.data.success && emailRes.data.data) {
        setEmailConfig((current) => ({ ...current, ...emailRes.data.data }));
      }

      if (watermarkRes.data.success && watermarkRes.data.data) {
        setWatermarkConfig((current) => ({ ...current, ...watermarkRes.data.data }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEmail() {
    try {
      setSaving(true);
      const res = await api.post("/settings/email", emailConfig);
      if (res.data.success) toast.success("Đã lưu cấu hình email");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Không thể lưu cấu hình");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testEmail.trim()) {
      toast.error("Nhập email nhận test trước khi gửi");
      return;
    }

    try {
      setTesting(true);
      const res = await api.post("/settings/email/test", { testEmail: testEmail.trim() });
      if (res.data.success) toast.success(res.data.message || "Email test đã được gửi");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Không thể gửi email test");
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveWatermark() {
    try {
      setSaving(true);
      const res = await api.post("/settings/watermark", watermarkConfig);
      if (res.data.success) toast.success("Đã lưu cấu hình watermark");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Không thể lưu cấu hình");
    } finally {
      setSaving(false);
    }
  }

  function updateWatermark<K extends keyof WatermarkConfig>(key: K, value: WatermarkConfig[K]) {
    setWatermarkConfig((current) => ({ ...current, [key]: value }));
  }

  function handleSmtpPortChange(value: string) {
    setEmailConfig((current) => {
      const next = { ...current, smtp_port: value };
      if (value === "465") next.smtp_secure = true;
      if (value === "587") next.smtp_secure = false;
      return next;
    });
  }

  async function handleStatusImageChange(status: WatermarkStatusKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh PNG hoặc JPG");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh watermark phải nhỏ hơn 5MB");
      event.target.value = "";
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const meta = statusMeta[status];
    setWatermarkConfig((current) => ({
      ...current,
      [meta.imageDataKey]: dataUrl,
      [meta.imageMimeKey]: file.type,
    }));
    event.target.value = "";
  }

  function removeStatusImage(status: WatermarkStatusKey) {
    const meta = statusMeta[status];
    setWatermarkConfig((current) => ({
      ...current,
      [meta.imageDataKey]: "",
      [meta.imageMimeKey]: "",
    }));
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Cài đặt hệ thống"
        description="Cấu hình email và watermark"
        iconColor="text-blue-600"
      />

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email SMTP
          </TabsTrigger>
          <TabsTrigger value="watermark">
            <ImageIcon aria-hidden="true" className="mr-2 h-4 w-4" />
            Watermark
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Email SMTP</CardTitle>
              <CardDescription>Thiết lập email server để gửi thông báo và email tự động</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select value={emailConfig.provider} onValueChange={(value) => setEmailConfig((current) => ({ ...current, provider: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="aws-ses">AWS SES</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                    <SelectItem value="custom">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div className="space-y-0.5">
                  <Label>Sử dụng OAuth 2.0</Label>
                  <p className="text-xs text-muted-foreground">Khuyến nghị cho Gmail và Outlook</p>
                </div>
                <Switch checked={emailConfig.use_oauth} onCheckedChange={(checked) => setEmailConfig((current) => ({ ...current, use_oauth: checked }))} />
              </div>

              {!emailConfig.use_oauth ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host</Label>
                      <Input id="smtp_host" value={emailConfig.smtp_host} onChange={(e) => setEmailConfig((current) => ({ ...current, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port</Label>
                      <Input id="smtp_port" value={emailConfig.smtp_port} onChange={(e) => handleSmtpPortChange(e.target.value)} placeholder="587" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                    <div className="space-y-0.5">
                      <Label>SSL/TLS trực tiếp</Label>
                      <p className="text-xs text-muted-foreground">Bật cho port 465. Port 587 thường dùng STARTTLS và để tắt.</p>
                    </div>
                    <Switch checked={Boolean(emailConfig.smtp_secure)} onCheckedChange={(checked) => setEmailConfig((current) => ({ ...current, smtp_secure: checked }))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">SMTP Username</Label>
                    <Input id="smtp_user" type="email" value={emailConfig.smtp_user} onChange={(e) => setEmailConfig((current) => ({ ...current, smtp_user: e.target.value }))} placeholder="your-email@gmail.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">SMTP Password / App Password</Label>
                    <Input id="smtp_password" type="password" value={emailConfig.smtp_password} onChange={(e) => setEmailConfig((current) => ({ ...current, smtp_password: e.target.value }))} placeholder="****************" />
                    <p className="text-xs text-muted-foreground">Với Gmail, sử dụng App Password thay vì mật khẩu thường.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oauth_client_id">OAuth Client ID</Label>
                    <Input id="oauth_client_id" value={emailConfig.oauth_client_id} onChange={(e) => setEmailConfig((current) => ({ ...current, oauth_client_id: e.target.value }))} placeholder="your-client-id.apps.googleusercontent.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oauth_client_secret">OAuth Client Secret</Label>
                    <Input id="oauth_client_secret" type="password" value={emailConfig.oauth_client_secret} onChange={(e) => setEmailConfig((current) => ({ ...current, oauth_client_secret: e.target.value }))} placeholder="****************" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oauth_refresh_token">OAuth Refresh Token</Label>
                    <Textarea id="oauth_refresh_token" value={emailConfig.oauth_refresh_token} onChange={(e) => setEmailConfig((current) => ({ ...current, oauth_refresh_token: e.target.value }))} placeholder="Paste refresh token here" rows={3} />
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from">From Email</Label>
                  <Input id="smtp_from" type="email" value={emailConfig.smtp_from} onChange={(e) => setEmailConfig((current) => ({ ...current, smtp_from: e.target.value }))} placeholder="noreply@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input id="smtp_from_name" value={emailConfig.smtp_from_name} onChange={(e) => setEmailConfig((current) => ({ ...current, smtp_from_name: e.target.value }))} placeholder="E-Office" />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
                <Label htmlFor="test_email">Email nhận test</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="test_email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="admin@company.com" className="bg-white" />
                  <Button variant="outline" onClick={handleTestEmail} disabled={testing || saving || !testEmail.trim()}>
                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                    {testing ? "Đang gửi..." : "Gửi test"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEmail} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watermark">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình watermark PDF</CardTitle>
              <CardDescription>Mỗi trạng thái tự chọn: chỉ chữ, chỉ ảnh, cả 2 hoặc tắt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div className="space-y-0.5">
                  <Label>Bật watermark</Label>
                  <p className="text-xs text-muted-foreground">Áp dụng rule riêng cho nháp, đang xử lý và hoàn thành.</p>
                </div>
                <Switch checked={watermarkConfig.enabled} onCheckedChange={(checked) => updateWatermark("enabled", checked)} />
              </div>

              {watermarkConfig.enabled && (
                <>
                  <div className="space-y-4">
                    {(Object.keys(statusMeta) as WatermarkStatusKey[]).map((status) => {
                      const meta = statusMeta[status];
                      const mode = watermarkConfig[meta.modeKey] as WatermarkContentMode;
                      const imageData = watermarkConfig[meta.imageDataKey] as string;
                      const textValue = watermarkConfig[meta.textKey] as string;

                      return (
                        <Card key={status} className="border-slate-200 bg-slate-50/50">
                          <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-base">{meta.title}</CardTitle>
                            <CardDescription>{meta.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label>Mode watermark</Label>
                                  <Select value={mode} onValueChange={(value) => updateWatermark(meta.modeKey, value as WatermarkContentMode)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {watermarkModeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="rounded-lg border bg-white p-3">
                                  {imageData ? (
                                    <NextImage src={imageData} alt={`${status} watermark`} width={576} height={144} unoptimized className="h-36 w-full rounded object-contain" />
                                  ) : (
                                    <div className="flex h-36 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                                      Chưa có watermark ảnh
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Input type="file" accept="image/png,image/jpeg" onChange={(event) => void handleStatusImageChange(status, event)} className="bg-white" />
                                  {imageData && (
                                    <Button type="button" variant="outline" onClick={() => removeStatusImage(status)}>
                                      Xóa ảnh
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`${status}_text`}>Nội dung watermark chữ</Label>
                                  <Textarea
                                    id={`${status}_text`}
                                    value={textValue}
                                    onChange={(e) => updateWatermark(meta.textKey, e.target.value)}
                                    placeholder="Nhập watermark cho trạng thái này"
                                    rows={3}
                                  />
                                </div>

                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                  Chế độ hiện tại: <strong>{watermarkModeOptions.find((option) => option.value === mode)?.label}</strong>.
                                  Nếu chọn chỉ ảnh hoặc cả 2 thì ảnh của riêng trạng thái này mới được dùng.
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-medium">Layout chung</Label>
                        <p className="text-xs text-muted-foreground">Thiết lập vị trí, font, độ mờ dùng chung cho các trạng thái.</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                        <Label className="text-xs text-muted-foreground">Lặp watermark</Label>
                        <Switch checked={watermarkConfig.repeat} onCheckedChange={(checked) => updateWatermark("repeat", checked)} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Font watermark</Label>
                        <Select value={watermarkConfig.font_family} onValueChange={(value) => updateWatermark("font_family", value as WatermarkFontFamily)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {watermarkFontOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Vị trí</Label>
                        <Select value={watermarkConfig.position} onValueChange={(value) => updateWatermark("position", value as WatermarkConfig["position"])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">Giữa trang</SelectItem>
                            <SelectItem value="diagonal">Chéo</SelectItem>
                            <SelectItem value="top">Phía trên</SelectItem>
                            <SelectItem value="bottom">Phía dưới</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="watermark_color">Màu sắc chữ</Label>
                        <div className="flex gap-2">
                          <input id="watermark_color" type="color" value={watermarkConfig.color} onChange={(e) => updateWatermark("color", e.target.value)} className="h-10 w-16 rounded border" />
                          <Input value={watermarkConfig.color} onChange={(e) => updateWatermark("color", e.target.value)} placeholder="#DC2626" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="opacity">Độ mờ: {watermarkConfig.opacity.toFixed(2)}</Label>
                        <input id="opacity" type="range" min="0.05" max="1" step="0.05" value={watermarkConfig.opacity} onChange={(e) => updateWatermark("opacity", Number(e.target.value))} className="w-full" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="font_size">Cỡ chữ: {watermarkConfig.fontSize}px</Label>
                        <input id="font_size" type="range" min="16" max="160" step="4" value={watermarkConfig.fontSize} onChange={(e) => updateWatermark("fontSize", Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rotation">Góc xoay: {watermarkConfig.rotation}°</Label>
                        <input id="rotation" type="range" min="-90" max="90" step="5" value={watermarkConfig.rotation} onChange={(e) => updateWatermark("rotation", Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_scale">Tỉ lệ watermark ảnh: {(watermarkConfig.image_scale * 100).toFixed(0)}%</Label>
                        <input id="image_scale" type="range" min="0.1" max="1.5" step="0.05" value={watermarkConfig.image_scale} onChange={(e) => updateWatermark("image_scale", Number(e.target.value))} className="w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Xem trước watermark</Label>
                    <div className="space-y-3">
                      <Select value={watermarkPreviewMode} onValueChange={(value) => setWatermarkPreviewMode(value as WatermarkStatusKey)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Nháp</SelectItem>
                          <SelectItem value="in_progress">Đang xử lý</SelectItem>
                          <SelectItem value="completed">Hoàn thành</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="relative h-80 overflow-hidden rounded-xl border-2 border-dashed bg-white">
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]" />
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                          Mẫu xem trước tài liệu PDF
                        </div>

                        {watermarkConfig.repeat ? (
                          <>
                            {renderPreviewImage(previewVariant.image_data, watermarkConfig, "left-1/2 top-1/2", 220)}
                            {renderPreviewImage(previewVariant.image_data, watermarkConfig, "left-[25%] top-[30%]", 180)}
                            {renderPreviewImage(previewVariant.image_data, watermarkConfig, "left-[72%] top-[72%]", 180)}
                            {renderPreviewText(previewVariant.text, watermarkConfig, previewFontFamily, "left-1/2 top-1/2")}
                            {renderPreviewText(previewVariant.text, watermarkConfig, previewFontFamily, "left-[25%] top-[30%]", true)}
                            {renderPreviewText(previewVariant.text, watermarkConfig, previewFontFamily, "left-[72%] top-[72%]", true)}
                          </>
                        ) : (
                          <>
                            {renderPreviewImage(previewVariant.image_data, watermarkConfig, "left-1/2 top-1/2", 220)}
                            {renderPreviewText(previewVariant.text, watermarkConfig, previewFontFamily, "left-1/2 top-1/2")}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      UI cho nhập tiếng Việt có dấu bình thường. Tuy nhiên watermark chữ trong file PDF thật vẫn dùng font chuẩn của PDF,
                      nên nếu cần chắc ăn trên file xuất ra thì nội dung chữ vẫn nên dùng không dấu. Watermark ảnh thì không bị giới hạn này.
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveWatermark} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function resolvePreviewVariant(config: WatermarkConfig, status: WatermarkStatusKey) {
  const meta = statusMeta[status];
  const mode = config[meta.modeKey] as WatermarkContentMode;
  const text = mode === "text" || mode === "both" ? String(config[meta.textKey] || "") : "";
  const image_data = mode === "image" || mode === "both" ? String(config[meta.imageDataKey] || "") : "";
  return { mode, text, image_data };
}

function renderPreviewImage(imageData: string, config: WatermarkConfig, positionClass: string, size: number) {
  if (!imageData) return null;
  return (
    <NextImage
      src={imageData}
      alt="Watermark preview"
      width={size}
      height={size}
      unoptimized
      className={`pointer-events-none absolute ${positionClass} object-contain`}
      style={{
        opacity: config.opacity,
        transform: `translate(-50%, -50%) rotate(${config.rotation}deg) scale(${config.image_scale})`,
        width: size,
        height: size,
      }}
    />
  );
}

function renderPreviewText(
  text: string,
  config: WatermarkConfig,
  fontFamily: string,
  positionClass: string,
  smaller = false,
) {
  if (!text) return null;
  return (
    <div
      className={`pointer-events-none absolute ${positionClass} whitespace-nowrap font-bold uppercase tracking-[0.2em]`}
      style={{
        opacity: config.opacity,
        transform: `translate(-50%, -50%) rotate(${config.rotation}deg)`,
        color: config.color,
        fontSize: `${smaller ? Math.max(16, config.fontSize - 12) : config.fontSize}px`,
        fontFamily,
      }}
    >
      {text}
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc file watermark"));
    reader.readAsDataURL(file);
  });
}
