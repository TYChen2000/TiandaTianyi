Page({
  data: {
    loading: true,
    error: '',
    records: [],
  },
  onLoad() {
    this.fetchHistory()
  },
  fetchHistory() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getParentHistory' },
    }).then((res) => {
      this.setData({
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
