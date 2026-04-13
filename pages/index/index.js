Page({
  data: {
    // 基础价格
    prices: {
      iron: 22,
      red: 15,
      yellow: 10,
      green: 5
    },
    // 颜色配置
    colors: {
      iron: '#7878a0',
      red: '#c94040',
      yellow: '#b07a20',
      green: '#2a8a50'
    },
    // 盘子数量（可以是数字或空字符串）
    counts: {
      iron: 0,
      red: 0,
      yellow: 0,
      green: 0
    },
    // 用于显示的盘子数量（空值显示为0）
    displayCounts: {
      iron: 0,
      red: 0,
      yellow: 0,
      green: 0
    },
    // 用餐人数（可以是数字或空字符串）
    diners: 2,
    // 用于显示的人数（空值显示为1）
    displayDiners: 2,
    // 折扣选项
    discountArray: ['无折扣', '6.8 折', '5.8 折'],
    discountValues: [1, 0.68, 0.58],
    discountIndex: 1,
    // 固定费用
    potPrice: 12,
    saucePrice: 4,
    // 计算结果
    discountedPrices: {
      iron: '15.00',
      red: '10.20',
      yellow: '6.80',
      green: '3.40'
    },
    subtotals: {
      iron: '0',
      red: '0',
      yellow: '0',
      green: '0'
    },
    potTotal: '24',
    sauceTotal: '8',
    grandTotal: '32',
    perPerson: '16',
    totalPlates: 0,
    hasDiscount: true,
    discountLabel: '6.8折',
    summaryDiscountLabel: '6.8折优惠',
    // 动画状态
    dinerBumping: false,
    bumping: {
      iron: false,
      red: false,
      yellow: false,
      green: false
    },
    // Emoji 配置
    plateEmojis: {
      iron: ['🐟', '🦐', '🦀', '🦑', '🦞'],
      red: ['🥩', '🥓', '🍖', '🍥'],
      yellow: ['🍄‍🟫', '🍲', '🦪', '🍤'],
      green: ['🥬', '🥔', '🌽', '🥦']
    },
    // Emoji 批次数组，支持多个同时显示
    emojiBatches: [],
    batchIdCounter: 0
  },

  onLoad() {
    this.calculateAll()
  },

  // 获取有效数量（空字符串转为0）
  getValidCount(type) {
    const value = this.data.counts[type]
    if (value === '' || value === null || value === undefined || isNaN(value)) {
      return 0
    }
    return parseInt(value) || 0
  },

  // 获取有效人数（空字符串转为1）
  getValidDiners() {
    const value = this.data.diners
    if (value === '' || value === null || value === undefined || isNaN(value) || value < 1) {
      return 1
    }
    return parseInt(value) || 1
  },

  // 更新显示用的数量
  updateDisplayCounts() {
    const displayCounts = {}
    Object.keys(this.data.counts).forEach(type => {
      displayCounts[type] = this.getValidCount(type)
    })
    this.setData({ displayCounts })
  },

  // 触发动画的辅助函数
  triggerDinerBump() {
    this.setData({ dinerBumping: true })
    setTimeout(() => {
      this.setData({ dinerBumping: false })
    }, 220)
  },

  triggerBump(type) {
    const bumping = { ...this.data.bumping }
    bumping[type] = true
    this.setData({ bumping })
    setTimeout(() => {
      bumping[type] = false
      this.setData({ bumping })
    }, 220)
  },

  // 获取加号按钮位置
  getPlusButtonPosition(type, callback) {
    const query = wx.createSelectorQuery()
    query.select(`#btn-plus-${type}`).boundingClientRect()
    query.exec((res) => {
      if (res && res[0]) {
        const rect = res[0]
        callback({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        })
      } else {
        const sysInfo = wx.getSystemInfoSync()
        callback({
          x: sysInfo.windowWidth / 2,
          y: sysInfo.windowHeight / 3
        })
      }
    })
  },

  // 触发 Emoji 爆炸效果（支持快速点击叠加）
  emojiBurst(type, x, y) {
    const emojis = this.data.plateEmojis[type] || this.data.plateEmojis.iron
    const count = 3 + Math.floor(Math.random() * 3)
    const batchId = this.data.batchIdCounter + 1
    
    const emojiItems = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 260 - 130) * (Math.PI / 180)
      const dist = 100 + Math.random() * 120
      const dist30 = dist * 0.45
      
      emojiItems.push({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: x,
        y: y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        tx30: Math.cos(angle) * dist30,
        ty30: Math.sin(angle) * dist30 - 15,
        rot: (Math.random() - 0.5) * 180,
        rot30: (Math.random() - 0.5) * 60,
        dur: 0.9 + Math.random() * 0.3,
        delay: i * 0.06
      })
    }

    const newBatch = {
      batchId: batchId,
      emojis: emojiItems
    }
    
    const emojiBatches = [...this.data.emojiBatches, newBatch]
    
    this.setData({ 
      emojiBatches: emojiBatches,
      batchIdCounter: batchId
    })

    const maxDur = 1.2 + count * 0.06 + 0.1
    setTimeout(() => {
      this.removeEmojiBatch(batchId)
    }, maxDur * 1000)
  },

  // 清理特定批次
  removeEmojiBatch(batchId) {
    const emojiBatches = this.data.emojiBatches.filter(batch => batch.batchId !== batchId)
    this.setData({ emojiBatches })
  },

  // 计算所有数据
  calculateAll() {
    this.updateDisplayCounts()
    
    const validDiners = this.getValidDiners()
    this.setData({ displayDiners: validDiners })
    
    const { prices, discountValues, discountIndex } = this.data
    const discount = discountValues[discountIndex]
    
    const discountedPrices = {}
    const subtotals = {}
    let platesTotal = 0
    let totalPlates = 0

    Object.keys(prices).forEach(type => {
      const count = this.getValidCount(type)
      const dp = Math.round(prices[type] * discount * 100) / 100
      discountedPrices[type] = this.formatPrice(dp)
      const sub = Math.round(count * dp * 100) / 100
      subtotals[type] = this.formatPrice(sub)
      platesTotal += sub
      totalPlates += count
    })

    const potTotal = validDiners * this.data.potPrice
    const sauceTotal = validDiners * this.data.saucePrice

    const grandTotal = Math.round((platesTotal + potTotal + sauceTotal) * 100) / 100
    const perPerson = Math.round(grandTotal / validDiners * 100) / 100

    const hasDiscount = discount < 1
    const discountLabel = hasDiscount 
      ? (discount === 0.68 ? '6.8折' : '5.8折') 
      : ''
    const summaryDiscountLabel = hasDiscount 
      ? (discount === 0.68 ? '6.8折优惠' : '5.8折优惠') 
      : '无折扣'

    this.setData({
      discountedPrices,
      subtotals,
      potTotal: this.formatPrice(potTotal),
      sauceTotal: this.formatPrice(sauceTotal),
      grandTotal: this.formatPrice(grandTotal),
      perPerson: this.formatPrice(perPerson),
      totalPlates,
      hasDiscount,
      discountLabel,
      summaryDiscountLabel
    })
  },

  formatPrice(n) {
    const s = n.toFixed(2)
    return s.endsWith('.00') ? s.slice(0, -3) : s
  },

  // 修改用餐人数（按钮点击）
  changeDiners(e) {
    const delta = parseInt(e.currentTarget.dataset.delta)
    const currentValue = this.getValidDiners()
    let diners = currentValue + delta
    diners = Math.max(1, diners)
    this.setData({ diners }, () => {
      this.calculateAll()
      this.triggerDinerBump()
    })
  },

  // 输入用餐人数
  handleDinerInput(e) {
    const value = e.detail.value
    
    if (value === '' || value === null || value === undefined) {
      this.setData({ diners: '' })
      this.calculateAll()
      return
    }
    
    let v = parseInt(value)
    if (isNaN(v) || v < 1) v = 1
    this.setData({ diners: v }, () => {
      this.calculateAll()
    })
  },

  // 用餐人数失焦时补1
  handleDinerBlur(e) {
    const value = this.data.diners
    
    if (value === '' || value === null || value === undefined || isNaN(value) || value < 1) {
      this.setData({ diners: 1 }, () => {
        this.calculateAll()
      })
    }
  },

  // 点击整个卡片区域添加一个盘子 + Emoji
  addOnePlate(e) {
    const type = e.currentTarget.dataset.type
    let counts = { ...this.data.counts }
    const currentValue = this.getValidCount(type)
    counts[type] = currentValue + 1
    
    this.setData({ counts }, () => {
      this.calculateAll()
      this.triggerBump(type)
      this.getPlusButtonPosition(type, (pos) => {
        this.emojiBurst(type, pos.x, pos.y)
      })
    })
  },

  // 点击加减按钮
  changeCount(e) {
    const { type, delta } = e.currentTarget.dataset
    let counts = { ...this.data.counts }
    const currentValue = this.getValidCount(type)
    const newValue = Math.max(0, currentValue + parseInt(delta))
    counts[type] = newValue
    
    this.setData({ counts }, () => {
      this.calculateAll()
      this.triggerBump(type)
      if (parseInt(delta) > 0 && newValue > currentValue) {
        this.getPlusButtonPosition(type, (pos) => {
          this.emojiBurst(type, pos.x, pos.y)
        })
      }
    })
  },

  // 输入盘子数量
  handleCountInput(e) {
    const type = e.currentTarget.dataset.type
    const value = e.detail.value
    
    let counts = { ...this.data.counts }
    
    if (value === '' || value === null || value === undefined) {
      counts[type] = ''
      this.setData({ counts })
      this.calculateAll()
      return
    }
    
    let v = parseInt(value)
    if (isNaN(v) || v < 0) v = 0
    
    counts[type] = v
    this.setData({ counts }, () => {
      this.calculateAll()
    })
  },

  // 盘子数量失焦时补0
  handleCountBlur(e) {
    const type = e.currentTarget.dataset.type
    let counts = { ...this.data.counts }
    
    if (counts[type] === '' || counts[type] === null || counts[type] === undefined) {
      counts[type] = 0
      this.setData({ counts }, () => {
        this.calculateAll()
      })
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  },

  // 折扣选择变化
  onDiscountChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ 
      discountIndex: index
    }, () => {
      this.calculateAll()
    })
  },

  // 重置所有
  resetAll() {
    this.setData({
      counts: {
        iron: 0,
        red: 0,
        yellow: 0,
        green: 0
      },
      diners: 2,
      discountIndex: 1,
      emojiBatches: [],
      batchIdCounter: 0
    }, () => {
      this.calculateAll()
    })
  },

  // 页面卸载时清理
  onUnload() {
    this.setData({ emojiBatches: [] })
  }
})