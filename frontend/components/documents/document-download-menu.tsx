'use client';

import { useState } from 'react';
import { Download, FileArchive, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getApiBaseUrl } from '@/lib/env';

type Props = { documentId: number; documentNumber?: string | null; originalFileName?: string | null; status?: string | null; signedFilePath?: string | null; className?: string };

export function DocumentDownloadMenu({ documentId, documentNumber, originalFileName, status, signedFilePath, className }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'dossier' | null>(null);
  const completed = status === 'completed';
  const hasSignedArtifact = Boolean(signedFilePath);
  const download = async (kind: 'pdf' | 'dossier') => {
    setLoading(kind);
    try {
      const authData = localStorage.getItem('esign.auth'); const token = authData ? JSON.parse(authData).tokens?.accessToken : null;
      // Approval-only documents can be completed without ever producing a
      // signed artifact. Route by the artifact that actually exists, not by
      // lifecycle status, otherwise these documents call download-signed and
      // fail with SIGNED_FILE_NOT_FOUND.
      const endpoint = kind === 'dossier' ? 'dossier/download' : (hasSignedArtifact ? 'download-signed' : 'download');
      const response = await fetch(`${getApiBaseUrl()}/documents/${documentId}/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Download failed');
      const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement('a'); anchor.href = url;
      anchor.download = kind === 'dossier' ? `${documentNumber || 'ho-so'}-dossier.zip` : (originalFileName || `${documentNumber || 'document'}.pdf`);
      anchor.click(); URL.revokeObjectURL(url); toast.success('Đã bắt đầu tải xuống');
    } catch { toast.error('Không thể tải tài liệu'); } finally { setLoading(null); }
  };
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className={className} disabled={Boolean(loading)}><Download className="mr-2 h-4 w-4" />{loading ? 'Đang tải...' : 'Tải xuống'}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => download('pdf')}><FileText className="mr-2 h-4 w-4" />{hasSignedArtifact ? 'Tải file đã ký' : 'Tải tài liệu'}</DropdownMenuItem><DropdownMenuItem onSelect={() => download('dossier')}><FileArchive className="mr-2 h-4 w-4" />{completed ? 'Tải toàn bộ hồ sơ (.zip)' : 'Tải bộ hồ sơ hiện tại (.zip)'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
