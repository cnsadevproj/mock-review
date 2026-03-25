const SS = SpreadsheetApp.getActiveSpreadsheet()

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents)
    const action = params.action
    const result = handleAction(action, params)
    return jsonResponse({ result })
  } catch (err) {
    return jsonResponse({ error: err.message })
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action
    const result = handleAction(action, e.parameter)
    return jsonResponse({ result })
  } catch (err) {
    return jsonResponse({ error: err.message })
  }
}

function handleAction(action, params) {
  switch (action) {
    case 'getUser': return getUser(params.email)
    case 'upsertUser': return upsertUser(params)
    case 'saveResponses': return saveResponses(params)
    case 'getResponses': return getResponses(params.email, params.examId)
    case 'getClassResponses': return getClassResponses(params.examId, params.grade, params.classNo)
    case 'savePlan': return savePlan(params)
    case 'getPlans': return getPlans(params.email, params.examId)
    case 'getClassPlans': return getClassPlans(params.examId)
    case 'getSubjectTree': return getSubjectTree()
    case 'getAllUsers': return getAllUsers()
    case 'saveSchedule': return saveSchedule(params)
    case 'getSchedule': return getSchedule(params.email)
    case 'saveReflection': return saveReflection(params)
    case 'getReflection': return getReflection(params.email, params.examId)
    default: throw new Error('Unknown action: ' + action)
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function getOrCreateSheet(name, headers) {
  let sheet = SS.getSheetByName(name)
  if (!sheet) {
    sheet = SS.insertSheet(name)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
  }
  return sheet
}

// === Users ===
function getUser(email) {
  const sheet = getOrCreateSheet('Users', ['email', 'name', 'grade', 'class', 'number', 'role'])
  const data = sheet.getDataRange().getValues()
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return { email: data[i][0], name: data[i][1], grade: data[i][2], class: data[i][3], number: data[i][4], role: data[i][5] }
    }
  }
  return null
}

function upsertUser(params) {
  const sheet = getOrCreateSheet('Users', ['email', 'name', 'grade', 'class', 'number', 'role'])
  const data = sheet.getDataRange().getValues()
  const id = params.email.split('@')[0]
  const isStudent = /^\d{5}$/.test(id)
  const role = isStudent ? 'student' : 'teacher'
  const grade = isStudent ? parseInt(id[0]) : 0
  const classNo = isStudent ? parseInt(id.slice(1, 3)) : 0
  const number = isStudent ? parseInt(id.slice(3, 5)) : 0

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.email) {
      sheet.getRange(i + 1, 2).setValue(params.name)
      return { email: params.email, role }
    }
  }
  sheet.appendRow([params.email, params.name, grade, classNo, number, role])
  return { email: params.email, role }
}

// === Responses ===
function saveResponses(params) {
  const sheet = getOrCreateSheet('Responses', ['email', 'examId', 'subjectName', 'questionNo', 'subjectIds'])
  const existing = sheet.getDataRange().getValues()
  const rowsToDelete = []
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][0] === params.email && existing[i][1] === params.examId) {
      rowsToDelete.push(i + 1)
    }
  }
  for (const r of rowsToDelete) {
    sheet.deleteRow(r)
  }

  const rows = params.responses.map(function(r) {
    return [params.email, params.examId, r.subjectName, r.questionNo, JSON.stringify(r.subjectIds)]
  })
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows)
  }
  return { saved: rows.length }
}

function getResponses(email, examId) {
  const sheet = getOrCreateSheet('Responses', ['email', 'examId', 'subjectName', 'questionNo', 'subjectIds'])
  const data = sheet.getDataRange().getValues()
  const results = []
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email && data[i][1] === examId) {
      results.push({
        subjectName: data[i][2],
        questionNo: data[i][3],
        subjectIds: JSON.parse(data[i][4]),
      })
    }
  }
  return results
}

function getClassResponses(examId, grade, classNo) {
  const sheet = getOrCreateSheet('Responses', ['email', 'examId', 'subjectName', 'questionNo', 'subjectIds'])
  const data = sheet.getDataRange().getValues()
  const userSheet = getOrCreateSheet('Users', ['email', 'name', 'grade', 'class', 'number', 'role'])
  const users = userSheet.getDataRange().getValues()

  const emailSet = new Set()
  for (let i = 1; i < users.length; i++) {
    if ((!grade || users[i][2] == grade) && (!classNo || users[i][3] == classNo)) {
      emailSet.add(users[i][0])
    }
  }

  const results = []
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === examId && emailSet.has(data[i][0])) {
      results.push({
        email: data[i][0],
        subjectName: data[i][2],
        questionNo: data[i][3],
        subjectIds: JSON.parse(data[i][4]),
      })
    }
  }
  return results
}

