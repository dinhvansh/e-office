'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from './auth-provider';
import { DestructiveConfirmationProvider } from './destructive-confirmation-provider';

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><DestructiveConfirmationProvider>{children}</DestructiveConfirmationProvider></AuthProvider>
    </QueryClientProvider>
  );
};
