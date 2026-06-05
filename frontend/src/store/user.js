import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getProfile } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)

  const handleLogin = async (data) => {
    const res = await login(data)
    userInfo.value = res.data
    token.value = res.data.token
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userInfo', JSON.stringify(res.data))
    return res.data
  }

  const handleRegister = async (data) => {
    const res = await register(data)
    userInfo.value = res.data
    token.value = res.data.token
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userInfo', JSON.stringify(res.data))
    return res.data
  }

  const fetchProfile = async () => {
    const res = await getProfile()
    userInfo.value = { ...userInfo.value, ...res.data }
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    return res.data
  }

  const logout = () => {
    userInfo.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    handleLogin,
    handleRegister,
    fetchProfile,
    logout
  }
})
