import subjectData from '@/data/subjects.json'
import { SubjectItem } from '@/types'

const subjects: SubjectItem[] = subjectData as SubjectItem[]

export function getSubjectGroups(): string[] {
  return [...new Set(subjects.map((s) => s.subjectGroup))]
}

export function getSubjectNames(group: string): string[] {
  return [...new Set(subjects.filter((s) => s.subjectGroup === group).map((s) => s.subjectName))]
}

export function getSubjectTree(subjectName: string) {
  const items = subjects.filter((s) => s.subjectName === subjectName)
  const tree: Record<string, Record<string, SubjectItem[]>> = {}

  for (const item of items) {
    if (!tree[item.major]) tree[item.major] = {}
    if (!tree[item.major][item.middle]) tree[item.major][item.middle] = []
    tree[item.major][item.middle].push(item)
  }

  return tree
}

export function getGroupTree(group: string, filterNames?: string[]) {
  const items = subjects.filter((s) =>
    s.subjectGroup === group && (!filterNames || filterNames.includes(s.subjectName))
  )
  const raw: Record<string, Record<string, Record<string, SubjectItem[]>>> = {}

  for (const item of items) {
    if (!raw[item.subjectName]) raw[item.subjectName] = {}
    if (!raw[item.subjectName][item.major]) raw[item.subjectName][item.major] = {}
    if (!raw[item.subjectName][item.major][item.middle])
      raw[item.subjectName][item.major][item.middle] = []
    raw[item.subjectName][item.major][item.middle].push(item)
  }

  if (!filterNames) return raw
  const ordered: typeof raw = {}
  for (const name of filterNames) {
    if (raw[name]) ordered[name] = raw[name]
  }
  return ordered
}

export function getSubjectById(id: number): SubjectItem | undefined {
  return subjects.find((s) => s.id === id)
}

export function getSubjectsForGroup(group: string): SubjectItem[] {
  return subjects.filter((s) => s.subjectGroup === group)
}

export { subjects }
