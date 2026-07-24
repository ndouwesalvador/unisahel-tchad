import { useQuery } from '@tanstack/react-query';

function useSimpleGet(key: string, path: string) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${key}`);
      }
      return res.json();
    },
  });
}

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

export function useTeachers(params?: { search?: string; departmentId?: string; grade?: string; isActive?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['teachers', params],
    queryFn: async () => {
      const url = new URL('/api/teachers', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value.toString());
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch teachers');
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

export function useHrStaff() {
  return useSimpleGet('hrStaff', '/api/hr');
}

export function useAttendance() {
  return useSimpleGet('attendance', '/api/attendance');
}

export function useScholarships() {
  return useSimpleGet('scholarships', '/api/scholarships');
}

export function useAlumni() {
  return useSimpleGet('alumni', '/api/alumni');
}

export function useInternships() {
  return useSimpleGet('internships', '/api/internships');
}

export function useStructure() {
  return useSimpleGet('structure', '/api/structure');
}

export function useRooms() {
  return useSimpleGet('rooms', '/api/rooms');
}

export function useOnlineExams() {
  return useSimpleGet('onlineExams', '/api/online-exams');
}

export function useReports() {
  return useSimpleGet('reports', '/api/reports');
}

export function useCommunications() {
  return useSimpleGet('communications', '/api/communications');
}