// === Plans ===
function savePlan(params) {
  const sheet = getOrCreateSheet('Plans', ['email', 'examId', 'subjectName', 'questionNo', 'rank', 'textbook', 'hours', 'goal', 'period', 'notes', 'learnings'])
  const existing = sheet.getDataRange().getValues()
  const rowsToDelete = []
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][0] === params.email && existing[i][1] === params.examId) {
      rowsToDelete.push(i + 1)
    }
  }
  for (const r of rowsToDelete) {
    sheet.deleteRow(r)
  }

  const rows = params.plans.map(function(p) {
    return [params.email, params.examId, p.subjectName, p.questionNo, p.rank, p.textbook, p.hours, p.goal, p.period, p.notes, p.learnings]
  })
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 11).setValues(rows)
  }
  return { saved: rows.length }
}

function getPlans(email, examId) {
  const sheet = getOrCreateSheet('Plans', ['email', 'examId', 'subjectName', 'questionNo', 'rank', 'textbook', 'hours', 'goal', 'period', 'notes', 'learnings'])
  const data = sheet.getDataRange().getValues()
  const results = []
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email && data[i][1] === examId) {
      results.push({
        subjectName: data[i][2], questionNo: data[i][3], rank: data[i][4],
        textbook: data[i][5], hours: data[i][6], goal: data[i][7],
        period: data[i][8], notes: data[i][9], learnings: data[i][10],
      })
    }
  }
  return results
}

function getClassPlans(examId) {
  const sheet = getOrCreateSheet('Plans', ['email', 'examId', 'subjectName', 'questionNo', 'rank', 'textbook', 'hours', 'goal', 'period', 'notes', 'learnings'])
  const data = sheet.getDataRange().getValues()
  const results = []
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === examId) {
      results.push({
        email: data[i][0], subjectName: data[i][2], questionNo: data[i][3],
        rank: data[i][4], textbook: data[i][5], hours: data[i][6],
        goal: data[i][7], period: data[i][8], notes: data[i][9], learnings: data[i][10],
      })
    }
  }
  return results
}

// === All Users ===
function getAllUsers() {
  const sheet = getOrCreateSheet('Users', ['email', 'name', 'grade', 'class', 'number', 'role'])
  const data = sheet.getDataRange().getValues()
  const results = []
  for (let i = 1; i < data.length; i++) {
    results.push({ email: data[i][0], name: data[i][1], grade: data[i][2], class: data[i][3], number: data[i][4], role: data[i][5] })
  }
  return results
}

// === SubjectTree ===
function getSubjectTree() {
  const sheet = getOrCreateSheet('SubjectTree', ['id', 'subjectGroup', 'subjectName', 'major', 'middle', 'minor'])
  const data = sheet.getDataRange().getValues()
  const results = []
  for (let i = 1; i < data.length; i++) {
    results.push({
      id: data[i][0], subjectGroup: data[i][1], subjectName: data[i][2],
      major: data[i][3], middle: data[i][4], minor: data[i][5],
    })
  }
  return results
}

// === Schedule ===
function saveSchedule(params) {
  const sheet = getOrCreateSheet('Schedule', ['email', 'data', 'weekendSlots'])
  const existing = sheet.getDataRange().getValues()
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][0] === params.email) sheet.deleteRow(i + 1)
  }
  sheet.appendRow([params.email, JSON.stringify(params.data), JSON.stringify(params.weekendSlots)])
  return { saved: true }
}

function getSchedule(email) {
  const sheet = getOrCreateSheet('Schedule', ['email', 'data', 'weekendSlots'])
  const data = sheet.getDataRange().getValues()
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === email) {
      return { data: JSON.parse(data[i][1]), weekendSlots: JSON.parse(data[i][2]) }
    }
  }
  return null
}

// === Reflection ===
function saveReflection(params) {
  const sheet = getOrCreateSheet('Reflections', ['email', 'examId', 'data'])
  const existing = sheet.getDataRange().getValues()
  for (let i = existing.length - 1; i >= 1; i--) {
    if (existing[i][0] === params.email && existing[i][1] === params.examId) sheet.deleteRow(i + 1)
  }
  sheet.appendRow([params.email, params.examId, JSON.stringify(params.data)])
  return { saved: true }
}

function getReflection(email, examId) {
  const sheet = getOrCreateSheet('Reflections', ['email', 'examId', 'data'])
  const data = sheet.getDataRange().getValues()
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === email && data[i][1] === examId) return JSON.parse(data[i][2])
  }
  return null
}
