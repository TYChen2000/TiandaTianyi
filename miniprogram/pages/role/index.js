Page({
  data: {
    loading: true,
    userRole: '',
    userName: '',
  },
  onLoad() {
    this.fetchProfile()
  },
  fetchProfile() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getUserProfile' },
    }).then((res) => {
      const { role, name } = res.result || {}
      this.setData({
        userRole: role || '',
        userName: name || '',
        loading: false,
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },
  goTeacher() {
    wx.navigateTo({ url: '/pages/teacher/classes/index' })
  },
  goParent() {
    wx.navigateTo({ url: '/pages/parent/dashboard/index' })
  },
})
