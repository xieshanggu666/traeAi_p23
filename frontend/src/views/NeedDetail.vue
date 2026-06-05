<template>
  <div class="detail-page">
    <van-nav-bar title="需求详情" left-text="返回" left-arrow @click-left="onClickLeft" />

    <div v-if="loading" class="loading-wrap">
      <van-loading />
    </div>
    <template v-else-if="needDetail">
      <div class="detail-header">
        <div class="status-bar">
          <van-tag :type="getStatusType(needDetail.status)" size="medium">
            {{ getStatusText(needDetail.status) }}
          </van-tag>
          <span class="need-type">{{ needDetail.type === 'express' ? '快递代领' : '其他' }}</span>
        </div>
        <h2 class="detail-title">{{ needDetail.title }}</h2>
        <div class="detail-time">
          发布时间：{{ formatTime(needDetail.created_at) }}
        </div>
      </div>

      <div class="detail-section">
        <h3 class="section-title">需求描述</h3>
        <p class="section-content">{{ needDetail.description || '暂无描述' }}</p>
      </div>

      <div class="detail-section" @click="openAddressNavigation">
        <h3 class="section-title">取件地址</h3>
        <p class="section-content address clickable">
          <van-icon name="location-o" size="16" color="#ff6034" />
          <span class="address-text">{{ needDetail.address }}</span>
          <van-icon name="arrow" size="14" class="nav-arrow" />
        </p>
        <p v-if="needDetail.distanceText" class="distance-text">
          距您 {{ needDetail.distanceText }}
        </p>
      </div>

      <div class="detail-section reward-section">
        <h3 class="section-title">酬金</h3>
        <p class="reward">¥{{ needDetail.reward }}</p>
      </div>

      <div class="detail-section">
        <h3 class="section-title">发布者信息</h3>
        <div class="publisher-info" @click="!isPublisher && openChat(needDetail.user_id, needDetail.publisher_name)" :class="{ 'no-click': isPublisher }">
          <div class="publisher-avatar" :class="{ clickable: !isPublisher }">
            <img v-if="needDetail.publisher_avatar" :src="needDetail.publisher_avatar" class="avatar-img" />
            <van-icon v-else name="user-o" size="24" color="#667eea" />
          </div>
          <div class="publisher-detail">
            <p class="publisher-name">{{ needDetail.publisher_name }}</p>
            <p v-if="needDetail.publisher_phone" class="publisher-phone">
              <van-icon name="phone-o" size="14" />
              {{ canViewPhone ? needDetail.publisher_phone : maskPhone(needDetail.publisher_phone) }}
            </p>
          </div>
          <van-icon v-if="!isPublisher" name="chat-o" size="20" color="#667eea" class="chat-icon" />
        </div>
      </div>

      <div v-if="needDetail.receiver_name" class="detail-section">
        <h3 class="section-title">接取者</h3>
        <div class="publisher-info" @click="!isReceiver && openChat(needDetail.receiver_id, needDetail.receiver_name)" :class="{ 'no-click': isReceiver }">
          <div class="publisher-avatar" :class="{ clickable: !isReceiver }">
            <img v-if="needDetail.receiver_avatar" :src="needDetail.receiver_avatar" class="avatar-img" />
            <van-icon v-else name="user-o" size="24" color="#07c160" />
          </div>
          <div class="publisher-detail">
            <p class="publisher-name">{{ needDetail.receiver_name }}</p>
            <p v-if="needDetail.receiver_phone" class="publisher-phone">
              <van-icon name="phone-o" size="14" />
              {{ canViewPhone ? needDetail.receiver_phone : maskPhone(needDetail.receiver_phone) }}
            </p>
          </div>
          <van-icon v-if="!isReceiver" name="chat-o" size="20" color="#07c160" class="chat-icon" />
        </div>
      </div>

      <div class="action-bar" v-if="showActionBar">
        <template v-if="needDetail.status === 0 && !isPublisher">
          <van-button block type="primary" size="large" @click="handleAccept" :loading="actionLoading">
            立即接取
          </van-button>
        </template>
        <template v-else-if="needDetail.status === 1 && isPublisher">
          <van-button block type="success" size="large" @click="handleComplete" :loading="actionLoading">
            确认完成
          </van-button>
        </template>
        <template v-else-if="needDetail.status === 0 && isPublisher">
          <van-button block type="danger" size="large" @click="handleCancel" :loading="actionLoading">
            取消需求
          </van-button>
        </template>
        <template v-else-if="needDetail.status === 1 && isPublisher">
          <van-button block type="danger" size="large" @click="handleCancel" :loading="actionLoading">
            取消需求
          </van-button>
        </template>
      </div>
    </template>

    <van-popup v-model:show="showChat" round position="bottom" :style="{ minHeight: '30%' }">
      <div class="chat-popup">
        <div class="popup-header">
          <h3>发送私信给 {{ chatTargetName }}</h3>
          <van-icon name="cross" size="24" @click="showChat = false" />
        </div>
        <van-field
          v-model="chatContent"
          rows="4"
          autosize
          type="textarea"
          maxlength="200"
          placeholder="请输入私信内容"
          show-word-limit
        />
        <div class="popup-footer">
          <van-button block type="primary" @click="handleSendMsg" :loading="chatLoading">
            发送
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useUserStore } from '@/store/user'
import { getNeedDetail, acceptNeed, completeNeed, cancelNeed } from '@/api/need'
import { sendPrivateMessage } from '@/api/message'
import { openNavigation, getCachedLocation, calculateDistance, formatDistance } from '@/utils/location'
import { verifyPhone } from '@/utils/verify'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const actionLoading = ref(false)
const needDetail = ref(null)
const showChat = ref(false)
const chatTargetId = ref(null)
const chatTargetName = ref('')
const chatContent = ref('')
const chatLoading = ref(false)

