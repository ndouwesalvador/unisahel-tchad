"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { useStructure } from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Download,
  Edit,
  Mail,
  User,
  Building2,
  Loader2,
  GraduationCap,
} from "lucide-react";

const grades: Record<string, string> = {
  PROFESSEUR_TITULAIRE: "Professeur titulaire",
  MAITRE_CONFERENCES: "Maître de conférences",
  MAITRE_ASSISTANT: "Maître-assistant",
  ASSISTANT: "Assistant",
  VACATAIRE: "Vacataire",
};
const days = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

interface TeacherRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  employeeId: string | null;
  grade: string | null;
  specialization: string | null;
  maxHoursPerWeek: number;
  currentHours: number;
  isActive: boolean;
  linkedUser: boolean;
  department: { id: string; name: string } | null;
  email: string | null;
  phone: string | null;
}
interface Assignment {
  id: string;
  code: string | null;
  name: string;
  hoursCM: number;
  hoursTD: number;
  hoursTP: number;
  teachingUnit: {
    id: string;
    code: string | null;
    name: string;
    semester: {
      name: string;
      level: { name: string; program: { name: string } };
    };
  };
}
interface DetailResponse {
  data: {
    teacher: TeacherRecord;
    assignedElements: Assignment[];
    responsibleUnits: {
      id: string;
      code: string | null;
      name: string;
      credits: number;
      semester: {
        name: string;
        level: { name: string; program: { name: string } };
      };
    }[];
    academicYear: { id: string; name: string } | null;
    timetable: {
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      type: string;
      course: { code: string | null; name: string } | null;
      room: string | null;
    }[];
  };
}

interface AssignmentStructure {
  faculties?: {
    name: string;
    departments?: {
      name: string;
      programs?: {
        name: string;
        levels?: {
          name: string;
          semesters?: {
            name: string;
            teachingUnits?: {
              id: string;
              name: string;
              responsible?: { id: string; user?: { firstName: string; lastName: string } | null } | null;
              courseElements?: {
                id: string;
                name: string;
                teacher?: { id: string; user?: { firstName: string; lastName: string } | null } | null;
              }[];
            }[];
          }[];
        }[];
      }[];
    }[];
  }[];
}

