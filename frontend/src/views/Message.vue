<template>
  <div class="message-page page-container">
    <van-nav-bar title="消息中心">
      <template #right>
        <van-button size="small" type="default" @click="markAllRead">全部已读</van-button>
      </template>
    </van-nav-bar>

    <div v-if="loading" class="loading-wrap">
      <van-loading />
    </div>
    <template v-else>
      <div v-for="item in messageList" :key="item.type + '-' + item.id" class="message-item" @click="handleItemClick(item)">
        <div class="message-icon" :class="{ unread: !item.is_read, private: item.type === 'private' }">
          <img v-if="item.type === 'private' && item.sender_avatar" :src="item.sender_avatar" class="sender-avatar" />
          <van-icon v-else :name="item.type === 'private' ? 'chat-o' : (item.type === 'system' ? 'info-o' : 'bell-o')" size="24" />
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-title">{{ item.type === 'private' ? item.sender_name : item.title }}</span>
            <span class="message-time">{{ formatTime(item.created_at) }}</span>
          </div>
          <p class="message-desc">{{ item.content }}</p>
        </div>
        <div v-if="!item.is_read" class="unread-dot"></div>
        <div v-if="item.type === 'private' && item.unread_count > 0" class="unread-badge">{{ item.unread_count }}</div>
      </div>
      <div v-if="messageList.length === 0" class="empty-wrap">
        <van-empty description="暂无消息" />
      </div>
    </template>

    <van-popup v-model:show="showChat" position="bottom" round :style="{ height: '75%' }">
      <div class="chat-popup">
        <div class="chat-header">
          <h3>与 {{ chatTargetName }} 的对话</h3>
          <van-icon name="cross" size="24" @click="showChat = false" />
        </div>
        <div class="chat-messages" ref="chatContainer">
          <div v-for="msg in chatHistory" :key="msg.id" class="chat-bubble-wrapper" :class="{ mine: msg.sender_id === currentUserId }">
            <div class="bubble-avatar">
              <img v-if="msg.sender_avatar" :src="msg.sender_avatar" class="bubble-avatar-img" />
              <van-icon v-else name="user-o" size="20" />
            </div>
            <div class="bubble-body">
              <div class="bubble-name">{{ msg.sender_name }}</div>
              <div class="bubble-content">{{ msg.content }}</div>
              <div class="bubble-time">{{ formatTime(msg.created_at) }}</div>
            </div>
          </div>
          <div v-if="chatHistory.length === 0" class="chat-empty">暂无消息记录</div>
        </div>
        <div class="chat-input-bar">
          <van-field
            v-model="chatInput"
            placeholder="输入消息..."
            rows="1"
            autosize
            type="textarea"
            maxlength="200"
            class="chat-input-field"
          />
          <van-button size="small" type="primary" @click="handleSendChat" :loading="chatSending" :disabled="!chatInput.trim()">
            发送
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { showToast } from 'vant'
import { useUserStore } from '@/store/user'
import { useMessageStore } from '@/store/message'
import { getMessageList, markAsRead, markAllAsRead, sendPrivateMessage, getChatHistory, markConversationAsRead } from '@/api/message'

const userStore = useUserStore()
const messageStore = useMessageStore()
const currentUserId = userStore.userInfo?.id

const loading = ref(true)
const messageList = ref([])
const showChat = ref(false)
const chatTargetId = ref(null)
const chatTargetName = ref('')
const chatHistory = ref([])
const chatInput = ref('')
const chatSending = ref(false)
const chatContainer = ref(null)

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

const fetchMessageList = async () => {
  loading.value = true
  try {
    const res = await getMessageList()
    messageList.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleItemClick = async (item) => {
  if (item.type === 'private') {
    await openChat(item)
  } else {
    if (!item.is_read) {
      try {
        await markAsRead(item.id)
        item.is_read = 1
        messageStore.decrementUnreadCount()
      } catch (err) {
        console.error(err)
      }
    }
  }
}

const openChat = async (item) => {
  chatTargetId.value = item.related_id
  chatTargetName.value = item.sender_name || '用户'
  chatInput.value = ''
  showChat.value = true

  try {
    const res = await getChatHistory(item.related_id)
    chatHistory.value = res.data

    if (!item.is_read || item.unread_count > 0) {
      await markConversationAsRead(item.related_id)
      const unreadNum = item.unread_count > 0 ? item.unread_count : 1
      messageStore.decrementUnreadCount(unreadNum)
      item.is_read = 1
      item.unread_count = 0
    }
  } catch (err) {
    console.error(err)
  }

  await nextTick()
  scrollToBottom()
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const handleSendChat = async () => {
  if (!chatInput.value.trim()) return
  try {
    chatSending.value = true
    await sendPrivateMessage({
      receiverId: chatTargetId.value,
      content: chatInput.value.trim()
    })

    chatHistory.value.push({
      id: Date.now(),
      sender_id: currentUserId,
      receiver_id: chatTargetId.value,
      content: chatInput.value.trim(),
      sender_name: userStore.userInfo?.nickname || '我',
      sender_avatar: userStore.userInfo?.avatar || '',
      created_at: new Date().toISOString()
    })

    chatInput.value = ''
    await nextTick()
    scrollToBottom()
  } catch (err) {
    showToast('发送失败')
    console.error(err)
  } finally {
    chatSending.value = false
  }
}

const markAllRead = async () => {
  try {
    await markAllAsRead()
    messageList.value.forEach(item => {
      item.is_read = 1
      item.unread_count = 0
    })
    messageStore.clearUnreadCount()
    showToast('已全部标记为已读')
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchMessageList()
})
</script>

<style scoped>
.message-page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.message-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f0f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #667eea;
  flex-shrink: 0;
  overflow: hidden;
}

.message-icon.unread {
  background: #667eea;
  color: #fff;
}

.message-icon.private {
  background: #e8f5e9;
  color: #07c160;
}

.message-icon.private.unread {
  background: #07c160;
  color: #fff;
}

.sender-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.message-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.message-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.message-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6034;
  flex-shrink: 0;
  margin-left: 8px;
}

.unread-badge {
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #ff6034;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8px;
  padding: 0 5px;
}

.chat-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.chat-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.chat-bubble-wrapper {
  display: flex;
  margin-bottom: 16px;
}

.chat-bubble-wrapper.mine {
  flex-direction: row-reverse;
}

.bubble-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.bubble-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bubble-body {
  max-width: 70%;
  margin: 0 10px;
}

.bubble-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.chat-bubble-wrapper.mine .bubble-name {
  text-align: right;
}

.bubble-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  background: #fff;
  color: #333;
}

.chat-bubble-wrapper.mine .bubble-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.bubble-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.chat-bubble-wrapper.mine .bubble-time {
  text-align: right;
}

.chat-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
}

.chat-input-bar {
  display: flex;
  align-items: flex-end;
  padding: 8px 12px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 8px;
}

.chat-input-field {
  flex: 1;
}

.chat-input-bar .van-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  flex-shrink: 0;
}

.loading-wrap,
.empty-wrap {
  padding: 60px 0;
  text-align: center;
}
</style>
