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
    potPricesByPerson: [12, 12],
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
    this.longPressDelayTimer = null
    this.continuousAddTimer = null
    this.pressingPlateType = ''
    this.ignoreTapBefore = 0
    this.continuousAddStep = 0

    this.syncPotPricesWithDiners(this.getValidDiners(), () => {
      this.calculateAll()
    })
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

  // 获取有效默认锅底单价（空值或非法时回退12）
  getValidDefaultPotPrice() {
    const value = this.data.potPrice
    if (value === '' || value === null || value === undefined || isNaN(value) || Number(value) < 0) {
      return 12
    }
    return Number(value)
  },

  // 根据人数同步每人锅底价数组长度
  syncPotPricesWithDiners(diners, callback) {
    const target = Math.max(1, parseInt(diners) || 1)
    const defaultPotPrice = this.getValidDefaultPotPrice()
    let potPricesByPerson = [...this.data.potPricesByPerson]

    if (potPricesByPerson.length < target) {
      while (potPricesByPerson.length < target) {
        potPricesByPerson.push(defaultPotPrice)
      }
    } else if (potPricesByPerson.length > target) {
      potPricesByPerson = potPricesByPerson.slice(0, target)
    }

    this.setData({ potPricesByPerson }, () => {
      if (callback) callback()
    })
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
    const defaultPotPrice = this.getValidDefaultPotPrice()
    
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

    const potTotal = Array.from({ length: validDiners }, (_, index) => {
      const value = this.data.potPricesByPerson[index]
      if (value === '' || value === null || value === undefined || isNaN(value) || Number(value) < 0) {
        return defaultPotPrice
      }
      return Number(value)
    }).reduce((sum, p) => sum + p, 0)
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
      this.syncPotPricesWithDiners(diners, () => {
        this.calculateAll()
        this.triggerDinerBump()
      })
    })
  },

  // 输入用餐人数
  handleDinerInput(e) {
    const value = e.detail.value
    
    if (value === '' || value === null || value === undefined) {
      this.setData({ diners: '' }, () => {
        this.syncPotPricesWithDiners(1, () => {
          this.calculateAll()
        })
      })
      return
    }
    
    let v = parseInt(value)
    if (isNaN(v) || v < 1) v = 1
    this.setData({ diners: v }, () => {
      this.syncPotPricesWithDiners(v, () => {
        this.calculateAll()
      })
    })
  },

  // 用餐人数失焦时补1
  handleDinerBlur(e) {
    const value = this.data.diners
    
    if (value === '' || value === null || value === undefined || isNaN(value) || value < 1) {
      this.setData({ diners: 1 }, () => {
        this.syncPotPricesWithDiners(1, () => {
          this.calculateAll()
        })
      })
    }
  },

  // 输入默认锅底单价
  handlePotPriceInput(e) {
    const value = e.detail.value
    if (value === '' || value === null || value === undefined) {
      this.setData({ potPrice: '' }, () => {
        this.calculateAll()
      })
      return
    }

    let v = parseFloat(value)
    if (isNaN(v) || v < 0) v = 0
    this.setData({ potPrice: v }, () => {
      this.calculateAll()
    })
  },

  // 默认锅底单价失焦时回填12
  handlePotPriceBlur() {
    const value = this.data.potPrice
    if (value === '' || value === null || value === undefined || isNaN(value) || Number(value) < 0) {
      this.setData({ potPrice: 12 }, () => {
        this.calculateAll()
      })
    }
  },

  // 输入每人锅底单价
  handlePotPersonInput(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const value = e.detail.value
    const potPricesByPerson = [...this.data.potPricesByPerson]

    if (value === '' || value === null || value === undefined) {
      potPricesByPerson[index] = ''
      this.setData({ potPricesByPerson }, () => {
        this.calculateAll()
      })
      return
    }

    let v = parseFloat(value)
    if (isNaN(v) || v < 0) v = 0
    potPricesByPerson[index] = v

    this.setData({ potPricesByPerson }, () => {
      this.calculateAll()
    })
  },

  // 每人锅底失焦时按默认单价补齐
  handlePotPersonBlur(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const defaultPotPrice = this.getValidDefaultPotPrice()
    const potPricesByPerson = [...this.data.potPricesByPerson]
    const value = potPricesByPerson[index]

    if (value === '' || value === null || value === undefined || isNaN(value) || Number(value) < 0) {
      potPricesByPerson[index] = defaultPotPrice
      this.setData({ potPricesByPerson }, () => {
        this.calculateAll()
      })
    }
  },

  // 一键按默认锅底价应用到所有人
  applyDefaultPotPriceToAll() {
    const diners = this.getValidDiners()
    const defaultPotPrice = this.getValidDefaultPotPrice()
    const potPricesByPerson = Array.from({ length: diners }, () => defaultPotPrice)

    this.setData({ potPricesByPerson }, () => {
      this.calculateAll()
    })
  },

  // 单次增加某一种盘子数量
  incrementPlate(type, withBump = true, withEmoji = true) {
    let counts = { ...this.data.counts }
    const currentValue = this.getValidCount(type)
    counts[type] = currentValue + 1

    this.setData({ counts }, () => {
      this.calculateAll()
      if (withBump) {
        this.triggerBump(type)
      }
      if (withEmoji) {
        this.getPlusButtonPosition(type, (pos) => {
          this.emojiBurst(type, pos.x, pos.y)
        })
      }
    })
  },

  // 开始按压盘子卡片：短按单加，长按连加
  startPlatePress(e) {
    if (e && e.target && e.target.dataset && String(e.target.dataset.stophold) === '1') {
      return
    }

    const type = e.currentTarget.dataset.type
    this.stopContinuousAdd()
    this.pressingPlateType = type

    this.longPressDelayTimer = setTimeout(() => {
      if (this.pressingPlateType !== type) return
      this.ignoreTapBefore = Date.now() + 260
      this.startContinuousAdd(type)
    }, 300)
  },

  // 结束按压盘子卡片
  endPlatePress() {
    this.pressingPlateType = ''
    this.stopContinuousAdd()
  },

  // 开启匀速连加
  startContinuousAdd(type) {
    this.stopContinuousAdd()
    this.continuousAddStep = 0
    this.incrementPlate(type, false, true)
    this.continuousAddTimer = setInterval(() => {
      this.continuousAddStep += 1
      const shouldEmoji = this.continuousAddStep % 3 === 0
      this.incrementPlate(type, false, shouldEmoji)
    }, 140)
  },

  // 停止连加相关定时器
  stopContinuousAdd() {
    if (this.longPressDelayTimer) {
      clearTimeout(this.longPressDelayTimer)
      this.longPressDelayTimer = null
    }
    if (this.continuousAddTimer) {
      clearInterval(this.continuousAddTimer)
      this.continuousAddTimer = null
    }
  },

  // 点击整个卡片区域添加一个盘子 + Emoji
  addOnePlate(e) {
    if (Date.now() < this.ignoreTapBefore) return

    const type = e.currentTarget.dataset.type
    this.incrementPlate(type, true, true)
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
      potPrice: 12,
      potPricesByPerson: [12, 12],
      discountIndex: 1,
      emojiBatches: [],
      batchIdCounter: 0
    }, () => {
      this.calculateAll()
    })
  },

  // 页面卸载时清理
  onUnload() {
    this.stopContinuousAdd()
    this.setData({ emojiBatches: [] })
  }
})