function TeacherEditDialog({
  teacher,
  onClose,
}: {
  teacher: TeacherRecord;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: structure } = useStructure() as {
    data:
      | { faculties?: { departments?: { id: string; name: string }[] }[] }
      | undefined;
  };
  const departments =
    structure?.faculties?.flatMap((faculty) => faculty.departments ?? []) ?? [];
  const [form, setForm] = useState({
    firstName: teacher.firstName ?? "",
    lastName: teacher.lastName ?? "",
    email: teacher.email ?? "",
    phone: teacher.phone ?? "",
    grade: teacher.grade ?? "",
    specialization: teacher.specialization ?? "",
    departmentId: teacher.department?.id ?? "",
    maxHoursPerWeek: String(teacher.maxHoursPerWeek),
    isActive: teacher.isActive,
  });
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const maxHoursPerWeek = Number(form.maxHoursPerWeek);
    if (
      !form.grade ||
      !form.departmentId ||
      !Number.isInteger(maxHoursPerWeek) ||
      maxHoursPerWeek <= 0
    ) {
      toast.error("Grade, département et plafond horaire valide requis.");
      return;
    }
    if (
      teacher.linkedUser &&
      (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())
    ) {
      toast.error("Prénom, nom et e-mail requis.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teacher.id,
          ...(teacher.linkedUser
            ? {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
              }
            : {}),
          grade: form.grade,
          specialization: form.specialization.trim(),
          departmentId: form.departmentId,
          maxHoursPerWeek,
          isActive: form.isActive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error ?? "Modification impossible");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["teacherDetail", teacher.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["teachers"] }),
      ]);
      toast.success("Profil enseignant mis à jour");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Modification impossible",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier le profil enseignant</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {teacher.linkedUser ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="teacher-first-name">Prénom</Label>
                <Input
                  id="teacher-first-name"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({ ...form, firstName: event.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacher-last-name">Nom</Label>
                <Input
                  id="teacher-last-name"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm({ ...form, lastName: event.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacher-email">E-mail</Label>
                <Input
                  id="teacher-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="teacher-phone">Téléphone</Label>
                <Input
                  id="teacher-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-950">
              Aucun compte utilisateur lié : les coordonnées ne sont pas
              modifiables ici.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Grade</Label>
              <Select
                value={form.grade}
                onValueChange={(grade) => setForm({ ...form, grade })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(grades).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Département</Label>
              <Select
                value={form.departmentId}
                onValueChange={(departmentId) =>
                  setForm({ ...form, departmentId })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teacher-specialization">Spécialisation</Label>
              <Input
                id="teacher-specialization"
                value={form.specialization}
                onChange={(event) =>
                  setForm({ ...form, specialization: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="teacher-max-hours">
                Plafond d’heures par semaine
              </Label>
              <Input
                id="teacher-max-hours"
                type="number"
                min="1"
                value={form.maxHoursPerWeek}
                onChange={(event) =>
                  setForm({ ...form, maxHoursPerWeek: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setForm({ ...form, isActive: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherDetail() {
  const { goBack, selectedTeacherId, selectedAcademicYearId, setView, user } =
    useAppStore();
  const [activeTab, setActiveTab] = useState("informations");
  const [editing, setEditing] = useState(false);
  const [courseElementId, setCourseElementId] = useState("");
  const [teachingUnitId, setTeachingUnitId] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const canManageAssignments = ["SUPER_ADMIN", "ADMIN_INSTITUTION"].includes(user?.role ?? "");
  const { data: structure, isError: structureError } = useStructure() as {
    data: AssignmentStructure | undefined;
    isError: boolean;
  };
  const queryClient = useQueryClient();
  const {
    data: response,
    isPending,
    isError,
    refetch,
  } = useQuery<DetailResponse>({
    queryKey: ["teacherDetail", selectedTeacherId, selectedAcademicYearId],
    enabled: Boolean(selectedTeacherId),
    queryFn: async () => {
      const params = new URLSearchParams({
        id: selectedTeacherId!,
        schedule: "true",
      });
      if (selectedAcademicYearId)
        params.set("academicYearId", selectedAcademicYearId);
      const result = await fetch(`/api/teachers?${params}`);
      if (!result.ok)
        throw new Error("Impossible de charger le profil enseignant");
      return result.json();
    },
  });
  if (!selectedTeacherId)
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-sm text-slate-700">Aucun enseignant sélectionné.</p>
        <Button variant="outline" onClick={goBack}>
          Retour à la liste
        </Button>
      </div>
    );
  if (isPending)
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-16 text-slate-700"
      >
        <Loader2 className="size-5 animate-spin" />
        Chargement du profil…
      </div>
    );
  if (isError || !response?.data?.teacher)
    return (
      <div className="space-y-3 py-12 text-center">
        <p role="alert" className="text-sm font-medium text-red-900">
          Impossible de charger ce profil enseignant.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={goBack}>
            Retour à la liste
          </Button>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      </div>
    );

  const {
    teacher,
    assignedElements,
    responsibleUnits,
    academicYear,
    timetable,
  } = response.data;
  const fullName =
    [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") ||
    "Enseignant sans compte lié";
  const initials =
    [teacher.firstName?.[0], teacher.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "EN";
  const distinctUnits = new Set([
    ...assignedElements.map((item) => item.teachingUnit.id),
    ...responsibleUnits.map((item) => item.id),
  ]).size;
  const totalCourseHours = assignedElements.reduce(
    (sum, item) => sum + item.hoursCM + item.hoursTD + item.hoursTP,
    0,
  );
  const units = (structure?.faculties ?? []).flatMap((faculty) =>
    (faculty.departments ?? []).flatMap((department) =>
      (department.programs ?? []).flatMap((program) =>
        (program.levels ?? []).flatMap((level) =>
          (level.semesters ?? []).flatMap((semester) =>
            (semester.teachingUnits ?? []).map((unit) => ({
              ...unit,
              label: `${department.name} / ${program.name} / ${level.name} / ${semester.name} / ${unit.name}`,
            })),
          ),
        ),
      ),
    ),
  );
  const elements = units.flatMap((unit) =>
    (unit.courseElements ?? []).map((element) => ({
      ...element,
      label: `${unit.label} / ${element.name}`,
    })),
  );
  const updateAssignment = async (
    type: "course-element" | "teaching-unit",
    id: string,
    ownerId: string | null,
    nextTeacherId: string | null,
  ) => {
    if (!canManageAssignments || !id) return;
    const reassignment = Boolean(ownerId && nextTeacherId && ownerId !== nextTeacherId);
    if (reassignment && !window.confirm("Cette affectation appartient déjà à un autre enseignant. Confirmer sa réattribution ?")) return;
    if (!nextTeacherId && !window.confirm("Retirer cette affectation à l’enseignant ?")) return;
    setAssignmentBusy(true);
    try {
      const result = await fetch(`/api/structure?type=${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          [type === "course-element" ? "teacherId" : "responsibleId"]: nextTeacherId,
          ...(reassignment ? { confirmReassignment: true } : {}),
        }),
      });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(payload.error ?? "Affectation impossible");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teacherDetail", teacher.id] }),
        queryClient.invalidateQueries({ queryKey: ["structure"] }),
        queryClient.invalidateQueries({ queryKey: ["teachers"] }),
      ]);
      setCourseElementId("");
      setTeachingUnitId("");
      toast.success(nextTeacherId ? "Affectation enregistrée" : "Affectation retirée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Affectation impossible");
    } finally {
      setAssignmentBusy(false);
    }
  };
  const exportAssignments = async () => {
    if (!assignedElements.length) return;
    try {
      const { exportToExcel } = await import("@/lib/export");
      exportToExcel(
        assignedElements.map((item) => ({
          Code: item.code ?? "",
          Matière: item.name,
          UE: item.teachingUnit.name,
          Programme: item.teachingUnit.semester.level.program.name,
          Niveau: item.teachingUnit.semester.level.name,
          Semestre: item.teachingUnit.semester.name,
          CM: item.hoursCM,
          TD: item.hoursTD,
          TP: item.hoursTP,
        })),
        `affectations-${teacher.employeeId ?? teacher.id}`,
        "Affectations",
      );
    } catch {
      toast.error("Impossible d’exporter les affectations.");
    }
  };
  return (
    <div className="space-y-4 text-slate-900">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Retour à la liste
      </button>
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div
          className="h-20 bg-gradient-to-r from-slate-900 to-emerald-800"
          aria-hidden="true"
        />
        <CardContent className="relative -mt-8 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="size-20 border-4 border-white shadow-md">
              <AvatarFallback className="bg-emerald-800 text-xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 sm:pt-9">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-950">
                  {fullName}
                </h1>
                <Badge
                  className={
                    teacher.isActive
                      ? "bg-emerald-50 text-emerald-950 hover:bg-emerald-50"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-100"
                  }
                >
                  {teacher.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {grades[teacher.grade ?? ""] ??
                  teacher.grade ??
                  "Grade non renseigné"}{" "}
                · {teacher.department?.name ?? "Département non affecté"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Matricule :{" "}
                <span className="font-mono font-semibold text-slate-950">
                  {teacher.employeeId ?? "Non renseigné"}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="mr-2 size-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab("affectations")}
            >
              <BookOpen className="mr-2 size-4" />
              Affectations
            </Button>
            <Button variant="outline" onClick={() => setView("maquette")}>
              Gérer les maquettes
            </Button>
            <Button
              variant="outline"
              disabled={!teacher.email}
              onClick={() => {
                if (teacher.email)
                  window.location.href = `mailto:${teacher.email}`;
              }}
            >
              <Mail className="mr-2 size-4" />
              Contacter
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Matières affectées",
            value: assignedElements.length,
            icon: BookOpen,
          },
          { label: "UE liées", value: distinctUnits, icon: GraduationCap },
          {
            label: "Séances planifiées",
            value: timetable.length,
            icon: Calendar,
          },
          {
            label: "Volume de la maquette",
            value: `${totalCourseHours} h`,
            icon: Clock,
          },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 bg-white">
            <CardContent className="flex items-center gap-3 p-4">
              <item.icon className="size-5 text-emerald-800" />
              <div>
                <p className="text-sm text-slate-700">{item.label}</p>
                <p className="text-xl font-bold text-slate-950">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto min-h-10 flex-wrap justify-start gap-1 bg-slate-100 p-1">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="affectations">Affectations</TabsTrigger>
          <TabsTrigger value="emploi">Emploi du temps</TabsTrigger>
        </TabsList>
        <TabsContent value="informations" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                  <User className="size-4" />
                  Identité et contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-600">Nom complet</p>
                  <p className="font-semibold text-slate-950">{fullName}</p>
                </div>
                <div>
                  <p className="text-slate-600">Adresse e-mail</p>
                  <p className="font-semibold text-slate-950">
                    {teacher.email ?? "Non renseignée"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Téléphone</p>
                  <p className="font-semibold text-slate-950">
                    {teacher.phone || "Non renseigné"}
                  </p>
                </div>
                {!teacher.linkedUser && (
                  <p className="rounded-md bg-amber-50 p-3 text-amber-950">
                    Aucun compte utilisateur associé à cette fiche.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                  <Building2 className="size-4" />
                  Situation professionnelle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-600">Grade</p>
                  <p className="font-semibold text-slate-950">
                    {grades[teacher.grade ?? ""] ??
                      teacher.grade ??
                      "Non renseigné"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Département</p>
                  <p className="font-semibold text-slate-950">
                    {teacher.department?.name ?? "Non affecté"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Spécialisation</p>
                  <p className="font-semibold text-slate-950">
                    {teacher.specialization || "Non renseignée"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">
                    Plafond hebdomadaire configuré
                  </p>
                  <p className="font-semibold text-slate-950">
                    {teacher.maxHoursPerWeek} h
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="affectations" className="mt-4 space-y-4">
          {canManageAssignments && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-slate-950">Gérer les affectations</CardTitle>
                <p className="text-sm text-slate-700">La responsabilité d’une UE donne accès à toutes ses matières et notes. Une affectation de matière donne accès uniquement à cette matière.</p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teacher-course-element">Matière à affecter</Label>
                  <select id="teacher-course-element" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" value={courseElementId} onChange={(event) => setCourseElementId(event.target.value)} disabled={assignmentBusy || structureError}>
                    <option value="">Choisir une matière</option>
                    {elements.filter((element) => element.teacher?.id !== teacher.id).map((element) => <option key={element.id} value={element.id}>{element.label}{element.teacher ? ` — attribuée à ${[element.teacher.user?.firstName, element.teacher.user?.lastName].filter(Boolean).join(" ") || "un autre enseignant"}` : ""}</option>)}
                  </select>
                  <Button size="sm" disabled={!courseElementId || assignmentBusy} onClick={() => { const element = elements.find((item) => item.id === courseElementId); if (element) void updateAssignment("course-element", element.id, element.teacher?.id ?? null, teacher.id); }}>Affecter la matière</Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-teaching-unit">UE à confier</Label>
                  <select id="teacher-teaching-unit" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" value={teachingUnitId} onChange={(event) => setTeachingUnitId(event.target.value)} disabled={assignmentBusy || structureError}>
                    <option value="">Choisir une UE</option>
                    {units.filter((unit) => unit.responsible?.id !== teacher.id).map((unit) => <option key={unit.id} value={unit.id}>{unit.label}{unit.responsible ? ` — confiée à ${[unit.responsible.user?.firstName, unit.responsible.user?.lastName].filter(Boolean).join(" ") || "un autre enseignant"}` : ""}</option>)}
                  </select>
                  <Button size="sm" disabled={!teachingUnitId || assignmentBusy} onClick={() => { const unit = units.find((item) => item.id === teachingUnitId); if (unit) void updateAssignment("teaching-unit", unit.id, unit.responsible?.id ?? null, teacher.id); }}>Confier l’UE</Button>
                </div>
                {structureError && <p role="alert" className="text-sm text-red-800">Impossible de charger la structure. Réessayez avant toute affectation.</p>}
              </CardContent>
            </Card>
          )}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base text-slate-950">
                Matières affectées
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={!assignedElements.length}
                onClick={exportAssignments}
              >
                <Download className="mr-2 size-4" />
                Exporter Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {assignedElements.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matière</TableHead>
                        <TableHead>UE</TableHead>
                        <TableHead>Programme / niveau</TableHead>
                        <TableHead>Semestre</TableHead>
                        <TableHead className="text-right">
                          CM / TD / TP
                        </TableHead>
                        {canManageAssignments && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedElements.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-950">
                            {item.code ? `${item.code} · ` : ""}
                            {item.name}
                          </TableCell>
                          <TableCell>
                            {item.teachingUnit.code
                              ? `${item.teachingUnit.code} · `
                              : ""}
                            {item.teachingUnit.name}
                          </TableCell>
                          <TableCell>
                            {item.teachingUnit.semester.level.program.name} ·{" "}
                            {item.teachingUnit.semester.level.name}
                          </TableCell>
                          <TableCell>
                            {item.teachingUnit.semester.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.hoursCM} / {item.hoursTD} / {item.hoursTP} h
                          </TableCell>
                          {canManageAssignments && <TableCell className="text-right"><Button variant="outline" size="sm" disabled={assignmentBusy} onClick={() => void updateAssignment("course-element", item.id, teacher.id, null)}>Retirer</Button></TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-700">
                  Aucune matière affectée à cet enseignant.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">
                UE dont l’enseignant est responsable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {responsibleUnits.length ? (
                <ul className="divide-y divide-slate-200">
                  {responsibleUnits.map((unit) => (
                    <li key={unit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div>
                      <p className="font-semibold text-slate-950">
                        {unit.code ? `${unit.code} · ` : ""}
                        {unit.name}
                      </p>
                      <p className="text-slate-700">
                        {unit.semester.level.program.name} ·{" "}
                        {unit.semester.level.name} · {unit.semester.name} ·{" "}
                        {unit.credits} crédits
                      </p>
                      </div>
                      {canManageAssignments && <Button variant="outline" size="sm" disabled={assignmentBusy} onClick={() => void updateAssignment("teaching-unit", unit.id, teacher.id, null)}>Retirer la responsabilité</Button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-700">
                  Aucune responsabilité d’UE enregistrée.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emploi" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-slate-950">
                  Emploi du temps
                </CardTitle>
                <p className="mt-1 text-sm text-slate-700">
                  {academicYear
                    ? `Année académique ${academicYear.name}`
                    : "Aucune année académique active"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("timetable")}
              >
                Gérer l’emploi du temps
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {timetable.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jour</TableHead>
                        <TableHead>Horaire</TableHead>
                        <TableHead>Matière</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Salle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timetable.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium">
                            {days[slot.dayOfWeek] ?? `Jour ${slot.dayOfWeek}`}
                          </TableCell>
                          <TableCell>
                            {slot.startTime}–{slot.endTime}
                          </TableCell>
                          <TableCell>
                            {slot.course
                              ? `${slot.course.code ? `${slot.course.code} · ` : ""}${slot.course.name}`
                              : "Matière non renseignée"}
                          </TableCell>
                          <TableCell>{slot.type}</TableCell>
                          <TableCell>{slot.room ?? "Non renseignée"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-700">
                  {academicYear
                    ? "Aucune séance planifiée pour cet enseignant cette année."
                    : "Sélectionnez une année académique pour consulter les séances."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {editing && (
        <TeacherEditDialog
          key={teacher.id}
          teacher={teacher}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
