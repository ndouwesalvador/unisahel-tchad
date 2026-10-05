'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookOpen, CalendarDays, ClipboardCheck, FileQuestion, MessageSquare, Search, Send, UsersRound } from 'lucide-react'
import { useDashboardStats } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'

type TeacherCourse = {
  id: string
  code: string | null
  name: string
  teachingUnit: string
  teachingUnitCode: string | null
  credits: number
  program: string
  level: string
  semester: string
}

type StructureElement = { id: string; code: string | null; name: string }
type StructureUnit = { id: string; name: string; code: string | null; credits: number; courseElements: StructureElement[] }
type StructureSemester = { name: string; teachingUnits: StructureUnit[] }
type StructureLevel = { name: string; semesters: StructureSemester[] }
type StructureProgram = { name: string; levels: StructureLevel[] }
type StructureResponse = { faculties: Array<{ departments: Array<{ programs: StructureProgram[] }> }> }

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Une erreur est survenue')
  return body as T
}

function useTeacherCourses() {
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId)
  return useQuery({
    queryKey: ['teacher-courses', selectedAcademicYearId],
    queryFn: async () => {
      const suffix = selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : ''
      const data = await readJson<StructureResponse>(`/api/structure${suffix}`)
      const courses: TeacherCourse[] = []
      for (const faculty of data.faculties) for (const department of faculty.departments)
        for (const program of department.programs) for (const level of program.levels)
          for (const semester of level.semesters) for (const unit of semester.teachingUnits)
            for (const element of unit.courseElements) courses.push({
              id: element.id, code: element.code, name: element.name,
              teachingUnit: unit.name, teachingUnitCode: unit.code, credits: unit.credits,
              program: program.name, level: level.name, semester: semester.name,
            })
      return courses.sort((a, b) => `${a.program}${a.level}${a.semester}${a.name}`.localeCompare(`${b.program}${b.level}${b.semester}${b.name}`, 'fr'))
    },
  })
}

function useTeacherYear() {
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId)
  const dashboard = useDashboardStats(selectedAcademicYearId)
  const academicYear = dashboard.data?.academicYear as { id: string; name: string } | null | undefined
  return { academicYear, isLoading: dashboard.isLoading }
}

