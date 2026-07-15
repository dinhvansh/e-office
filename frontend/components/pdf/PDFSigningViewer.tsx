'use client';

import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from '@/components/signature/SignatureCanvas';
import SignatureModal from '@/components/signature/SignatureModal';
import PDFCoreViewer from '@/components/pdf/PDFCoreViewer';
import { pctToPx } from '@/lib/coordinate.helper';
import { getResolvedFieldLabel, getResolvedFieldPlaceholder, type SignFieldType } from '@/lib/sign-field.helper';
import { toast } from 'sonner';

interface SignatureField {
  id: number;
  type: SignFieldType;
  pageIndex: number;
  page?: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  label?: string;
  assigned_signer_id?: number;
}

interface PDFSigningViewerProps {
  pdfUrl: string;
  fields: SignatureField[];
  signerId: number;
  onFieldClick: (field: SignatureField) => void;
  signatureData?: string;
  currentFieldId?: number;
  completedFieldIds?: number[];
  guidedMode?: boolean;
  onFieldComplete?: (fieldId: number, signature: string) => void;
  existingFieldValues?: Record<number, string>;
}

export default function PDFSigningViewer({
  pdfUrl,
  fields,
  signerId,
  onFieldClick,
  currentFieldId,
  completedFieldIds = [],
  guidedMode = false,
  onFieldComplete,
  existingFieldValues = {},
}: PDFSigningViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<any>(null);
  const [activeFieldId, setActiveFieldId] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<number, string>>(existingFieldValues);

  useEffect(() => {
    setFieldValues(existingFieldValues);
  }, [existingFieldValues]);

  useEffect(() => {
    if (!canvasRef.current || !activeFieldId) return;

    const initSignaturePad = async () => {
      const SignaturePad = (await import('signature_pad')).default;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 0)',
      });

      signaturePadRef.current = pad;
    };

    initSignaturePad();

    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [activeFieldId]);

  const myFields = fields.filter((field) => !field.assigned_signer_id || field.assigned_signer_id === signerId);
  const completedCount = myFields.filter((field) => field.id in fieldValues || completedFieldIds.includes(field.id)).length;
  const activeSignatureField = myFields.find((field) => field.id === activeFieldId && field.type === 'signature') || null;

  const openField = (field: SignatureField) => {
    const hasSigned = field.id in fieldValues || completedFieldIds.includes(field.id);
    const isDisabled = guidedMode && field.id !== currentFieldId && !hasSigned;
    if (isDisabled || hasSigned) return;
    setActiveFieldId(field.id);
    onFieldClick(field);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-4" aria-labelledby="signing-fields-heading">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="signing-fields-heading" className="font-semibold">Các trường cần hoàn thành</h2><p className="text-sm text-muted-foreground" aria-live="polite">{completedCount}/{myFields.length} đã hoàn thành</p></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{myFields.map((field) => { const done = field.id in fieldValues || completedFieldIds.includes(field.id); return <button key={`list-${field.id}`} type="button" onClick={() => openField(field)} disabled={done || (guidedMode && field.id !== currentFieldId && !done)} className="rounded border p-3 text-left focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"><span className="font-medium">{getResolvedFieldLabel(field)}</span><span className="ml-2 text-sm text-muted-foreground">{done ? 'Đã hoàn thành' : 'Bắt buộc'}</span></button>; })}</div>
      </section>
    <PDFCoreViewer
      pdfUrl={pdfUrl}
      loading={!pdfUrl}
      loadingLabel="Đang tải PDF..."
      errorTitle="Không thể tải PDF"
      backgroundClassName="bg-gray-200"
      toolbarClassName="border-b bg-gray-100"
      renderOverlay={({ pageNumber, pageWidth, pageHeight }) => {
        const pageFields = myFields.filter((field) => field.pageIndex === pageNumber - 1);

        return (
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
            {pageFields.map((field) => {
              const isActive = field.id === activeFieldId;
              const hasSigned = field.id in fieldValues || completedFieldIds.includes(field.id);
              const isCurrent = guidedMode && field.id === currentFieldId;
              const isDisabled = guidedMode && !isCurrent && !hasSigned;
              const boxPx = pctToPx(field, pageWidth, pageHeight);

              return (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  className={`pointer-events-auto absolute border-2 transition-all ${
                    isCurrent && !isActive
                      ? 'z-30 animate-pulse border-blue-600 bg-white shadow-2xl ring-4 ring-blue-300'
                      : isActive
                        ? 'z-20 border-blue-500 bg-white shadow-lg'
                        : hasSigned
                          ? field.type === 'signature'
                            ? 'border-green-500 bg-transparent'
                            : 'border-green-500 bg-green-50'
                          : isDisabled
                            ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-50'
                            : 'cursor-pointer border-yellow-500 bg-yellow-50 hover:bg-yellow-100 hover:shadow-md'
                  }`}
                  style={{
                    left: `${boxPx.left}px`,
                    top: `${boxPx.top}px`,
                    width: `${boxPx.width}px`,
                    height: `${boxPx.height}px`,
                  }}
                  onClick={() => openField(field)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openField(field);
                    }
                  }}
                  role="button"
                  tabIndex={isDisabled || hasSigned ? -1 : 0}
                  aria-label={`${getResolvedFieldLabel(field)}${hasSigned ? ', đã hoàn thành' : ', bắt buộc'}`}
                  aria-disabled={isDisabled || hasSigned}
                  title={getResolvedFieldLabel(field)}
                >
                  {isActive && field.type !== 'signature' ? (
                    field.type === ('signature' as SignFieldType) ? (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setActiveFieldId(null); }}>
                        <div role="dialog" aria-modal="true" aria-label={getResolvedFieldLabel(field)} tabIndex={-1} className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                          <div className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                            {getResolvedFieldLabel(field)}
                          </div>
                          <div className="mb-3 overflow-hidden rounded-lg border-2 border-blue-400 bg-white">
                            <canvas ref={canvasRef} className="h-60 w-full cursor-crosshair" style={{ touchAction: 'none' }} />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <button className="h-11 rounded border" onClick={(event) => { event.stopPropagation(); signaturePadRef.current?.clear(); }}>Xóa</button>
                            <button className="h-11 rounded border" onClick={(event) => { event.stopPropagation(); setActiveFieldId(null); }}>Hủy</button>
                            <button
                              className="h-11 rounded bg-blue-600 font-semibold text-white"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) return;
                                const signature = signaturePadRef.current.toDataURL();
                                setFieldValues((prev) => ({ ...prev, [field.id]: signature }));
                                setActiveFieldId(null);
                                onFieldComplete?.(field.id, signature);
                              }}
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setActiveFieldId(null); }}>
                        <div role="dialog" aria-modal="true" aria-label={getResolvedFieldLabel(field)} tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                          <div className="mb-4 text-lg font-bold text-gray-900">{getResolvedFieldLabel(field)}</div>
                          {field.type === 'date' ? (
                            <input
                              type="date"
                              autoFocus
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="mb-3 w-full rounded-lg border-2 border-blue-400 bg-white px-4 py-3 text-lg"
                              onChange={(event) => {
                                const dateValue = new Date(event.target.value).toLocaleDateString('vi-VN');
                                setFieldValues((prev) => ({ ...prev, [field.id]: dateValue }));
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              autoFocus
                              placeholder={getResolvedFieldPlaceholder(field)}
                              defaultValue={fieldValues[field.id] || existingFieldValues?.[field.id] || ''}
                              className="mb-3 w-full rounded-lg border-2 border-blue-400 bg-white px-4 py-3 text-lg"
                              onChange={(event) => {
                                setFieldValues((prev) => ({ ...prev, [field.id]: event.target.value }));
                              }}
                            />
                          )}
                          <div className="flex gap-3">
                            <button className="h-11 flex-1 rounded border" onClick={(event) => { event.stopPropagation(); setActiveFieldId(null); }}>Hủy</button>
                            <button
                              className="h-11 flex-1 rounded bg-blue-600 font-semibold text-white"
                              onClick={(event) => {
                                event.stopPropagation();
                                const value =
                                  field.type === 'date'
                                    ? fieldValues[field.id] || new Date().toLocaleDateString('vi-VN')
                                    : fieldValues[field.id] || '';

                                if (field.type !== 'date' && value.trim() === '') {
                                  toast.error('Vui lòng nhập nội dung');
                                  return;
                                }

                                setFieldValues((prev) => ({ ...prev, [field.id]: value }));
                                setActiveFieldId(null);
                                onFieldComplete?.(field.id, value);
                              }}
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : hasSigned ? (
                    field.type === 'signature' ? (
                      <img src={fieldValues[field.id]} alt="Signature" className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-1 text-sm font-semibold text-gray-800">
                        {fieldValues[field.id]}
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-700">
                      {getResolvedFieldLabel(field)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }}
    />
    <SignatureModal
      open={!!activeSignatureField}
      signerName="Người ký"
      title={activeSignatureField ? getResolvedFieldLabel(activeSignatureField) : 'Ký tài liệu'}
      onClose={() => setActiveFieldId(null)}
      onConfirm={(signature) => {
        if (!activeSignatureField) return;
        setFieldValues((prev) => ({ ...prev, [activeSignatureField.id]: signature }));
        setActiveFieldId(null);
        onFieldComplete?.(activeSignatureField.id, signature);
      }}
    />
    </div>
  );
}
