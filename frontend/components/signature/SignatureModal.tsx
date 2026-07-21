'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SignatureCanvas, { SignatureCanvasRef } from './SignatureCanvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeCheck, Check, Pencil, Upload, Type, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/components/providers/i18n-provider';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureData: string, signatureType: 'drawn' | 'uploaded' | 'typed') => void;
  signerName: string;
  title?: string;
}

export default function SignatureModal({
  open,
  onClose,
  onConfirm,
  signerName,
  title = 'Ký tài liệu',
}: SignatureModalProps) {
  const { user, fetchMedia } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'saved' | 'draw' | 'upload' | 'type'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [savedSignature, setSavedSignature] = useState<string>('');
  const [typedName, setTypedName] = useState<string>(signerName);
  const [penColor, setPenColor] = useState('#111827');
  const [strokeSize, setStrokeSize] = useState<'thin' | 'medium' | 'bold'>('medium');
  const [showVerificationMark, setShowVerificationMark] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const canvasRef = useRef<SignatureCanvasRef>(null);

  const strokeWidths = {
    thin: { min: 0.6, max: 2 },
    medium: { min: 1.2, max: 4 },
    bold: { min: 2.5, max: 7 },
  }[strokeSize];

  useEffect(() => {
    if (!open || !user?.signature_image_url) {
      return;
    }
    let active = true;
    void fetchMedia('/users/profile/signature').then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    })).then((data) => {
      if (!active) return;
      setSavedSignature(data);
      setActiveTab('saved');
    }).catch(() => {
      if (active) setSavedSignature('');
    });
    return () => { active = false; };
  }, [fetchMedia, open, user?.signature_image_url]);

  const handleClear = () => {
    if (activeTab === 'draw') {
      canvasRef.current?.clear();
    } else if (activeTab === 'upload') {
      setUploadedImage('');
    } else if (activeTab === 'type') {
      setTypedName('');
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error(t('signature.error.imageType'));
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error(t('signature.error.imageSize'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateTypedSignature = (name: string): string => {
    // Create canvas to generate signature image from text
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Canvas is transparent by default. Preserve that alpha channel so typed
    // signatures behave exactly like drawn signatures in the final PDF.
    ctx.fillStyle = penColor;
    ctx.font = '48px "Brush Script MT", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const addVerificationMark = (source: string) => new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas is unavailable'));
      const scale = Math.min(510 / image.width, 220 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, 10, (240 - height) / 2, width, height);
      ctx.beginPath();
      ctx.moveTo(550, 119);
      ctx.lineTo(573, 142);
      ctx.lineTo(614, 94);
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Unable to compose signature'));
    image.src = source;
  });

  const handleConfirm = async () => {
    let signatureData = '';
    let signatureType: 'drawn' | 'uploaded' | 'typed' = 'drawn';
    const selectedTab = activeTab === 'saved' && !user?.signature_image_url ? 'draw' : activeTab;

    if (selectedTab === 'saved') {
      if (!savedSignature) return;
      signatureData = savedSignature;
      signatureType = user?.signature_type || 'uploaded';
    } else if (selectedTab === 'draw') {
      if (canvasRef.current?.isEmpty()) {
        toast.error(t('signature.error.drawRequired'));
        return;
      }
      signatureData = canvasRef.current?.toDataURL() ?? '';
      signatureType = 'drawn';
    } else if (selectedTab === 'upload') {
      if (!uploadedImage) {
        toast.error(t('signature.error.uploadRequired'));
        return;
      }
      signatureData = uploadedImage;
      signatureType = 'uploaded';
    } else if (selectedTab === 'type') {
      if (!typedName.trim()) {
        toast.error(t('signature.error.nameRequired'));
        return;
      }
      signatureData = generateTypedSignature(typedName);
      signatureType = 'typed';
    }

    setIsComposing(true);
    try {
      const finalSignature = showVerificationMark ? await addVerificationMark(signatureData) : signatureData;
      onConfirm(finalSignature, signatureType);
      onClose();
    } finally {
      setIsComposing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-4 pr-12">
          <DialogTitle className="text-xl">✍️ {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-base text-gray-600">
            {t('signature.signer')}: <span className="font-semibold">{signerName}</span>
          </div>

          <Tabs value={activeTab === 'saved' && !user?.signature_image_url ? 'draw' : activeTab} onValueChange={(v) => setActiveTab(v as 'saved' | 'draw' | 'upload' | 'type')}>
            <TabsList className={`grid h-12 w-full ${user?.signature_image_url ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {user?.signature_image_url && <TabsTrigger value="saved">{t('signature.saved.use')}</TabsTrigger>}
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                {t('signature.tabs.draw')}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('signature.tabs.upload')}
              </TabsTrigger>
              <TabsTrigger value="type" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                {t('signature.tabs.type')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="space-y-4">
              <div className="flex min-h-52 items-center justify-center rounded-lg border bg-white p-4">
                {savedSignature ? <Image src={savedSignature} alt="" width={600} height={240} unoptimized className="max-h-48 max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">{t('signature.saved.loading')}</p>}
              </div>
            </TabsContent>

            <TabsContent value="draw" className="space-y-4">
              <div className="flex flex-col items-center rounded-2xl border bg-slate-50 p-3 sm:p-5">
                <div className="relative flex w-full justify-center overflow-hidden rounded-xl bg-white shadow-inner">
                  <SignatureCanvas ref={canvasRef} width={700} height={260} penColor={penColor} minWidth={strokeWidths.min} maxWidth={strokeWidths.max} className="border-0" />
                  {showVerificationMark && <div className="pointer-events-none absolute right-5 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-green-600"><Check className="h-12 w-12 stroke-[3.5]" /></div>}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {t('signature.draw.help')}
                </p>
              </div>
              <div className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-medium text-slate-700">{t('signature.draw.color')}</p>
                  <div className="flex gap-3">
                    {[{ value: '#111827', label: 'Black' }, { value: '#2563eb', label: 'Blue' }, { value: '#dc2626', label: 'Red' }].map((color) => <button key={color.value} type="button" aria-label={color.label} onClick={() => setPenColor(color.value)} className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 ${penColor === color.value ? 'border-blue-500 ring-2 ring-blue-100' : 'border-white ring-1 ring-slate-200'}`} style={{ backgroundColor: color.value }}>{penColor === color.value && <Check className="h-5 w-5 text-white" />}</button>)}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium text-slate-700">{t('signature.draw.stroke')}</p>
                  <div className="flex gap-2">{(['thin', 'medium', 'bold'] as const).map((size) => <button key={size} type="button" onClick={() => setStrokeSize(size)} className={`flex h-10 min-w-20 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${strokeSize === size ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}><span className="rounded-full bg-current" style={{ width: size === 'thin' ? 4 : size === 'medium' ? 7 : 10, height: size === 'thin' ? 4 : size === 'medium' ? 7 : 10 }} />{t(`signature.draw.${size}`)}</button>)}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                  <Label htmlFor="signature-upload">{t('signature.upload.label')}</Label>
                  <Input
                    id="signature-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUpload}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('signature.upload.help')}
                  </p>
                </div>

                {uploadedImage && (
                  <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-white">
                    <Image
                      src={uploadedImage}
                      alt="Signature preview"
                      width={500}
                      height={200}
                      unoptimized
                      className="max-w-full h-auto max-h-48"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="type" className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                  <Label htmlFor="typed-name">{t('signature.type.label')}</Label>
                  <Input
                    id="typed-name"
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={t('signature.type.placeholder')}
                    className="mt-2"
                  />
                </div>

                {typedName && (
                  <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-white w-full max-w-md">
                    <div
                      className="text-center text-5xl"
                      style={{ fontFamily: '"Brush Script MT", cursive' }}
                    >
                      {typedName}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50/70 p-4">
            <div className="flex min-w-0 items-start gap-3"><BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-green-600" /><div><p className="font-medium text-slate-900">{t('signature.verified.title')}</p><p className="text-sm text-slate-600">{t('signature.verified.description')}</p></div></div>
            <Switch checked={showVerificationMark} onCheckedChange={setShowVerificationMark} aria-label={t('signature.verified.title')} />
          </div>

          <div className="flex justify-between border-t pt-5">
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-11 px-4"
            >
              <Trash2 className="w-4 h-4" />
              {t('signature.clear')}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="h-11 px-5">
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={isComposing} className="h-11 bg-blue-600 px-5 hover:bg-blue-700">
                ✅ {t('signature.confirm')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
