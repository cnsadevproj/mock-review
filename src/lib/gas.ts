import { WrongAnswer } from '@/types'

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || ''

export function isGasConnected() {
  return GAS_URL.length > 0
}

async function gasCall<T = unknown>(params: Record<string, unknown>): Promise<T> {
  if (!GAS_URL) throw new Error('GAS_URL not configured')
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result as T
}

export async function upsertUser(email: string, name: string) {
  return gasCall<{ email: string; role: string }>({
    action: 'upsertUser', email, name,
  })
}

export async function gasSaveResponses(email: string, examId: string, responses: WrongAnswer[]) {
  return gasCall<{ saved: number }>({
    action: 'saveResponses', email, examId, responses,
  })
}

export async function gasGetResponses(email: string, examId: string) {
  return gasCall<WrongAnswer[]>({
    action: 'getResponses', email, examId,
  })
}

export async function gasSavePlans(
  email: string,
  examId: string,
  plans: { subjectName: string; questionNo: number; rank: number; textbook: string; hours: string; goal: string; period: string; notes: string; learnings: string }[]
) {
  return gasCall<{ saved: number }>({
    action: 'savePlan', email, examId, plans,
  })
}

export async function gasGetPlans(email: string, examId: string) {
  return gasCall<{ subjectName: string; questionNo: number; rank: number; textbook: string; hours: string; goal: string; period: string; notes: string; learnings: string }[]>({
    action: 'getPlans', email, examId,
  })
}

export async function gasGetClassResponses(examId: string, grade?: number, classNo?: number) {
  return gasCall<{ email: string; subjectName: string; questionNo: number; subjectIds: number[] }[]>({
    action: 'getClassResponses', examId, grade, classNo,
  })
}

export async function gasGetAllUsers() {
  return gasCall<{ email: string; name: string; grade: number; class: number; number: number; role: string }[]>({
    action: 'getAllUsers',
  })
}

export async function gasSaveSchedule(email: string, data: Record<string, unknown>, weekendSlots: string[]) {
  return gasCall({ action: 'saveSchedule', email, data, weekendSlots })
}

export async function gasGetSchedule(email: string) {
  return gasCall<{ data: Record<string, unknown>; weekendSlots: string[] } | null>({
    action: 'getSchedule', email,
  })
}

export async function gasSaveReflection(email: string, examId: string, data: Record<string, string>) {
  return gasCall({ action: 'saveReflection', email, examId, data })
}

export async function gasGetReflection(email: string, examId: string) {
  return gasCall<Record<string, string> | null>({
    action: 'getReflection', email, examId,
  })
}
