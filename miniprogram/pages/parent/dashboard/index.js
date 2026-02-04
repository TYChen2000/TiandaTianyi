Page({
  data: {
    loading: true,
    error: '',
    childName: '',
    className: '',
    classTime: '',
    latestRecord: null,
    rewardTotal: 0,
  },
  onLoad() {
    this.fetchDashboard()
  },
  fetchDashboard() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getParentDashboard' },
    }).then((res) => {
      const result = res.result || {}
      this.setData({
        childName: result.childName || '',
        className: result.className || '',
        classTime: result.classTime || '',
        latestRecord: result.latestRecord || null,
        rewardTotal: result.rewardTotal || 0,
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
  goHistory() {
    wx.navigateTo({ url: '/pages/parent/history/index' })
  },
})
