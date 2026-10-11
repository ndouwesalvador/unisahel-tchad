export const STUDENT_DOCUMENT_TYPES = [
  'RELEVE_NOTES',
  'ATTESTATION_INSCRIPTION',
  'CERTIFICAT_SCOLARITE',
  'ATTESTATION_NIVEAU',
  'DIPLOME',
] as const

const STUDENT_DOCUMENT_TYPE_SET = new Set<string>(STUDENT_DOCUMENT_TYPES)

export function isStudentDocumentType(type: string) {
  return STUDENT_DOCUMENT_TYPE_SET.has(type)
}
