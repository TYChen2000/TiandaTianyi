Page({
  data: {
    classId: '',
    lessonId: '',
    lessonInfo: {},
    studentItems: [],
    loading: true,
    error: '',
    attendanceOptions: ['出勤', '缺勤', '请假'],
    ratingOptions: ['1星', '2星', '3星'],
    requirementOptions: ['复盘', '打谱', '线上对弈'],
  },
  onLoad(options) {
    this.setData({
      classId: options.classId || '',
      lessonId: options.lessonId || '',
    })
    this.fetchLesson()
  },
  fetchLesson() {
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getLessonDetail',
        payload: { lessonId: this.data.lessonId, classId: this.data.classId },
      },
    }).then((res) => {
      const result = res.result || {}
      const students = result.students || []
      const records = result.records || {}
      const studentItems = students.map((student) => {
        const record = records[student._id] || {}
        return {
          studentId: student._id,
          name: student.name,
          attendance: record.attendance || '出勤',
          rating: record.rating || '1星',
          comment: record.comment || '',
          requirements: record.requirements || [],
          reward: record.reward || 0,
        }
      })
      this.setData({
        lessonInfo: result.lesson || {},
        studentItems,
        loading: false,
        error: '',
      })
    }).catch((err) => {
      this.setData({
        loading: false,
        error: err?.message || '加载失败',
      })
    })
  },
  onPickerChange(e) {
    const { index, field } = e.currentTarget.dataset
    const valueIndex = Number(e.detail.value)
    const options = field === 'attendance' ? this.data.attendanceOptions : this.data.ratingOptions
    this.updateStudentField(index, field, options[valueIndex])
  },
  onCommentInput(e) {
    const { index } = e.currentTarget.dataset
    this.updateStudentField(index, 'comment', e.detail.value)
  },
  onRewardInput(e) {
    const { index } = e.currentTarget.dataset
    this.updateStudentField(index, 'reward', Number(e.detail.value || 0))
  },
  onRequirementChange(e) {
    const { index } = e.currentTarget.dataset
    this.updateStudentField(index, 'requirements', e.detail.value)
  },
  updateStudentField(index, field, value) {
    const studentItems = [...this.data.studentItems]
    studentItems[index] = { ...studentItems[index], [field]: value }
    this.setData({ studentItems })
  },
  saveStudent(e) {
    const { index } = e.currentTarget.dataset
    const student = this.data.studentItems[index]
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'updateLessonRecord',
        payload: {
          lessonId: this.data.lessonId,
          classId: this.data.classId,
          studentId: student.studentId,
          attendance: student.attendance,
          rating: student.rating,
          comment: student.comment,
          requirements: student.requirements,
          reward: student.reward,
        },
      },
    }).then(() => {
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: err?.message || '保存失败', icon: 'none' })
    })
  },
  goStudentHistory(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/teacher/student/index?studentId=${id}&classId=${this.data.classId}` })
  },
})
