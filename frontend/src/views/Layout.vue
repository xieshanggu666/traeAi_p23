<template>
  <div class="layout">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
    <van-tabbar v-model="active" route active-color="#667eea">
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/message" icon="comment-o" :badge="messageStore.unreadCount > 0 ? messageStore.unreadCount : ''">消息</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useMessageStore } from '@/store/message'

const messageStore = useMessageStore()
const active = ref(0)

onMounted(() => {
  messageStore.fetchUnreadCount()
})

onActivated(() => {
  messageStore.fetchUnreadCount()
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  padding-bottom: 50px;
}
</style>
