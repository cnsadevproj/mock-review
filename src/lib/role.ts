export function getRole(email: string): 'student' | 'teacher' {
  const id = email.split('@')[0]
  return /^\d{5}$/.test(id) ? 'student' : 'teacher'
}

export function parseStudentId(email: string) {
  const id = email.split('@')[0]
  if (!/^\d{5}$/.test(id)) return null
  return {
    grade: parseInt(id[0]),
    classNo: parseInt(id.slice(1, 3)),
    number: parseInt(id.slice(3, 5)),
  }
}
