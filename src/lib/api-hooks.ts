import { useQuery } from '@tanstack/react-query';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return res.json();
    },
  });
}

export function useStudents(params?: { search?: string; status?: string; programId?: string; levelId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      const url = new URL('/api/students', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value.toString());
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch students');
      }
      return res.json();
    },
  });
}

export function usePayments(params?: { search?: string; status?: string; paymentMethod?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const url = new URL('/api/payments', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value.toString());
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch payments');
      }
      return res.json();
    },
  });
}
