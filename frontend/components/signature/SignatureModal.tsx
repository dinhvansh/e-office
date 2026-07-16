'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SignatureCanvas, { SignatureCanvasRef } from './SignatureCanvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Upload, Type, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState<'draw' | 'upload' | 'type'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [typedName, setTypedName] = useState<string>(signerName);
  const canvasRef = useRef<SignatureCanvasRef>(null);

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
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 2MB');
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
    ctx.fillStyle = 'black';
    ctx.font = '48px "Brush Script MT", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const handleConfirm = () => {
    let signatureData = '';
    let signatureType: 'drawn' | 'uploaded' | 'typed' = 'drawn';

    if (activeTab === 'draw') {
      if (canvasRef.current?.isEmpty()) {
        toast.error('Vui lòng vẽ chữ ký');
        return;
      }
      signatureData = canvasRef.current?.toDataURL() ?? '';
      signatureType = 'drawn';
    } else if (activeTab === 'upload') {
      if (!uploadedImage) {
        toast.error('Vui lòng tải lên ảnh chữ ký');
        return;
      }
      signatureData = uploadedImage;
      signatureType = 'uploaded';
    } else if (activeTab === 'type') {
      if (!typedName.trim()) {
        toast.error('Vui lòng nhập tên');
        return;
      }
      signatureData = generateTypedSignature(typedName);
      signatureType = 'typed';
    }

    onConfirm(signatureData, signatureType);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-4 pr-12">
          <DialogTitle className="text-xl">✍️ {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-base text-gray-600">
            Người ký: <span className="font-semibold">{signerName}</span>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid h-12 w-full grid-cols-3">
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Vẽ
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Tải lên
              </TabsTrigger>
              <TabsTrigger value="type" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Gõ tên
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="space-y-4">
              <div className="flex flex-col items-center">
                <SignatureCanvas ref={canvasRef} width={500} height={200} />
                <p className="text-sm text-gray-500 mt-2">
                  Vẽ chữ ký của bạn trong khung trên
                </p>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                  <Label htmlFor="signature-upload">Chọn ảnh chữ ký</Label>
                  <Input
                    id="signature-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Định dạng: PNG, JPG, GIF. Tối đa 2MB
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
                  <Label htmlFor="typed-name">Nhập tên của bạn</Label>
                  <Input
                    id="typed-name"
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Nguyễn Văn A"
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

          <div className="flex justify-between border-t pt-5">
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-11 px-4"
            >
              <Trash2 className="w-4 h-4" />
              Xóa
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="h-11 px-5">
                Hủy
              </Button>
              <Button onClick={handleConfirm} className="h-11 bg-blue-600 px-5 hover:bg-blue-700">
                ✅ Xác nhận
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
