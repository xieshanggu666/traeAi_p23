import axios from 'axios'
import { showToast } from 'vant'
import router from '@/router'

let isRefreshing = false

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 200) {
      return res
    } else if (res.code === 401) {
      if (!isRefreshing) {
        isRefreshing = true
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        showToast('登录已过期，请重新登录')
        if (router.currentRoute.value.path !== '/login') {
          router.replace('/login')
        }
        setTimeout(() => {
          isRefreshing = false
        }, 1000)
      }
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      showToast(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
  },
  (error) => {
    if (error.response?.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        showToast('登录已过期，请重新登录')
        if (router.currentRoute.value.path !== '/login') {
          router.replace('/login')
        }
        setTimeout(() => {
          isRefreshing = false
        }, 1000)
      }
    } else {
      showToast(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default request
