export default function PublicSignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">E-Sign Document</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © 2025 E-Office System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
