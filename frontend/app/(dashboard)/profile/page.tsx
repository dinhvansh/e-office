"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, FileSignature, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const handleSave = () => {
    // TODO: Implement save profile
    console.log("Save profile:", formData);
    setIsEditing(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement avatar upload
    const file = e.target.files?.[0];
    if (file) {
      console.log("Upload avatar:", file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement signature upload
    const file = e.target.files?.[0];
    if (file) {
      console.log("Upload signature:", file);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={User}
        title="Thông tin cá nhân"
        description="Quản lý thông tin tài khoản và cài đặt"
        iconColor="text-blue-600"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Thông tin</TabsTrigger>
          <TabsTrigger value="avatar">Avatar</TabsTrigger>
          <TabsTrigger value="signature">Chữ ký</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="space-y-2">
                <Label>Vai trò</Label>
                <div className="px-3 py-2 bg-muted rounded-md">
                  <span className="capitalize">{user?.role || "user"}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    Chỉnh sửa
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Hủy
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avatar Tab */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>Tải lên ảnh đại diện của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-3xl">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Chọn ảnh JPG, PNG hoặc GIF. Kích thước tối đa 2MB.
                  </p>
                  <div>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button asChild>
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Tải lên ảnh
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                ⚠️ Chức năng đang phát triển
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signature Tab */}
        <TabsContent value="signature">
          <Card>
            <CardHeader>
              <CardTitle>Chữ ký điện tử</CardTitle>
              <CardDescription>Tải lên chữ ký để sử dụng khi ký tài liệu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileSignature className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Chưa có chữ ký. Tải lên ảnh chữ ký của bạn.
                </p>
                <input
                  type="file"
                  id="signature-upload"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <Button asChild>
                  <label htmlFor="signature-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Tải lên chữ ký
                  </label>
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Yêu cầu:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Định dạng: PNG với nền trong suốt (khuyến nghị)</li>
                  <li>Kích thước: Tối đa 1MB</li>
                  <li>Kích thước ảnh: 300x100 pixels (khuyến nghị)</li>
                </ul>
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                ⚠️ Chức năng đang phát triển
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
