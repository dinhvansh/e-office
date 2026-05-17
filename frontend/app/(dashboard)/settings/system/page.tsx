"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Mail, Image, Save, TestTube, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [emailConfig, setEmailConfig] = useState({
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
    oauth_refresh_token: ""
  });

  const [watermarkConfig, setWatermarkConfig] = useState({
    enabled: false,
    text: "CÔNG TY CỔ PHẦN ABC",
    position: "center",
    opacity: 0.3,
    fontSize: 48,
    rotation: 45,
    color: "#000000"
  });
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [emailRes, watermarkRes] = await Promise.all([
        api.get('/settings/email'),
        api.get('/settings/watermark')
      ]);

      if (emailRes.data.success && emailRes.data.data) {
        setEmailConfig((current) => ({ ...current, ...emailRes.data.data }));
      }

      if (watermarkRes.data.success && watermarkRes.data.data) {
        setWatermarkConfig(watermarkRes.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setSaving(true);
      const res = await api.post('/settings/email', emailConfig);
      if (res.data.success) {
        toast.success('Đã lưu cấu hình email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Nhập email nhận test trước khi gửi');
      return;
    }

    try {
      setTesting(true);
      const res = await api.post('/settings/email/test', { testEmail: testEmail.trim() });
      if (res.data.success) {
        toast.success(res.data.message || 'Email test đã được gửi');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể gửi email test');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveWatermark = async () => {
    try {
      setSaving(true);
      const res = await api.post('/settings/watermark', watermarkConfig);
      if (res.data.success) {
        toast.success('Đã lưu cấu hình watermark');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
            <Mail className="w-4 h-4 mr-2" />
            Email SMTP
          </TabsTrigger>
          <TabsTrigger value="watermark">
            <Image className="w-4 h-4 mr-2" />
            Watermark
          </TabsTrigger>
        </TabsList>

        {/* Email SMTP Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Email SMTP</CardTitle>
              <CardDescription>
                Thiết lập email server để gửi thông báo và email tự động
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select value={emailConfig.provider} onValueChange={(value) => setEmailConfig({ ...emailConfig, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

              {/* OAuth vs SMTP */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label>Sử dụng OAuth 2.0</Label>
                  <p className="text-xs text-muted-foreground">
                    Khuyến nghị cho Gmail và Outlook
                  </p>
                </div>
                <Switch
                  checked={emailConfig.use_oauth}
                  onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, use_oauth: checked })}
                />
              </div>

              {!emailConfig.use_oauth ? (
                // SMTP Configuration
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host</Label>
                      <Input
                        id="smtp_host"
                        value={emailConfig.smtp_host}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port</Label>
                      <Input
                        id="smtp_port"
                        value={emailConfig.smtp_port}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                        placeholder="587"
                      />
                  </div>
                </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="space-y-0.5">
                      <Label>SSL/TLS trực tiếp</Label>
                      <p className="text-xs text-muted-foreground">
                        Bật cho port 465. Port 587 thường dùng STARTTLS và để tắt.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(emailConfig.smtp_secure)}
                      onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, smtp_secure: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">SMTP Username</Label>
                    <Input
                      id="smtp_user"
                      type="email"
                      value={emailConfig.smtp_user}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">SMTP Password / App Password</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      value={emailConfig.smtp_password}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                      placeholder="••••••••••••••••"
                    />
                    <p className="text-xs text-muted-foreground">
                      Với Gmail, sử dụng App Password thay vì mật khẩu thường
                    </p>
                  </div>
                </div>
              ) : (
                // OAuth Configuration
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oauth_client_id">OAuth Client ID</Label>
                    <Input
                      id="oauth_client_id"
                      value={emailConfig.oauth_client_id}
                      onChange={(e) => setEmailConfig({ ...emailConfig, oauth_client_id: e.target.value })}
                      placeholder="your-client-id.apps.googleusercontent.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oauth_client_secret">OAuth Client Secret</Label>
                    <Input
                      id="oauth_client_secret"
                      type="password"
                      value={emailConfig.oauth_client_secret}
                      onChange={(e) => setEmailConfig({ ...emailConfig, oauth_client_secret: e.target.value })}
                      placeholder="••••••••••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oauth_refresh_token">OAuth Refresh Token</Label>
                    <Textarea
                      id="oauth_refresh_token"
                      value={emailConfig.oauth_refresh_token}
                      onChange={(e) => setEmailConfig({ ...emailConfig, oauth_refresh_token: e.target.value })}
                      placeholder="Paste refresh token here"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* From Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from">From Email</Label>
                  <Input
                    id="smtp_from"
                    type="email"
                    value={emailConfig.smtp_from}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from: e.target.value })}
                    placeholder="noreply@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input
                    id="smtp_from_name"
                    value={emailConfig.smtp_from_name}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_name: e.target.value })}
                    placeholder="E-Office"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
                <Label htmlFor="test_email">Email nhận test</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="bg-white"
                  />
                  <Button variant="outline" onClick={handleTestEmail} disabled={testing || saving || !testEmail.trim()}>
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                    {testing ? "Đang gửi..." : "Gửi test"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lưu cấu hình trước, sau đó gửi email test để xác nhận SMTP hoạt động.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEmail} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 Hướng dẫn</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Gmail: Sử dụng App Password (không dùng mật khẩu thường)</li>
                  <li>• Outlook: Hỗ trợ cả SMTP và OAuth 2.0</li>
                  <li>• SendGrid/Mailgun: Sử dụng API key làm password</li>
                  <li>• Cấu hình được lưu riêng cho từng công ty (tenant)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Watermark Tab */}
        <TabsContent value="watermark">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Watermark</CardTitle>
              <CardDescription>
                Thiết lập watermark cho tài liệu PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label>Bật Watermark</Label>
                  <p className="text-xs text-muted-foreground">
                    Tự động thêm watermark vào tất cả PDF
                  </p>
                </div>
                <Switch
                  checked={watermarkConfig.enabled}
                  onCheckedChange={(checked) => setWatermarkConfig({ ...watermarkConfig, enabled: checked })}
                />
              </div>

              {watermarkConfig.enabled && (
                <>
                  {/* Watermark Text */}
                  <div className="space-y-2">
                    <Label htmlFor="watermark_text">Nội dung Watermark</Label>
                    <Input
                      id="watermark_text"
                      value={watermarkConfig.text}
                      onChange={(e) => setWatermarkConfig({ ...watermarkConfig, text: e.target.value })}
                      placeholder="CÔNG TY CỔ PHẦN ABC"
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label>Vị trí</Label>
                    <Select value={watermarkConfig.position} onValueChange={(value) => setWatermarkConfig({ ...watermarkConfig, position: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Giữa trang</SelectItem>
                        <SelectItem value="diagonal">Chéo (45°)</SelectItem>
                        <SelectItem value="top">Trên cùng</SelectItem>
                        <SelectItem value="bottom">Dưới cùng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Appearance Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opacity">Độ mờ: {watermarkConfig.opacity}</Label>
                      <input
                        id="opacity"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={watermarkConfig.opacity}
                        onChange={(e) => setWatermarkConfig({ ...watermarkConfig, opacity: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fontSize">Kích thước chữ: {watermarkConfig.fontSize}px</Label>
                      <input
                        id="fontSize"
                        type="range"
                        min="24"
                        max="72"
                        step="4"
                        value={watermarkConfig.fontSize}
                        onChange={(e) => setWatermarkConfig({ ...watermarkConfig, fontSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rotation">Góc xoay: {watermarkConfig.rotation}°</Label>
                      <input
                        id="rotation"
                        type="range"
                        min="0"
                        max="90"
                        step="15"
                        value={watermarkConfig.rotation}
                        onChange={(e) => setWatermarkConfig({ ...watermarkConfig, rotation: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">Màu sắc</Label>
                      <div className="flex gap-2">
                        <input
                          id="color"
                          type="color"
                          value={watermarkConfig.color}
                          onChange={(e) => setWatermarkConfig({ ...watermarkConfig, color: e.target.value })}
                          className="h-10 w-20 rounded border"
                        />
                        <Input
                          value={watermarkConfig.color}
                          onChange={(e) => setWatermarkConfig({ ...watermarkConfig, color: e.target.value })}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <Label>Xem trước</Label>
                    <div className="relative h-64 bg-white border-2 border-dashed rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-300 text-sm">Nội dung tài liệu PDF</div>
                      </div>
                      <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          opacity: watermarkConfig.opacity,
                          transform: `rotate(${watermarkConfig.rotation}deg)`,
                          color: watermarkConfig.color,
                          fontSize: `${watermarkConfig.fontSize}px`,
                          fontWeight: 'bold',
                          userSelect: 'none'
                        }}
                      >
                        {watermarkConfig.text}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveWatermark} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 Hướng dẫn</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Watermark sẽ tự động áp dụng cho tất cả PDF được tạo</li>
                  <li>• Có thể tùy chỉnh vị trí, màu sắc, độ mờ và góc xoay</li>
                  <li>• Cấu hình được lưu riêng cho từng công ty</li>
                  <li>• Xem trước để kiểm tra trước khi lưu</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
