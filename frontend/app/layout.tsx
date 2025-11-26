import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WP Sign - E-Office System",
  description: "Multi-tenant e-signature workspace",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900">
        <AppProviders>{children}</AppProviders>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            classNames: {
              error: 'bg-red-600 text-white border-red-700 text-sm sm:text-base',
              success: 'bg-green-600 text-white border-green-700 text-sm sm:text-base',
              warning: 'bg-yellow-600 text-white border-yellow-700 text-sm sm:text-base',
              info: 'bg-blue-600 text-white border-blue-700 text-sm sm:text-base',
              toast: 'min-w-[280px] sm:min-w-[320px] p-3 sm:p-4',
            },
          }}
        />
      </body>
    </html>
  );
}