function PageHeading({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return <div className="rounded-2xl bg-[#142d36] p-6 text-white sm:p-8">
    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white/10"><Icon className="size-5" aria-hidden="true" /></div>
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#d6e8e1] sm:text-base">{description}</p>
  </div>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-7 text-sm leading-relaxed text-slate-700">{children}</div>
}

function CourseSelect({ courses, value, onChange, id }: { courses: TeacherCourse[]; value: string; onChange: (value: string) => void; id: string }) {
  return <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus-visible:outline-2 focus-visible:outline-[#137247]">
    {courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {course.program} · {course.level}</option>)}
  </select>
}

export function TeacherUnitsPage() {
  const { data: courses = [], isLoading, isError, refetch } = useTeacherCourses()
  const { academicYear } = useTeacherYear()
  const groups = useMemo(() => {
    const map = new Map<string, TeacherCourse[]>()
    for (const course of courses) {
      const key = `${course.program} · ${course.level} · ${course.semester}`
      map.set(key, [...(map.get(key) ?? []), course])
    }
    return [...map.entries()]
  }, [courses])

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={BookOpen} title="Mes UE et matières" description="Uniquement vos services d’enseignement approuvés pour l’année académique sélectionnée." />
    {academicYear && <p className="text-sm font-semibold text-slate-700">Année académique : {academicYear.name}</p>}
    {isLoading ? <Empty>Chargement de vos affectations…</Empty> : isError ? <Empty>Impossible de charger vos UE. <button className="font-bold underline" onClick={() => refetch()}>Réessayer</button></Empty> : groups.length === 0 ? <Empty>Aucun service d’enseignement approuvé pour cette année. Le département doit vous affecter une matière avant qu’elle apparaisse ici.</Empty> :
      groups.map(([label, entries]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">{label}</h2>
        <div className="mt-4 space-y-3">{entries.map((course) => <div key={course.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">UE {course.teachingUnitCode ? `${course.teachingUnitCode} · ` : ''}{course.teachingUnit} · {course.credits} crédits</p>
          <h3 className="mt-1 font-semibold text-slate-950">{course.code ? `${course.code} · ` : ''}{course.name}</h3>
        </div>)}</div>
      </section>)}
  </div>
}

type TeacherStudent = {
  id: string; matricule: string | null; firstName: string; lastName: string; middleName: string | null
  email: string | null; phone: string | null; program: string; level: string; programId: string; levelId: string
}
type TeacherStudentScope = {
  programId: string; program: string; levelId: string; level: string
  courses: Array<{ id: string; code: string | null; name: string; unit: string; unitCode: string | null }>
}

export function TeacherStudentsPage() {
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId)
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['teacher-students', selectedAcademicYearId],
    queryFn: () => readJson<{ data: { academicYear: { id: string; name: string }; scopes: TeacherStudentScope[]; students: TeacherStudent[] } }>(
      `/api/teacher-students${selectedAcademicYearId ? `?academicYearId=${encodeURIComponent(selectedAcademicYearId)}` : ''}`,
    ),
    staleTime: 0,
  })
  const payload = query.data?.data
  const normalizedSearch = search.trim().toLocaleLowerCase('fr')
  const students = (payload?.students ?? []).filter((student) => {
    if (!normalizedSearch) return true
    return `${student.firstName} ${student.middleName ?? ''} ${student.lastName} ${student.matricule ?? ''} ${student.program} ${student.level}`.toLocaleLowerCase('fr').includes(normalizedSearch)
  })

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={UsersRound} title="Mes étudiants" description="Les étudiants inscrits dans les filières et niveaux où vos matières sont affectées apparaissent automatiquement ici. La saisie des notes reste limitée à chaque matière qui vous est attribuée." />
    {payload?.academicYear && <p className="text-sm font-semibold text-slate-700">Année académique : {payload.academicYear.name}</p>}
    {query.isLoading ? <Empty>Chargement de vos étudiants…</Empty> : query.isError ? <Empty>Impossible de charger vos étudiants. <button className="font-bold underline" onClick={() => query.refetch()}>Réessayer</button></Empty> : (payload?.scopes ?? []).length === 0 ?
      <Empty>Aucune matière ne vous est affectée pour cette année. Dès qu’un service d’enseignement est approuvé, les étudiants concernés apparaîtront automatiquement.</Empty> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(payload?.scopes ?? []).map((scope) => <article key={`${scope.programId}:${scope.levelId}`} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-bold text-emerald-950">{scope.program}</p>
            <p className="mt-1 text-sm text-emerald-800">{scope.level}</p>
            <p className="mt-3 text-xs font-semibold text-emerald-700">{scope.courses.length} matière{scope.courses.length > 1 ? 's' : ''} affectée{scope.courses.length > 1 ? 's' : ''}</p>
          </article>)}
        </div>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="text-lg font-bold text-slate-950">Étudiants suivis</h2><p className="text-sm text-slate-600">{students.length} résultat{students.length > 1 ? 's' : ''}{search ? ' filtré(s)' : ''}</p></div>
            <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Rechercher un étudiant</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, matricule, filière…" className="min-h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-700" /></label>
          </div>
          {students.length === 0 ? <Empty>Aucun étudiant inscrit ne correspond à votre recherche.</Empty> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3 font-bold">Étudiant</th><th className="px-5 py-3 font-bold">Matricule</th><th className="px-5 py-3 font-bold">Filière</th><th className="px-5 py-3 font-bold">Niveau</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-950">{student.lastName.toUpperCase()} {student.firstName}{student.middleName ? ` ${student.middleName}` : ''}</td><td className="whitespace-nowrap px-5 py-3 text-slate-700">{student.matricule ?? '—'}</td><td className="px-5 py-3 text-slate-700">{student.program}</td><td className="px-5 py-3 text-slate-700">{student.level}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
  </div>
}

type Slot = { id: string; dayOfWeek: number; startTime: string; endTime: string; type: string; course: string; room: string; courseElementId: string | null; programId: string | null; levelId: string | null }
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function TeacherTimetablePage() {
  const { academicYear, isLoading: yearLoading } = useTeacherYear()
  const slotsQuery = useQuery({
    queryKey: ['teacher-timetable', academicYear?.id], enabled: Boolean(academicYear?.id),
    queryFn: () => readJson<{ slots: Slot[] }>(`/api/timetable?academicYearId=${encodeURIComponent(academicYear!.id)}`),
  })
  // /api/timetable already filters by the authenticated teacherId. Do not
  // hide approved visiting service just because the legacy EC field differs.
  const slots = [...(slotsQuery.data?.slots ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={CalendarDays} title="Mon emploi du temps" description="Vos créneaux publiés pour l’année académique sélectionnée. Le brouillon du département reste interne." />
    {academicYear && <p className="text-sm font-semibold text-slate-700">Année académique : {academicYear.name}</p>}
    {yearLoading || slotsQuery.isLoading ? <Empty>Chargement de votre emploi du temps…</Empty> : !academicYear ? <Empty>Aucune année académique active n’est disponible.</Empty> : slotsQuery.isError ? <Empty>Impossible de charger votre emploi du temps.</Empty> : slots.length === 0 ? <Empty>Aucun créneau publié pour cette année.</Empty> :
      <div className="grid gap-3 md:grid-cols-2">{slots.map((slot) => <article key={slot.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold text-emerald-800">{DAYS[slot.dayOfWeek] ?? `Jour ${slot.dayOfWeek}`} · {slot.startTime}–{slot.endTime}</p>
          <h2 className="mt-2 text-lg font-bold text-slate-950">{slot.course || 'Matière non indiquée'}</h2>
          <p className="mt-3 text-xs font-semibold text-slate-600">{slot.type}{slot.room ? ` · ${slot.room}` : ' · Salle non précisée'}</p>
        </article>)}</div>}
  </div>
}

function courseById(courses: TeacherCourse[], id: string | null) {
  return courses.find((course) => course.id === id)
}

type RosterStudent = { id: string; matricule: string | null; firstName: string; lastName: string }
type AttendanceRecord = { id: string; studentId: string | null; courseElementId: string | null; date: string; timeSlot: string; status: string }
const attendanceChoices = [
  { value: 'PRESENT', label: 'Présent' }, { value: 'ABSENT', label: 'Absent' }, { value: 'LATE', label: 'En retard' },
]

export function TeacherAttendancePage() {
  const queryClient = useQueryClient()
  const { data: courses = [], isLoading: coursesLoading } = useTeacherCourses()
  const { academicYear, isLoading: yearLoading } = useTeacherYear()
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [timeSlot, setTimeSlot] = useState('08:00-10:00')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null)
  const courseId = selectedCourseId || courses[0]?.id || ''
  const roster = useQuery({
    queryKey: ['teacher-roster', courseId, academicYear?.id], enabled: Boolean(courseId && academicYear?.id),
    queryFn: () => readJson<{ data: RosterStudent[] }>(`/api/grades?action=roster&courseElementId=${encodeURIComponent(courseId)}&academicYearId=${encodeURIComponent(academicYear!.id)}`),
  })
  const attendance = useQuery({
    queryKey: ['teacher-attendance', courseId, academicYear?.id], enabled: Boolean(courseId && academicYear?.id),
    queryFn: () => readJson<{ records: AttendanceRecord[]; stats: { total: number; present: number; absent: number; late: number } }>(`/api/attendance?courseElementId=${encodeURIComponent(courseId)}&academicYearId=${encodeURIComponent(academicYear!.id)}`),
  })
  const records = attendance.data?.records ?? []

  const save = async (student: RosterStudent) => {
    if (!timeSlot.trim()) { toast.error('Indiquez le créneau horaire.'); return }
    const existing = records.find((record) => record.studentId === student.id && record.date.slice(0, 10) === selectedDate && record.timeSlot === timeSlot.trim())
    const status = overrides[student.id] || existing?.status || 'PRESENT'
    setBusyStudentId(student.id)
    try {
      if (existing) {
        await readJson(`/api/attendance?id=${encodeURIComponent(existing.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateStatus', status }) })
      } else {
        await readJson('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, courseElementId: courseId, academicYearId: academicYear!.id, date: selectedDate, timeSlot: timeSlot.trim(), status }) })
      }
      toast.success('Présence enregistrée')
      setOverrides((current) => { const next = { ...current }; delete next[student.id]; return next })
      await queryClient.invalidateQueries({ queryKey: ['teacher-attendance', courseId, academicYear?.id] })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setBusyStudentId(null) }
  }

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={ClipboardCheck} title="Présences de mes cours" description="Seuls les étudiants inscrits pédagogiquement à votre UE pour l’année sélectionnée peuvent figurer dans cette feuille." />
    {coursesLoading || yearLoading ? <Empty>Chargement de vos affectations…</Empty> : courses.length === 0 ? <Empty>Aucun service annuel approuvé. La feuille de présence restera vide jusqu’à la validation de votre service d’enseignement.</Empty> : !academicYear ? <Empty>Aucune année académique active. La saisie des présences est indisponible.</Empty> : <>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">Matière<CourseSelect id="attendance-course" courses={courses} value={courseId} onChange={(value) => { setSelectedCourseId(value); setOverrides({}) }} /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">Date<input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setOverrides({}) }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900" /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">Créneau<input value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)} placeholder="08:00-10:00" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900" /></label>
      </div>
      {roster.isLoading || attendance.isLoading ? <Empty>Chargement des étudiants inscrits…</Empty> : roster.isError || attendance.isError ? <Empty>Impossible de charger la feuille de présence.</Empty> : roster.data?.data.length === 0 ? <Empty>Aucun étudiant n’est inscrit pédagogiquement à cette UE pour {academicYear.name}. Aucune présence ne peut être saisie.</Empty> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5"><h2 className="font-bold text-slate-950">Feuille de présence · {academicYear.name}</h2><p className="mt-1 text-sm text-slate-600">{roster.data?.data.length ?? 0} étudiant(s) inscrit(s). Choisissez un statut, puis enregistrez chaque ligne.</p></div>
        <div className="divide-y divide-slate-200">{roster.data?.data.map((student) => {
          const existing = records.find((record) => record.studentId === student.id && record.date.slice(0, 10) === selectedDate && record.timeSlot === timeSlot.trim())
          return <div key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div><p className="font-semibold text-slate-950">{student.lastName} {student.firstName}</p><p className="text-xs text-slate-600">{student.matricule || 'Matricule non attribué'}{existing ? ' · Présence enregistrée' : ''}</p></div>
            <div className="flex items-center gap-2"><label className="sr-only" htmlFor={`attendance-${student.id}`}>Statut de {student.firstName} {student.lastName}</label><select id={`attendance-${student.id}`} value={overrides[student.id] || existing?.status || 'PRESENT'} onChange={(event) => setOverrides((current) => ({ ...current, [student.id]: event.target.value }))} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">{attendanceChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><button type="button" disabled={busyStudentId === student.id} onClick={() => save(student)} className="min-h-10 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">Enregistrer</button></div>
          </div>
        })}</div>
      </section>}
    </>}
  </div>
}

type BankQuestion = { id: string; courseElementId: string | null; text: string; type: string; points: number }
type TeacherExam = { id: string; courseElementId: string | null; name: string; course: string; examDate: string; duration: string; status: string; questions: number }
type ExamResult = { id: string; name: string; matricule: string; score: number | null; maxScore: number; status: string }

export function TeacherOnlineExamPage() {
  const queryClient = useQueryClient()
  const { data: courses = [], isLoading: coursesLoading } = useTeacherCourses()
  const examsQuery = useQuery({ queryKey: ['teacher-online-exams'], queryFn: () => readJson<{ exams: TeacherExam[]; bankQuestions: BankQuestion[]; results: ExamResult[] }>('/api/online-exams') })
  const [courseId, setCourseId] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('0')
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [duration, setDuration] = useState('1h00')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const selectedCourseId = courseId || courses[0]?.id || ''
  const questions = (examsQuery.data?.bankQuestions ?? []).filter((question) => question.courseElementId === selectedCourseId)

  const addQuestion = async () => {
    const selectedAnswer = Number(correctAnswer)
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean)
    const answerIndex = options.slice(0, selectedAnswer).filter((option) => option.trim()).length
    if (!questionText.trim() || cleanOptions.length < 2 || !options[selectedAnswer]?.trim()) { toast.error('Renseignez la question, au moins deux réponses et une bonne réponse non vide.'); return }
    setBusy(true)
    try {
      await readJson('/api/online-exams?entity=question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseElementId: selectedCourseId, text: questionText.trim(), type: 'QCM', difficulty: 'Moyen', points: 1, options: cleanOptions, correctAnswer: answerIndex }) })
      toast.success('Question ajoutée à votre matière')
      setQuestionText(''); setOptions(['', '', '', '']); setCorrectAnswer('0')
      await queryClient.invalidateQueries({ queryKey: ['teacher-online-exams'] })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Création impossible') }
    finally { setBusy(false) }
  }

  const createExam = async () => {
    if (!examName.trim() || !examDate || selectedQuestionIds.length === 0) { toast.error('Nom, date et au moins une question sont requis.'); return }
    setBusy(true)
    try {
      await readJson('/api/online-exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseElementId: selectedCourseId, name: examName.trim(), examDate: new Date(examDate).toISOString(), duration, type: 'QCM', questionIds: selectedQuestionIds }) })
      toast.success('Examen créé pour votre matière')
      setExamName(''); setExamDate(''); setSelectedQuestionIds([])
      await queryClient.invalidateQueries({ queryKey: ['teacher-online-exams'] })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Création impossible') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={FileQuestion} title="Examens en ligne" description="Préparez des QCM et consultez les résultats uniquement pour vos matières affectées. Les examens sans matière identifiée restent gérés par l’administration." />
    {coursesLoading || examsQuery.isLoading ? <Empty>Chargement de vos examens…</Empty> : courses.length === 0 ? <Empty>Aucune matière ne vous est attribuée. Aucun examen d’un autre enseignant n’est visible ici.</Empty> : examsQuery.isError ? <Empty>Impossible de charger vos examens.</Empty> : <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><label className="grid gap-2 text-sm font-semibold text-slate-800">Matière concernée<CourseSelect id="exam-course" courses={courses} value={selectedCourseId} onChange={(value) => { setCourseId(value); setSelectedQuestionIds([]) }} /></label></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Banque de questions · {courseById(courses, selectedCourseId)?.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{questions.length} question(s) dans cette matière.</p>
        <div className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-semibold">Question<input value={questionText} onChange={(event) => setQuestionText(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" placeholder="Énoncé du QCM" /></label>
          <div className="grid gap-2 sm:grid-cols-2">{options.map((option, index) => <label key={index} className="grid gap-1 text-sm font-semibold">Réponse {index + 1}<input value={option} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>)}</div>
          <label className="grid gap-1 text-sm font-semibold">Bonne réponse<select value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">{options.map((_, index) => <option key={index} value={String(index)}>Réponse {index + 1}</option>)}</select></label>
          <button type="button" onClick={addQuestion} disabled={busy} className="min-h-11 justify-self-start rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">Ajouter la question</button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Créer un examen</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Nom<input value={examName} onChange={(event) => setExamName(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label><label className="grid gap-1 text-sm font-semibold">Date et heure<input type="datetime-local" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label><label className="grid gap-1 text-sm font-semibold">Durée<input value={duration} onChange={(event) => setDuration(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" placeholder="1h00" /></label></div>
        <p className="mt-5 text-sm font-semibold text-slate-800">Questions sélectionnées : {selectedQuestionIds.length}</p>
        <div className="mt-2 space-y-2">{questions.length === 0 ? <p className="text-sm text-slate-600">Ajoutez d’abord une question à cette matière.</p> : questions.map((question) => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={(event) => setSelectedQuestionIds((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} className="mt-1" /><span className="text-slate-900">{question.text}</span></label>)}</div>
        <button type="button" onClick={createExam} disabled={busy || questions.length === 0} className="mt-4 min-h-11 rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">Créer l’examen</button>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Mes examens</h2><div className="mt-3 divide-y divide-slate-200">{(examsQuery.data?.exams ?? []).length === 0 ? <p className="py-4 text-sm text-slate-600">Aucun examen rattaché à vos matières.</p> : examsQuery.data?.exams.map((exam) => <div key={exam.id} className="py-3"><p className="font-semibold text-slate-950">{exam.name} · {exam.course}</p><p className="mt-1 text-sm text-slate-600">{new Date(exam.examDate).toLocaleString('fr-FR')} · {exam.duration} · {exam.questions} question(s) · {exam.status}</p></div>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Résultats de mes examens</h2><div className="mt-3 divide-y divide-slate-200">{(examsQuery.data?.results ?? []).length === 0 ? <p className="py-4 text-sm text-slate-600">Aucun résultat enregistré.</p> : examsQuery.data?.results.map((result) => <div key={result.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold text-slate-900">{result.name} · {result.matricule}</span><span className="text-slate-700">{result.score === null ? 'En correction' : `${result.score}/${result.maxScore}`} · {result.status}</span></div>)}</div></section>
    </>}
  </div>
}

type TeacherMessage = { id: string; courseElementId: string | null; subject: string; content: string | null; audience: string; createdAt: string; status: string }

export function TeacherMessagesPage() {
  const queryClient = useQueryClient()
  const { data: courses = [], isLoading: coursesLoading } = useTeacherCourses()
  const messages = useQuery({ queryKey: ['teacher-messages'], queryFn: () => readJson<{ communications: TeacherMessage[] }>('/api/communications') })
  const [courseId, setCourseId] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const selectedCourseId = courseId || courses[0]?.id || ''

  const send = async () => {
    if (!subject.trim() || !content.trim()) { toast.error('Objet et message requis.'); return }
    setSending(true)
    try {
      await readJson('/api/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseElementId: selectedCourseId, subject: subject.trim(), content: content.trim() }) })
      toast.success('Message transmis à l’administration')
      setSubject(''); setContent('')
      await queryClient.invalidateQueries({ queryKey: ['teacher-messages'] })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Envoi impossible') }
    finally { setSending(false) }
  }

  return <div className="space-y-6 text-slate-900">
    <PageHeading icon={MessageSquare} title="Messages" description="Transmettez une information pédagogique à l’administration concernant une matière qui vous est affectée. Ce registre n’est pas une messagerie entre étudiants." />
    {coursesLoading || messages.isLoading ? <Empty>Chargement des messages…</Empty> : courses.length === 0 ? <Empty>Aucune matière ne vous est attribuée. Vous ne pouvez pas consulter les communications des autres filières.</Empty> : messages.isError ? <Empty>Impossible de charger vos messages.</Empty> : <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Écrire à l’administration</h2>
        <div className="mt-4 grid gap-4"><label className="grid gap-2 text-sm font-semibold">Matière<CourseSelect id="message-course" courses={courses} value={selectedCourseId} onChange={setCourseId} /></label><label className="grid gap-2 text-sm font-semibold">Objet<input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label><label className="grid gap-2 text-sm font-semibold">Message<textarea value={content} maxLength={5000} onChange={(event) => setContent(event.target.value)} rows={5} className="rounded-lg border border-slate-300 p-3" /></label>
          <button type="button" disabled={sending} onClick={send} className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-lg bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50"><Send className="size-4" aria-hidden="true" /> Envoyer à l’administration</button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-950">Mes messages envoyés</h2><div className="mt-3 divide-y divide-slate-200">{(messages.data?.communications ?? []).length === 0 ? <p className="py-4 text-sm text-slate-600">Aucun message envoyé pour vos matières.</p> : messages.data?.communications.map((message) => <article key={message.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-slate-950">{message.subject}</h3><span className="text-xs text-slate-600">{new Date(message.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs font-semibold text-emerald-800">{courseById(courses, message.courseElementId)?.name ?? 'Matière affectée'} · Vers l’administration</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{message.content}</p></article>)}</div></section>
    </>}
  </div>
}
