'use client';

import Image from 'next/image';
import { CheckCircle2, Clock, Download, FileText, Printer, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThankYouPageProps {
  signerName?: string;
  signerEmail?: string;
  signerRole?: string;
  documentTitle?: string;
  documentNumber?: string;
  originalFileName?: string;
  signedAt?: string;
  signRequestTitle?: string;
  onDownload?: () => void;
}

export default function ThankYouPage({
  signerName,
  signerEmail,
  signerRole,
  documentTitle,
  documentNumber,
  originalFileName,
  signedAt,
  signRequestTitle,
  onDownload,
}: ThankYouPageProps) {
  const signedTime = signedAt
    ? new Date(signedAt).toLocaleString('vi-VN')
    : 'Không có thông tin';
  const roleLabel = signerRole === 'approver'
    ? 'Người phê duyệt'
    : signerRole === 'reviewer'
      ? 'Người xem xét'
      : 'Người ký';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="E-Office" width={56} height={56} priority className="h-14 w-14 rounded-2xl object-contain shadow-sm" />
            <div>
              <p className="text-2xl font-bold tracking-tight">E-Office</p>
              <p className="text-sm font-medium text-slate-500">Nền tảng ký duyệt điện tử</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 sm:inline-flex">
            <CheckCircle2 className="h-4 w-4" /> Đã hoàn tất
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-100 px-6 py-9 text-center sm:px-10 sm:py-11">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="h-11 w-11 text-emerald-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Ký tài liệu thành công</h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
              Tài liệu đã được ghi nhận và lưu trữ. Bạn có thể tải bản hoàn tất xuống ngay bây giờ.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
              <Clock className="h-4 w-4" /> {signedTime}
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-10">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></span>
                  <h2 className="font-semibold">Thông tin tài liệu</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  <div><dt className="text-slate-500">Tên tài liệu</dt><dd className="mt-1 font-semibold text-slate-900">{signRequestTitle || documentTitle || 'Tài liệu ký điện tử'}</dd></div>
                  {documentNumber && <div><dt className="text-slate-500">Mã tài liệu</dt><dd className="mt-1 font-medium text-slate-900">{documentNumber}</dd></div>}
                  {originalFileName && <div><dt className="text-slate-500">Tệp gốc</dt><dd className="mt-1 break-all font-medium text-slate-900">{originalFileName}</dd></div>}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><User className="h-5 w-5" /></span>
                  <h2 className="font-semibold">Thông tin người ký</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  <div><dt className="text-slate-500">Họ và tên</dt><dd className="mt-1 font-semibold text-slate-900">{signerName || 'Người ký'}</dd></div>
                  {signerEmail && <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-medium text-slate-900">{signerEmail}</dd></div>}
                  <div><dt className="text-slate-500">Vai trò</dt><dd className="mt-1 font-medium text-slate-900">{roleLabel}</dd></div>
                </dl>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div><p className="font-semibold">Bản ký đã sẵn sàng</p><p className="mt-1 leading-6 text-emerald-800">Hệ thống đã lưu thời điểm ký, người ký và lịch sử xử lý cùng tài liệu.</p></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {onDownload && <Button onClick={onDownload} className="h-12 text-base font-semibold"><Download className="mr-2 h-5 w-5" />Tải tài liệu đã ký</Button>}
              <Button onClick={() => window.print()} variant="outline" className="h-12 text-base font-semibold"><Printer className="mr-2 h-5 w-5" />In xác nhận</Button>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-sm text-slate-400">Được bảo vệ bởi E-Office</p>
      </main>
    </div>
  );
}
