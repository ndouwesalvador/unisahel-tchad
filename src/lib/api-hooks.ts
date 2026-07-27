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

export function useNotifications() {
  return useSimpleGet('notifications', '/api/notifications');
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

export function useLibrary() {
  return useSimpleGet('library', '/api/library');
}

export function useTransport() {
  return useSimpleGet('transport', '/api/transport');
}

export function useOnlineExams() {
  return useSimpleGet('onlineExams', '/api/online-exams');
}

export function useMyExams() {
  return useSimpleGet('myExams', '/api/online-exams?scope=me');
}

export function useReports() {
  return useSimpleGet('reports', '/api/reports');
}

export function useCommunications() {
  return useSimpleGet('communications', '/api/communications');
}

export function useAnnouncements() {
  return useSimpleGet('announcements', '/api/announcements');
}

export function useCandidatures() {
  return useSimpleGet('candidatures', '/api/candidature');
}

export function useTimetable(params?: { programId?: string; levelId?: string }) {
  return useQuery({
    queryKey: ['timetable', params],
    queryFn: async () => {
      const url = new URL('/api/timetable', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value.toString());
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch timetable');
      }
      return res.json();
    },
  });
}

export function useInstitution() {
  return useSimpleGet('institution', '/api/institution');
}

export function useImportExport() {
  return useSimpleGet('importExport', '/api/import-export');
}

export function useExamScheduling() {
  return useSimpleGet('examScheduling', '/api/exam-scheduling');
}

export function useHealth(studentId?: string) {
  return useQuery({
    queryKey: ['health', studentId],
    queryFn: async () => {
      const url = new URL('/api/health', window.location.origin);
      if (studentId) url.searchParams.set('studentId', studentId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch health data');
      return res.json();
    },
  });
}

export function useDeliberation(params?: { id?: string; session?: string }) {
  return useQuery({
    queryKey: ['deliberation', params],
    queryFn: async () => {
      const url = new URL('/api/deliberation', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value);
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch deliberation data');
      return res.json();
    },
  });
}

export function useInscriptionPedagogique(studentId?: string) {
  return useQuery({
    queryKey: ['inscriptionPedagogique', studentId],
    queryFn: async () => {
      const url = new URL('/api/inscription-pedagogique', window.location.origin);
      if (studentId) url.searchParams.set('studentId', studentId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch inscription pedagogique');
      return res.json();
    },
  });
}

export function useResults(params?: { academicYearId?: string; studentId?: string; session?: string }) {
  return useQuery({
    queryKey: ['results', params],
    queryFn: async () => {
      const url = new URL('/api/results', window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') url.searchParams.append(key, value.toString());
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch results');
      }
      return res.json();
    },
  });
}

export function useAdvising() {
  return useSimpleGet('advising', '/api/advising');
}
