import { isGasConnected, gasGetResponses, gasGetPlans, gasGetSchedule, gasGetReflection, upsertUser } from './gas'

let syncQueue: (() => Promise<unknown>)[] = []
let syncing = false

export function queueSync(fn: () => Promise<unknown>) {
  syncQueue.push(fn)
  processQueue()
}

async function processQueue() {
  if (syncing || syncQueue.length === 0) return
  syncing = true
  while (syncQueue.length > 0) {
    const fn = syncQueue.shift()!
    try {
      await fn()
    } catch (e) {
      console.error('Sync failed:', e)
    }
  }
  syncing = false
}

let preloadPromise: Promise<void> | null = null
let preloadDone = false

export function isPreloadDone() {
  return !isGasConnected() || preloadDone
}

export function waitForPreload(): Promise<void> {
  if (preloadDone || !isGasConnected()) return Promise.resolve()
  if (preloadPromise) return preloadPromise
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (preloadDone) { clearInterval(check); resolve() }
    }, 100)
    setTimeout(() => { clearInterval(check); resolve() }, 5000)
  })
}

export async function preloadUserData(email: string, name: string, examIds: string[]) {
  if (preloadPromise) return preloadPromise
  preloadPromise = _preload(email, name, examIds)
  await preloadPromise
  preloadDone = true
}

async function _preload(email: string, name: string, examIds: string[]) {
  if (!isGasConnected()) return

  try {
    await upsertUser(email, name)
  } catch { /* ignore */ }

  for (const examId of examIds) {
    if (!localStorage.getItem(`responses_${examId}`)) {
      try {
        const data = await gasGetResponses(email, examId)
        if (data && data.length > 0) {
          localStorage.setItem(`responses_${examId}`, JSON.stringify(data))
        }
      } catch { /* ignore */ }
    }

    if (!localStorage.getItem(`plandata_${examId}`)) {
      try {
        const plans = await gasGetPlans(email, examId)
        if (plans && plans.length > 0) {
          const planMap: Record<string, unknown> = {}
          for (const p of plans) {
            planMap[`${p.subjectName}_${p.questionNo}`] = {
              rank: p.rank, textbook: p.textbook, hours: p.hours,
              goal: p.goal, period: p.period, notes: p.notes, learnings: p.learnings,
            }
          }
          localStorage.setItem(`plandata_${examId}`, JSON.stringify(planMap))
        }
      } catch { /* ignore */ }
    }

    if (!localStorage.getItem(`reflection_${examId}`)) {
      try {
        const ref = await gasGetReflection(email, examId)
        if (ref) {
          localStorage.setItem(`reflection_${examId}`, JSON.stringify(ref))
        }
      } catch { /* ignore */ }
    }
  }

  if (!localStorage.getItem('schedule')) {
    try {
      const sched = await gasGetSchedule(email)
      if (sched) {
        localStorage.setItem('schedule', JSON.stringify(sched.data))
        localStorage.setItem('weekendSlots', JSON.stringify(sched.weekendSlots))
      }
    } catch { /* ignore */ }
  }
}
