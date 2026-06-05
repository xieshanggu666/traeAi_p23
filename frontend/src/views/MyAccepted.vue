<template>
  <div class="my-accepted-page page-container">
    <van-nav-bar title="我接取的" left-text="返回" left-arrow @click-left="onClickLeft" />

    <div v-if="loading" class="loading-wrap">
      <van-loading />
    </div>
    <template v-else>
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
            发布者：{{ item.publisher_name }}
          </div>
          <span class="time">{{ formatTime(item.created_at) }}</span>
        </div>
      </div>
      <div v-if="needList.length === 0" class="empty-wrap">
        <van-empty description="暂无接取的需求" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyAccepted } from '@/api/need'
import { getCachedLocation, calculateDistance, formatDistance } from '@/utils/location'

const router = useRouter()
const loading = ref(true)
const needList = ref([])

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

const getStatusType = (status) => {
  const types = ['warning', 'primary', 'success', 'danger']
  return types[status] || 'default'
}

const getStatusText = (status) => {
  const texts = ['待接单', '进行中', '已完成', '已取消']
  return texts[status] || '未知'
}

const typeMap = {
  express: '快递代取'
}

const getTypeText = (type) => {
  return typeMap[type] || '其他'
}

const formatTime = (time) => {
  if (!time) return ''
  return time.slice(0, 16).replace('T', ' ')
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getMyAccepted()
    needList.value = addDistanceToItems(res.data)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const goDetail = (id) => {
  router.push(`/need-detail/${id}`)
}

const onClickLeft = () => {
  router.back()
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.my-accepted-page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.need-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin: 12px;
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

.need-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
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

.loading-wrap,
.empty-wrap {
  padding: 60px 0;
  text-align: center;
}
</style>