const isPublisher = computed(() => {
  return needDetail.value && userStore.userInfo?.id === needDetail.value.user_id
})

const isReceiver = computed(() => {
  return needDetail.value && userStore.userInfo?.id === needDetail.value.receiver_id
})

const canViewPhone = computed(() => {
  return isPublisher.value || isReceiver.value
})

const showActionBar = computed(() => {
  if (!needDetail.value) return false
  const status = needDetail.value.status
  return status === 0 || status === 1
})

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
  return time.slice(0, 16).replace('T', ' ')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  const str = String(phone)
  if (str.length === 11) {
    return str.slice(0, 3) + '*****' + str.slice(8)
  }
  return str.replace(/(.{3})(.*)(.{3})/, '$1' + '*'.repeat(str.length - 6) + '$3')
}

const addDistanceToDetail = (detail) => {
  const userLocation = getCachedLocation()
  if (!userLocation) return detail

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    detail.latitude,
    detail.longitude
  )
  return {
    ...detail,
    distanceText: formatDistance(distance)
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await getNeedDetail(route.params.id)
    needDetail.value = addDistanceToDetail(res.data)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const openAddressNavigation = () => {
  if (!needDetail.value) return
  openNavigation(
    needDetail.value.latitude,
    needDetail.value.longitude,
    needDetail.value.title,
    needDetail.value.address
  )
}

const handleAccept = async () => {
  if (!userStore.userInfo?.phone) {
    try {
      await userStore.fetchProfile()
    } catch (e) {
      // ignore
    }
  }

  const hasPhone = await verifyPhone(userStore.userInfo, router)
  if (!hasPhone) {
    return
  }

  try {
    actionLoading.value = true
    await acceptNeed(needDetail.value.id)
    showToast('接取成功')
    fetchDetail()
  } catch (err) {
    console.error(err)
  } finally {
    actionLoading.value = false
  }
}

const handleComplete = async () => {
  try {
    await showDialog({
      title: '确认完成',
      message: '确定要将此需求标记为已完成吗？'
    })
    actionLoading.value = true
    await completeNeed(needDetail.value.id)
    showToast('已确认完成')
    fetchDetail()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
    }
  } finally {
    actionLoading.value = false
  }
}

const handleCancel = async () => {
  try {
    await showDialog({
      title: '取消需求',
      message: '确定要取消此需求吗？'
    })
    actionLoading.value = true
    await cancelNeed(needDetail.value.id)
    showToast('已取消')
    fetchDetail()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
    }
  } finally {
    actionLoading.value = false
  }
}

const openChat = (userId, userName) => {
  if (!userId) return
  if (userId === userStore.userInfo?.id) {
    showToast('不能给自己发私信')
    return
  }
  chatTargetId.value = userId
  chatTargetName.value = userName || '用户'
  chatContent.value = ''
  showChat.value = true
}

const handleSendMsg = async () => {
  if (!chatContent.value.trim()) {
    showToast('请输入私信内容')
    return
  }
  try {
    chatLoading.value = true
    await sendPrivateMessage({
      receiverId: chatTargetId.value,
      content: chatContent.value.trim()
    })
    showToast('发送成功')
    showChat.value = false
    chatContent.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    chatLoading.value = false
  }
}

const onClickLeft = () => {
  router.back()
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}

.detail-header {
  background: #fff;
  padding: 16px;
  margin-bottom: 12px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.need-type {
  font-size: 13px;
  color: #999;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.detail-time {
  font-size: 13px;
  color: #999;
}

.detail-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.section-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.address {
  display: flex;
  align-items: center;
}

.address.clickable {
  cursor: pointer;
}

.address .van-icon {
  margin-right: 6px;
  flex-shrink: 0;
}

.address-text {
  flex: 1;
  line-height: 1.5;
}

.nav-arrow {
  margin-left: 8px;
  color: #ccc;
}

.distance-text {
  margin: 8px 0 0;
  padding-left: 22px;
  font-size: 13px;
  color: #667eea;
}

.reward-section {
  text-align: center;
}

.reward {
  font-size: 32px;
  font-weight: 600;
  color: #ff6034;
}

.publisher-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.publisher-info.no-click {
  cursor: default;
}

.publisher-info.no-click:active {
  opacity: 1;
}

.publisher-info:active {
  opacity: 0.8;
}

.publisher-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f0f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.publisher-avatar.clickable {
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.chat-icon {
  margin-left: auto;
  flex-shrink: 0;
}

.publisher-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.publisher-phone {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
}

.publisher-phone .van-icon {
  margin-right: 4px;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.action-bar .van-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.loading-wrap {
  padding: 60px 0;
  text-align: center;
}

.chat-popup {
  padding: 16px;
}

.chat-popup .popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chat-popup .popup-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.chat-popup .popup-footer {
  margin-top: 12px;
}

.chat-popup .popup-footer .van-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>
