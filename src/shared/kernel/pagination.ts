export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function toSkip({ page, limit }: PaginationInput): number {
  return Math.max(0, page - 1) * limit;
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationInput,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
