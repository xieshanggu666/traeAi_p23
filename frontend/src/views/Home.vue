<template>
  <div class="home-page page-container">
    <van-nav-bar title="社区互助">
      <template #right>
        <van-icon name="plus" size="20" @click="goPublish" />
      </template>
    </van-nav-bar>

    <div class="banner">
      <div class="banner-content">
        <h2>邻里互助，温暖相伴</h2>
        <p>发布需求，互帮互助</p>
      </div>
    </div>

    <div class="filter-section" :class="{ 'is-sticky': isFilterSticky }" ref="filterRef">
      <van-dropdown-menu active-color="#667eea">
        <van-dropdown-item v-model="filterStatus" :options="statusOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filterType" :options="typeOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filterTime" :options="timeOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

    <div class="list-section">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          :finished-text="needList.length > 0 ? '没有更多了' : ''"
          @load="onLoad"
        >
          <div
            v-for="item in needList"
            :key="item.id"
            class="need-card"
            @click="goDetail(item.id)"
          >
            <div class="need-header">
              <span class="need-type">{{ getTypeText(item.type) }}</span>
              <van-tag :type="getStatusType(item.status)" size="small">
                {{ getStatusText(item.status) }}
              </van-tag>
            </div>
            <h3 class="need-title">{{ item.title }}</h3>
            <p class="need-desc">{{ item.description || '暂无描述' }}</p>
            <div v-if="item.pickup_code" class="pickup-code-info">
              <van-icon name="lock" size="12" />
              <span>取件码：{{ item.pickup_code }}</span>
            </div>
            <div class="need-info">
              <div class="info-item address-item">
                <van-icon name="location-o" />
                <span class="address-text">{{ item.address }}</span>
              </div>
              <div class="info-item">
                <van-icon name="gold-coin-o" />
                <span class="reward">¥{{ item.reward }}</span>
              </div>
            </div>
            <div v-if="item.distanceText" class="distance-info">
              <van-icon name="location" size="12" />
              <span>距您 {{ item.distanceText }}</span>
            </div>
            <div class="need-footer">
              <div class="publisher">
                <van-icon name="user-o" />
                <span>{{ item.publisher_name }}</span>
              </div>
              <span class="time">{{ formatTime(item.created_at) }}</span>
            </div>
          </div>
          <div v-if="needList.length === 0 && !loading" class="empty-wrap">
            <van-empty description="暂无需求" />
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <van-fab
      icon="plus"
      type="primary"
      @click="goPublish"
      class="fab-btn"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getNeedList } from '@/api/need'
import { getCachedLocation, calculateDistance, formatDistance } from '@/utils/location'

const router = useRouter()
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = ref(10)
const needList = ref([])
const filterStatus = ref('')
const filterType = ref('')
const filterTime = ref('')
const filterRef = ref(null)
const isFilterSticky = ref(false)

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待接单', value: 0 },
  { text: '进行中', value: 1 },
  { text: '已完成', value: 2 },
  { text: '已取消', value: 3 }
]

const typeOptions = [
  { text: '全部类型', value: '' },
  { text: '快递代取', value: 'express' }
]

const timeOptions = [
  { text: '全部时间', value: '' },
  { text: '最近1小时', value: '1h' },
  { text: '最近24小时', value: '24h' },
  { text: '最近7天', value: '7d' },
  { text: '最近30天', value: '30d' }
]

const getTimeRange = (timeFilter) => {
  if (!timeFilter) return {}
  const now = new Date()
  let startTime
  switch (timeFilter) {
    case '1h':
      startTime = new Date(now.getTime() - 3600000)
      break
    case '24h':
      startTime = new Date(now.getTime() - 86400000)
      break
    case '7d':
      startTime = new Date(now.getTime() - 7 * 86400000)
      break
    case '30d':
      startTime = new Date(now.getTime() - 30 * 86400000)
      break
    default:
      return {}
  }
  return { startTime: startTime.toISOString().slice(0, 19).replace('T', ' ') }
}

