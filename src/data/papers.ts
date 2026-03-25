const DRIVE = 'https://drive.google.com/file/d'

function driveUrl(id: string) {
  return `${DRIVE}/${id}/preview`
}

export interface PaperInfo {
  url: string
  label: string
}

// examId → subjectName → PaperInfo[]
// 수학 공통은 '수학'에, 선택과목은 해당 이름에 매핑
// 수학 탭에서는 공통 PDF만, 선택과목 탭에서는 선택 PDF만 보여줌

const PAPERS: Record<string, Record<string, PaperInfo[]>> = {
  exam_202603: {
    '국어': [{ url: driveUrl('1S7182fa4LaA1Y-BvbWYvyFQpMmellsH8'), label: '국어' }],
    '수학': [{ url: driveUrl('1_7GCoVHWT9UA23k0askqyfu-IdL88VZa'), label: '수학 공통' }],
    '확률과 통계': [{ url: driveUrl('1lMsvHlZJZ42D3BJ7LMwvsTmQkDSCoeHV'), label: '확률과 통계' }],
    '미적분': [{ url: driveUrl('1MRhvT9S4WJ8dw1Z3Xc7pUidQZsJcqC60'), label: '미적분' }],
    '기하': [{ url: driveUrl('1R1MQuEK_R7Of23lnVZcIjPnBw3by1-za'), label: '기하' }],
    '영어': [{ url: driveUrl('17dXTWY1FaWLCGH331R6L7rah10u0v8KF'), label: '영어' }],
    '한국사': [{ url: driveUrl('1LKv7x9B0e49n4y7_3VquQw84lxML9DV-'), label: '한국사' }],
    '물리학 I': [{ url: driveUrl('1cEsYqVYdWlmcSKB0EXzQRamMY3qGmguW'), label: '물리학 I' }],
    '화학 I': [{ url: driveUrl('1yJvEhrinGbQCBV8Jg4ZG1ospbJdPuSAK'), label: '화학 I' }],
    '생명과학 I': [{ url: driveUrl('1seUyICSqsHAOe8C2QvHew3uJ6vOno5ab'), label: '생명과학 I' }],
    '지구과학  I': [{ url: driveUrl('13pj-eZeBBEByk_1KeOl2Sk_N2R-pJT3A'), label: '지구과학 I' }],
    '생활과 윤리': [{ url: driveUrl('1LFrhLtrTfUUQNROPaibCICHVn98UH46k'), label: '생활과 윤리' }],
    '윤리와 사상': [{ url: driveUrl('1tuFQNsQlYBBPbmXPLAexebAnkVVApE1I'), label: '윤리와 사상' }],
    '한국지리': [{ url: driveUrl('1hPwWDLqM5ts-FsQr__XoTAYBgF6aDxWV'), label: '한국지리' }],
    '세계지리': [{ url: driveUrl('1eVarRB4BiRdV8SAXUBZCJbw8GzwqKZ3S'), label: '세계지리' }],
    '동아시아사': [{ url: driveUrl('14jcM7Z7wbPCmZGF2nZfD5mrACP6BLKGH'), label: '동아시아사' }],
    '세계사': [{ url: driveUrl('1eo50XPJKFmfy_PHIGln-R4j0fuvjKUQa'), label: '세계사' }],
    '경제': [{ url: driveUrl('1_a-xw-NUNBm68ydwf_gcgT73dw94In25'), label: '경제' }],
    '정치와 법': [{ url: driveUrl('1yXxZig7YKp0Y4vMibM_RIhrh9j8BCFH-'), label: '정치와 법' }],
    '사회문화': [{ url: driveUrl('1fHpPi5DOxQLMnnajJUa_jvpQqgGpat1W'), label: '사회문화' }],
  },
}

export function getPapers(examId: string, subjectName: string): PaperInfo[] {
  return PAPERS[examId]?.[subjectName] || []
}
