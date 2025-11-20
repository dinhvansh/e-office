'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function ApprovalsPage() {
  const { fetchJson } = useAuth();

  const { isLoading } = useQuery({
    queryKey: ['my-pending-approvals'],
    queryFn: () => fetchJson('/approvals/my-pending'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CheckSquare}
        title="Phe duyet cua toi"
        description="Danh sach van ban cho phe duyet"
        iconColor="text-amber-600"
        actions={
          <Badge variant="secondary">0 cho phe duyet</Badge>
        }
      />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <EmptyState
              icon={CheckSquare}
              title="Tinh nang dang phat trien"
              description="Phe duyet van ban se som duoc hoan thien"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