const typeMap = {
  express: '快递代取'
}

const getTypeText = (type) => {
  return typeMap[type] || '其他'
}

const getStatusType = (status) => {
  const types = ['warning', 'primary', 'success', 'danger']
  return types[status] || 'default'
}

const getStatusText = (status) => {
  const texts = ['待接单', '进行中', '已完成', '已取消']
  return texts[status] || '未知'
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return time.slice(0, 10)
}

const addDistanceToItems = (items) => {
  const userLocation = getCachedLocation()
  if (!userLocation) return items

  return items.map(item => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      item.latitude,
      item.longitude
    )
    return {
      ...item,
      distanceText: formatDistance(distance)
    }
  })
}

const fetchNeedList = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1
    finished.value = false
    needList.value = []
  }

  loading.value = true
  try {
    const timeRange = getTimeRange(filterTime.value)
    const res = await getNeedList({
      page: page.value,
      pageSize: pageSize.value,
      status: filterStatus.value !== '' ? filterStatus.value : undefined,
      type: filterType.value || undefined,
      ...timeRange
    })
    const list = addDistanceToItems(res.data.list)
    needList.value = isRefresh ? list : [...needList.value, ...list]
    if (needList.value.length >= res.data.total) finished.value = true
    if (!finished.value) page.value++
  } catch (err) {
    console.error(err)
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onFilterChange = () => {
  page.value = 1
  finished.value = false
  fetchNeedList(true)
}

const onLoad = () => {
  fetchNeedList()
}

const onRefresh = () => {
  fetchNeedList(true)
}

const goPublish = () => {
  router.push('/publish')
}

const goDetail = (id) => {
  router.push(`/need-detail/${id}`)
}

let stickyObserver = null

const setupStickyObserver = () => {
  if (!filterRef.value) return
  stickyObserver = new IntersectionObserver(
    ([entry]) => {
      isFilterSticky.value = !entry.isIntersecting
    },
    {
      rootMargin: '-47px 0px 0px 0px',
      threshold: 0
    }
  )
  stickyObserver.observe(filterRef.value)
}

onMounted(() => {
  fetchNeedList()
  setupStickyObserver()
})

onBeforeUnmount(() => {
  if (stickyObserver) {
    stickyObserver.disconnect()
  }
})
</script>

<style scoped>
.home-page {
  background-color: #f5f5f5;
}

.banner {
  margin: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.banner-content {
  padding: 20px;
  color: #fff;
}

.banner-content h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.banner-content p {
  font-size: 14px;
  opacity: 0.9;
}

.filter-section {
  position: sticky;
  top: 46px;
  z-index: 100;
  margin: 0 12px;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, border-radius 0.3s ease;
}

.filter-section.is-sticky {
  margin: 0;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-section :deep(.van-dropdown-menu) {
  border-radius: 8px;
  transition: border-radius 0.3s ease;
}

.filter-section.is-sticky :deep(.van-dropdown-menu) {
  border-radius: 0;
}

.list-section {
  padding: 0 12px 12px;
}

.van-pull-refresh {
  min-height: 300px;
}

.pickup-code-info {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #ff9800;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: #fff9e6;
  border-radius: 4px;
}

.pickup-code-info .van-icon {
  margin-right: 4px;
}

.need-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.need-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.need-type {
  background: #f0f2ff;
  color: #667eea;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.need-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.need-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.need-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
}

.info-item .van-icon {
  margin-right: 4px;
}

.address-item {
  flex: 1;
  margin-right: 12px;
}

.address-text {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.distance-info {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #667eea;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.distance-info .van-icon {
  margin-right: 4px;
}

.reward {
  color: #ff6034;
  font-weight: 600;
  flex-shrink: 0;
}

.need-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #999;
}

.publisher {
  display: flex;
  align-items: center;
}

.publisher .van-icon {
  margin-right: 4px;
}

.loading-wrap,
.empty-wrap {
  padding: 40px 0;
  text-align: center;
}

.fab-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
