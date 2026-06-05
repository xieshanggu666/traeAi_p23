import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页', requiresAuth: true }
      },
      {
        path: 'message',
        name: 'Message',
        component: () => import('@/views/Message.vue'),
        meta: { title: '消息', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
      }
    ]
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('@/views/Publish.vue'),
    meta: { title: '发布需求', requiresAuth: true }
  },
  {
    path: '/need-detail/:id',
    name: 'NeedDetail',
    component: () => import('@/views/NeedDetail.vue'),
    meta: { title: '需求详情', requiresAuth: true }
  },
  {
    path: '/my-needs',
    name: 'MyNeeds',
    component: () => import('@/views/MyNeeds.vue'),
    meta: { title: '我的需求', requiresAuth: true }
  },
  {
    path: '/my-accepted',
    name: 'MyAccepted',
    component: () => import('@/views/MyAccepted.vue'),
    meta: { title: '我接取的', requiresAuth: true }
  },
  {
    path: '/map-picker',
    name: 'MapPicker',
    component: () => import('@/views/MapPicker.vue'),
    meta: { title: '选择地址', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.title) {
    document.title = to.meta.title
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    if (to.path !== '/login') {
      next('/login')
    } else {
      next()
    }
  } else if ((to.path === '/login' || to.path === '/register') && userStore.isLoggedIn) {
    next('/home')
  } else {
    next()
  }
})

export default router
