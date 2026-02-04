Page({
  data: {
    classId: '',
    className: '',
    schedule: [],
    loading: true,
    error: '',
  },
  onLoad(options) {
    this.setData({ classId: options.classId || '' })
    this.fetchSchedule()
  },
  fetchSchedule() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getClassSchedule', payload: { classId: this.data.classId } },
    }).then((res) => {
      const result = res.result || {}
      this.setData({
        className: result.className || '',
        schedule: result.schedule || [],
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
  goLesson(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/teacher/lesson/index?lessonId=${id}&classId=${this.data.classId}` })
  },
})
