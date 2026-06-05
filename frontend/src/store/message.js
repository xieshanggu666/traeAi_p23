import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUnreadCount } from '@/api/message'

export const useMessageStore = defineStore('message', () => {
  const unreadCount = ref(0)

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadCount()
      unreadCount.value = res.data.count
    } catch (err) {
      console.error(err)
    }
  }

  const decrementUnreadCount = (count = 1) => {
    unreadCount.value = Math.max(0, unreadCount.value - count)
  }

  const clearUnreadCount = () => {
    unreadCount.value = 0
  }

  return {
    unreadCount,
    fetchUnreadCount,
    decrementUnreadCount,
    clearUnreadCount
  }
})
