import { isGasConnected, gasGetPapers } from '@/lib/gas'

export interface PaperInfo {
  url: string
  label: string
}

const DRIVE_FOLDER_ID = '1Lv56aT0U2sWvmeZw3fEmWdJdi5kprgo9'

let cachedPapers: Record<string, Record<string, PaperInfo[]>> | null = null
let loading = false
let loadPromise: Promise<void> | null = null

export async function loadPapersFromDrive() {
  if (cachedPapers || !isGasConnected()) return
  if (loadPromise) return loadPromise

  loading = true
  loadPromise = gasGetPapers(DRIVE_FOLDER_ID)
    .then((data) => {
      if (data) cachedPapers = data
    })
    .catch(() => {})
    .finally(() => { loading = false })

  return loadPromise
}

export function getPapers(examId: string, subjectName: string): PaperInfo[] {
  if (cachedPapers) {
    return cachedPapers[examId]?.[subjectName] || []
  }
  return FALLBACK[examId]?.[subjectName] || []
}

export function isPapersLoading() {
  return loading
}

const D = (id: string) => `https://drive.google.com/file/d/${id}/preview`

const FALLBACK: Record<string, Record<string, PaperInfo[]>> = {
  exam_202603: {
    '국어': [{ url: D('1S7182fa4LaA1Y-BvbWYvyFQpMmellsH8'), label: '국어' }],
    '수학': [{ url: D('1_7GCoVHWT9UA23k0askqyfu-IdL88VZa'), label: '수학 공통' }],
    '확률과 통계': [{ url: D('1lMsvHlZJZ42D3BJ7LMwvsTmQkDSCoeHV'), label: '확률과 통계' }],
    '미적분': [{ url: D('1MRhvT9S4WJ8dw1Z3Xc7pUidQZsJcqC60'), label: '미적분' }],
    '기하': [{ url: D('1R1MQuEK_R7Of23lnVZcIjPnBw3by1-za'), label: '기하' }],
    '영어': [{ url: D('17dXTWY1FaWLCGH331R6L7rah10u0v8KF'), label: '영어' }],
    '한국사': [{ url: D('1LKv7x9B0e49n4y7_3VquQw84lxML9DV-'), label: '한국사' }],
    '물리학 I': [{ url: D('1cEsYqVYdWlmcSKB0EXzQRamMY3qGmguW'), label: '물리학 I' }],
    '화학 I': [{ url: D('1yJvEhrinGbQCBV8Jg4ZG1ospbJdPuSAK'), label: '화학 I' }],
    '생명과학 I': [{ url: D('1seUyICSqsHAOe8C2QvHew3uJ6vOno5ab'), label: '생명과학 I' }],
    '지구과학  I': [{ url: D('13pj-eZeBBEByk_1KeOl2Sk_N2R-pJT3A'), label: '지구과학 I' }],
    '생활과 윤리': [{ url: D('1LFrhLtrTfUUQNROPaibCICHVn98UH46k'), label: '생활과 윤리' }],
    '윤리와 사상': [{ url: D('1tuFQNsQlYBBPbmXPLAexebAnkVVApE1I'), label: '윤리와 사상' }],
    '한국지리': [{ url: D('1hPwWDLqM5ts-FsQr__XoTAYBgF6aDxWV'), label: '한국지리' }],
    '세계지리': [{ url: D('1eVarRB4BiRdV8SAXUBZCJbw8GzwqKZ3S'), label: '세계지리' }],
    '동아시아사': [{ url: D('14jcM7Z7wbPCmZGF2nZfD5mrACP6BLKGH'), label: '동아시아사' }],
    '세계사': [{ url: D('1eo50XPJKFmfy_PHIGln-R4j0fuvjKUQa'), label: '세계사' }],
    '경제': [{ url: D('1_a-xw-NUNBm68ydwf_gcgT73dw94In25'), label: '경제' }],
    '정치와 법': [{ url: D('1yXxZig7YKp0Y4vMibM_RIhrh9j8BCFH-'), label: '정치와 법' }],
    '사회문화': [{ url: D('1fHpPi5DOxQLMnnajJUa_jvpQqgGpat1W'), label: '사회문화' }],
  },
}
