const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const COLLECTIONS = {
  users: 'users',
  classes: 'classes',
  lessons: 'lessons',
  students: 'students',
}

async function getUserByOpenId(openid) {
  const userRes = await db.collection(COLLECTIONS.users).where({ openid }).get()
  return userRes.data[0]
}

async function assertRole(openid, role) {
  const user = await getUserByOpenId(openid)
  if (!user || user.role !== role) {
    const error = new Error('没有权限访问该资源')
    error.code = 'FORBIDDEN'
    throw error
  }
  return user
}

async function assertTeacherOwnsClass(teacherId, classId) {
  const classRes = await db.collection(COLLECTIONS.classes).doc(classId).get()
  const classInfo = classRes.data
  if (!classInfo || classInfo.teacherId !== teacherId) {
    const error = new Error('班级不存在或无权限')
    error.code = 'FORBIDDEN'
    throw error
  }
  return classInfo
}

function normalizeRequirements(requirements) {
  if (!requirements || requirements.length === 0) {
    return ''
  }
  return requirements.join('、')
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, payload = {} } = event

  switch (action) {
    case 'getUserProfile': {
      const user = await getUserByOpenId(OPENID)
      return {
        role: user?.role || '',
        name: user?.name || '',
      }
    }
    case 'getTeacherClasses': {
      const teacher = await assertRole(OPENID, 'teacher')
      const classRes = await db.collection(COLLECTIONS.classes).where({ teacherId: teacher._id }).get()
      const classes = classRes.data.map((item) => ({
        _id: item._id,
        name: item.name,
        scheduleSummary: item.scheduleSummary || item.scheduleTime || '查看课程日历',
      }))
      return { classes }
    }
    case 'getClassSchedule': {
      const teacher = await assertRole(OPENID, 'teacher')
      const classInfo = await assertTeacherOwnsClass(teacher._id, payload.classId)
      const lessonsRes = await db.collection(COLLECTIONS.lessons)
        .where({ classId: payload.classId })
        .orderBy('date', 'desc')
        .get()
      const schedule = lessonsRes.data.map((lesson) => ({
        _id: lesson._id,
        date: lesson.date,
        time: lesson.time,
        topic: lesson.topic || '',
      }))
      return { className: classInfo.name, schedule }
    }
    case 'getLessonDetail': {
      const teacher = await assertRole(OPENID, 'teacher')
      await assertTeacherOwnsClass(teacher._id, payload.classId)
      const lessonRes = await db.collection(COLLECTIONS.lessons).doc(payload.lessonId).get()
      const lesson = lessonRes.data
      if (!lesson || lesson.classId !== payload.classId) {
        throw new Error('课程不存在')
      }
      const studentRes = await db.collection(COLLECTIONS.students).where({ classId: payload.classId }).get()
      const records = {}
      ;(lesson.studentRecords || []).forEach((record) => {
        records[record.studentId] = record
      })
      return {
        lesson: {
          _id: lesson._id,
          date: lesson.date,
          time: lesson.time,
        },
        students: studentRes.data.map((student) => ({
          _id: student._id,
          name: student.name,
          rewardTotal: student.rewardTotal || 0,
        })),
        records,
      }
    }
    case 'updateLessonRecord': {
      const teacher = await assertRole(OPENID, 'teacher')
      await assertTeacherOwnsClass(teacher._id, payload.classId)
      const lessonRef = db.collection(COLLECTIONS.lessons).doc(payload.lessonId)
      const lessonRes = await lessonRef.get()
      const lesson = lessonRes.data
      if (!lesson || lesson.classId !== payload.classId) {
        throw new Error('课程不存在')
      }
      const records = lesson.studentRecords || []
      const recordIndex = records.findIndex((record) => record.studentId === payload.studentId)
      const previousReward = recordIndex >= 0 ? Number(records[recordIndex].reward || 0) : 0
      const nextRecord = {
        studentId: payload.studentId,
        attendance: payload.attendance || '出勤',
        rating: payload.rating || '1星',
        comment: payload.comment || '',
        requirements: payload.requirements || [],
        reward: Number(payload.reward || 0),
      }
      if (recordIndex >= 0) {
        records.splice(recordIndex, 1, nextRecord)
      } else {
        records.push(nextRecord)
      }
      await lessonRef.update({
        data: { studentRecords: records },
      })

      const rewardDelta = nextRecord.reward - previousReward
      if (rewardDelta !== 0) {
        await db.collection(COLLECTIONS.students).doc(payload.studentId).update({
          data: { rewardTotal: db.command.inc(rewardDelta) },
        })
      }
      return { ok: true }
    }
    case 'getStudentHistory': {
      const teacher = await assertRole(OPENID, 'teacher')
      await assertTeacherOwnsClass(teacher._id, payload.classId)
      const studentRes = await db.collection(COLLECTIONS.students).doc(payload.studentId).get()
      const student = studentRes.data
      if (!student || student.classId !== payload.classId) {
        throw new Error('学生不存在')
      }
      const lessonsRes = await db.collection(COLLECTIONS.lessons)
        .where({ classId: payload.classId })
        .orderBy('date', 'desc')
        .get()
      const records = lessonsRes.data.map((lesson) => {
        const record = (lesson.studentRecords || []).find((item) => item.studentId === payload.studentId) || {}
        return {
          _id: lesson._id,
          date: lesson.date,
          time: lesson.time,
          attendance: record.attendance || '未记录',
          rating: record.rating || '-',
          comment: record.comment || '',
          requirements: normalizeRequirements(record.requirements),
          reward: record.reward || 0,
        }
      })
      return { studentName: student.name, records }
    }
    case 'getParentDashboard': {
      const parent = await assertRole(OPENID, 'parent')
      const studentRes = await db.collection(COLLECTIONS.students).doc(parent.childId).get()
      const student = studentRes.data
      if (!student) {
        throw new Error('未绑定孩子信息')
      }
      const classRes = await db.collection(COLLECTIONS.classes).doc(student.classId).get()
      const classInfo = classRes.data
      const lessonsRes = await db.collection(COLLECTIONS.lessons)
        .where({ classId: student.classId })
        .orderBy('date', 'desc')
        .get()
      let latestRecord = null
      for (const lesson of lessonsRes.data) {
        const record = (lesson.studentRecords || []).find((item) => item.studentId === student._id)
        if (record) {
          latestRecord = {
            attendance: record.attendance,
            rating: record.rating,
            comment: record.comment,
            requirements: normalizeRequirements(record.requirements),
            reward: record.reward || 0,
          }
          break
        }
      }
      return {
        childName: student.name,
        className: classInfo?.name || '',
        classTime: classInfo?.scheduleTime || '',
        latestRecord,
        rewardTotal: student.rewardTotal || 0,
      }
    }
    case 'getParentHistory': {
      const parent = await assertRole(OPENID, 'parent')
      const studentRes = await db.collection(COLLECTIONS.students).doc(parent.childId).get()
      const student = studentRes.data
      if (!student) {
        throw new Error('未绑定孩子信息')
      }
      const lessonsRes = await db.collection(COLLECTIONS.lessons)
        .where({ classId: student.classId })
        .orderBy('date', 'desc')
        .get()
      const records = lessonsRes.data.map((lesson) => {
        const record = (lesson.studentRecords || []).find((item) => item.studentId === student._id) || {}
        return {
          _id: lesson._id,
          date: lesson.date,
          time: lesson.time,
          attendance: record.attendance || '未记录',
          rating: record.rating || '-',
          comment: record.comment || '',
          requirements: normalizeRequirements(record.requirements),
          reward: record.reward || 0,
        }
      })
      return { records }
    }
    default:
      throw new Error('未知的 action')
  }
}
