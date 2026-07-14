export type AccessPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function paginateAccessibleItems<T>(items: T[], page: number, limit: number): {
  data: T[];
  pagination: AccessPagination;
} {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = items.length;

  return {
    data: items.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
