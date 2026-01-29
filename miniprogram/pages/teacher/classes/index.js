Page({
  data: {
    classes: [],
    loading: true,
    error: '',
  },
  onLoad() {
    this.fetchClasses()
  },
  fetchClasses() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getTeacherClasses' },
    }).then((res) => {
      this.setData({
        classes: res.result?.classes || [],
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
  goCalendar(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/teacher/calendar/index?classId=${id}` })
  },
})
