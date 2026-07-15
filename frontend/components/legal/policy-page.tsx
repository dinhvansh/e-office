import Link from 'next/link';
import { policyMetadata } from '@/lib/policy-metadata';

type PolicyPageProps = {
  title: string;
  version: string;
  sections: Array<{ heading: string; content: string }>;
};

export function PolicyPage({ title, version, sections }: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <Link href="/register" className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          ← Quay lại đăng ký
        </Link>
        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-sm font-medium text-amber-800">Bản dự thảo cho public beta — đang chờ rà soát pháp lý.</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 text-sm text-slate-600">Phiên bản {version} · Có hiệu lực từ {policyMetadata.effectiveDate}</p>
        </header>
        <div className="mt-8 space-y-8 text-slate-700">
          {sections.map((section) => (
            <section key={section.heading} aria-labelledby={section.heading.replaceAll(' ', '-')}>
              <h2 id={section.heading.replaceAll(' ', '-')} className="text-xl font-semibold text-slate-900">{section.heading}</h2>
              <p className="mt-2 leading-7">{section.content}</p>
            </section>
          ))}
        </div>
        <footer className="mt-10 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Liên hệ hỗ trợ</h2>
          <p className="mt-1">Nếu có câu hỏi về bản dự thảo này, hãy liên hệ quản trị viên workspace hoặc <a className="text-blue-700 underline underline-offset-2" href="mailto:support@example.local">support@example.local</a>.</p>
          <div className="mt-4 flex gap-4"><Link className="text-blue-700 underline underline-offset-2" href="/register">Đăng ký</Link><Link className="text-blue-700 underline underline-offset-2" href="/login">Đăng nhập</Link></div>
        </footer>
      </article>
    </main>
  );
}
