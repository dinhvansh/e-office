"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { FileSignature, Save, Trash2, Upload, User } from "lucide-react";
import { toast } from "sonner";

import { useAuth, type AuthUser } from "@/components/providers/auth-provider";
import { useDestructiveConfirmation } from "@/components/providers/destructive-confirmation-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import SignatureModal from "@/components/signature/SignatureModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Profile = AuthUser & {
  signature_image_url?: string | null;
};

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const { user, fetchJson, fetchMedia, syncUser } = useAuth();
  const confirmDestructive = useDestructiveConfirmation();
  const { locale, t } = useI18n();
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab === "avatar" || requestedTab === "signature" ? requestedTab : "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);

  const changeTab = (value: string) => {
    const nextTab = value === "avatar" || value === "signature" ? value : "profile";
    setActiveTab(nextTab);
    const url = new URL(window.location.href);
    if (nextTab === "profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", nextTab);
    window.history.replaceState(window.history.state, "", url);
  };

  useEffect(() => {
    let active = true;
    void fetchJson<Profile>("/users/profile").then((data) => {
      if (!active) return;
      setProfile(data);
      setFormData({ full_name: data.full_name || "", phone: data.phone || "" });
      syncUser(data);
    }).catch(() => toast.error(t("profile.error.generic")));
    return () => { active = false; };
  }, [fetchJson, syncUser, t]);

  useEffect(() => {
    let active = true;
    let avatarObjectUrl: string | undefined;
    let signatureObjectUrl: string | undefined;
    const load = async () => {
      if (profile?.avatar_url) {
        try {
          avatarObjectUrl = URL.createObjectURL(await fetchMedia("/users/profile/avatar"));
          if (active) setAvatarPreview(avatarObjectUrl);
        } catch { if (active) setAvatarPreview(null); }
      } else setAvatarPreview(null);
      if (profile?.signature_image_url) {
        try {
          signatureObjectUrl = URL.createObjectURL(await fetchMedia("/users/profile/signature"));
          if (active) setSignaturePreview(signatureObjectUrl);
        } catch { if (active) setSignaturePreview(null); }
      } else setSignaturePreview(null);
    };
    void load();
    return () => {
      active = false;
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
      if (signatureObjectUrl) URL.revokeObjectURL(signatureObjectUrl);
    };
  }, [fetchMedia, mediaVersion, profile?.avatar_url, profile?.signature_image_url]);

  const initials = useMemo(() => {
    const source = profile?.full_name || user?.full_name || user?.email || "U";
    return source.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
  }, [profile?.full_name, user?.email, user?.full_name]);

  const applyProfile = (next: Profile) => {
    setProfile(next);
    setFormData({ full_name: next.full_name || "", phone: next.phone || "" });
    syncUser({ ...next, avatar_url: next.avatar_url ? `${next.avatar_url}?v=${Date.now()}` : null });
    setMediaVersion((value) => value + 1);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const next = await fetchJson<Profile>("/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: formData.full_name, phone: formData.phone || null }),
      });
      applyProfile(next);
      setIsEditing(false);
      toast.success(t("profile.saved"));
    } catch { toast.error(t("profile.error.generic")); }
    finally { setIsSaving(false); }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error(t("profile.validation.avatar"));
      return;
    }
    try {
      const next = await fetchJson<Profile>("/users/profile/avatar", {
        method: "POST",
        body: JSON.stringify({ image_data: await readAsDataUrl(file) }),
      });
      applyProfile(next);
      toast.success(t("profile.avatar.saved"));
    } catch { toast.error(t("profile.error.generic")); }
  };

  const removeAvatar = () => confirmDestructive({
    title: t("profile.avatar.removeTitle"),
    targetName: profile?.full_name || profile?.email || "",
    description: t("profile.avatar.removeDescription"),
    confirmLabel: t("profile.avatar.remove"),
    errorMessage: t("profile.error.generic"),
  }, async () => {
    const next = await fetchJson<Profile>("/users/profile/avatar", { method: "DELETE" });
    applyProfile(next);
    toast.success(t("profile.avatar.removed"));
  });

  const saveSignature = async (imageData: string, signatureType: 'drawn' | 'uploaded' | 'typed') => {
    try {
      const next = await fetchJson<Profile>("/users/profile/signature", {
        method: "POST",
        body: JSON.stringify({ image_data: imageData, signature_type: signatureType }),
      });
      applyProfile(next);
      toast.success(t("profile.signature.saved"));
    } catch { toast.error(t("profile.error.generic")); }
  };

  const removeSignature = () => confirmDestructive({
    title: t("profile.signature.removeTitle"),
    targetName: profile?.full_name || profile?.email || "",
    description: t("profile.signature.removeDescription"),
    confirmLabel: t("profile.signature.remove"),
    errorMessage: t("profile.error.generic"),
  }, async () => {
    const next = await fetchJson<Profile>("/users/profile/signature", { method: "DELETE" });
    applyProfile(next);
    toast.success(t("profile.signature.removed"));
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={User} title={t("profile.title")} description={t("profile.description")} iconColor="text-blue-600" />
      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">{t("profile.tabs.information")}</TabsTrigger>
          <TabsTrigger value="avatar">{t("profile.tabs.avatar")}</TabsTrigger>
          <TabsTrigger value="signature">{t("profile.tabs.signature")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card><CardHeader><CardTitle>{t("profile.information.title")}</CardTitle><CardDescription>{t("profile.information.description")}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="full_name">{t("profile.fullName")}</Label><Input id="full_name" value={formData.full_name} onChange={(event) => setFormData({ ...formData, full_name: event.target.value })} disabled={!isEditing} /></div>
              <div className="space-y-2"><Label htmlFor="email">{t("profile.email")}</Label><Input id="email" type="email" value={profile?.email || user?.email || ""} disabled className="bg-muted" /><p className="text-xs text-muted-foreground">{t("profile.emailReadonly")}</p></div>
              <div className="space-y-2"><Label htmlFor="phone">{t("profile.phone")}</Label><Input id="phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} disabled={!isEditing} placeholder={t("profile.phonePlaceholder")} /></div>
              <div className="space-y-2"><Label>{t("profile.role")}</Label><div className="rounded-md bg-muted px-3 py-2"><span>{user?.role || "user"}</span></div></div>
              <div className="flex gap-2 pt-4">{!isEditing ? <Button onClick={() => setIsEditing(true)}>{t("profile.edit")}</Button> : <><Button onClick={handleSave} disabled={isSaving || !formData.full_name.trim()}><Save className="mr-2 h-4 w-4" />{isSaving ? t("common.saving") : t("common.save")}</Button><Button variant="outline" onClick={() => { setIsEditing(false); setFormData({ full_name: profile?.full_name || "", phone: profile?.phone || "" }); }}>{t("common.cancel")}</Button></>}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avatar">
          <Card><CardHeader><CardTitle>{t("profile.avatar.title")}</CardTitle><CardDescription>{t("profile.avatar.description")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-3xl font-bold text-white">{avatarPreview ? <Image src={avatarPreview} alt="" width={112} height={112} unoptimized className="h-full w-full object-cover" /> : initials}</div>
              <div className="flex flex-wrap gap-2"><input type="file" id="avatar-upload" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} className="hidden" /><Button asChild><label htmlFor="avatar-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />{avatarPreview ? t("profile.avatar.replace") : t("profile.avatar.upload")}</label></Button>{profile?.avatar_url && <Button variant="outline" onClick={removeAvatar}><Trash2 className="mr-2 h-4 w-4" />{t("profile.avatar.remove")}</Button>}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature">
          <Card><CardHeader><CardTitle>{t("profile.signature.title")}</CardTitle><CardDescription>{t("profile.signature.description")}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex min-h-48 items-center justify-center rounded-lg border-2 border-dashed bg-white p-6">{signaturePreview ? <Image src={signaturePreview} alt="" width={600} height={240} unoptimized className="max-h-40 max-w-full object-contain" /> : <div className="text-center text-muted-foreground"><FileSignature className="mx-auto mb-3 h-12 w-12" /><p>{t("profile.signature.none")}</p></div>}</div>
              {profile?.signature_updated_at && <p className="text-sm text-muted-foreground">{t("profile.signature.updatedAt", { time: new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(profile.signature_updated_at)) })}</p>}
              <div className="flex flex-wrap gap-2"><Button onClick={() => setSignatureModalOpen(true)}><FileSignature className="mr-2 h-4 w-4" />{signaturePreview ? t("profile.signature.replace") : t("profile.signature.create")}</Button>{profile?.signature_image_url && <Button variant="outline" onClick={removeSignature}><Trash2 className="mr-2 h-4 w-4" />{t("profile.signature.remove")}</Button>}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SignatureModal open={signatureModalOpen} onClose={() => setSignatureModalOpen(false)} onConfirm={(data, type) => void saveSignature(data, type)} signerName={profile?.full_name || user?.full_name || user?.email || ""} title={t("profile.signature.title")} />
    </div>
  );
}
