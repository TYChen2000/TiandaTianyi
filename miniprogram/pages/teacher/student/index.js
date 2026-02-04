Page({
  data: {
    studentId: '',
    classId: '',
    studentName: '',
    records: [],
    loading: true,
    error: '',
  },
  onLoad(options) {
    this.setData({
      studentId: options.studentId || '',
      classId: options.classId || '',
    })
    this.fetchHistory()
  },
  fetchHistory() {
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getStudentHistory',
        payload: { studentId: this.data.studentId, classId: this.data.classId },
      },
    }).then((res) => {
      this.setData({
        studentName: res.result?.studentName || '',
        records: res.result?.records || [],
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
})
