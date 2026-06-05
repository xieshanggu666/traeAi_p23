<template>
  <div class="publish-page">
    <van-nav-bar title="发布需求" left-text="返回" left-arrow @click-left="onClickLeft" />

    <div class="form-wrap">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.title"
            name="title"
            label="标题"
            placeholder="请输入需求标题"
            :rules="[{ required: true, message: '请填写需求标题' }]"
          />
          <van-field
            v-model="form.description"
            name="description"
            label="描述"
            type="textarea"
            placeholder="请详细描述您的需求"
            rows="4"
          />
          <van-field
            v-model="form.address"
            name="address"
            label="地址"
            placeholder="请点击选择取件地址"
            readonly
            is-link
            @click="goMapPicker"
            :rules="[{ required: true, message: '请选择取件地址' }]"
          />
          <van-field
            v-model="form.reward"
            name="reward"
            label="酬金"
            type="digit"
            placeholder="请输入酬金金额"
          />
        </van-cell-group>

        <div class="tips">
          <h4>温馨提示：</h4>
          <ul>
            <li>请准确填写取件地址和快递信息</li>
            <li>酬金是给帮您代领的小伙伴的感谢费哦</li>
            <li>请保持电话畅通，方便接单者联系</li>
          </ul>
        </div>

        <div class="submit-btn">
          <van-button block type="primary" size="large" native-type="submit" :loading="loading">
            发布需求
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/store/user'
import { publishNeed } from '@/api/need'
import { verifyPhone } from '@/utils/verify'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  title: '',
  description: '',
  address: '',
  latitude: null,
  longitude: null,
  reward: '',
  type: 'express'
})

onMounted(async () => {
  const savedForm = sessionStorage.getItem('publishForm')
  if (savedForm) {
    try {
      const parsed = JSON.parse(savedForm)
      Object.assign(form, parsed)
    } catch (e) {}
    sessionStorage.removeItem('publishForm')
  }

  if (route.query.address) {
    form.address = route.query.address
    form.latitude = route.query.latitude
    form.longitude = route.query.longitude
  }

  if (!userStore.userInfo?.phone) {
    try {
      await userStore.fetchProfile()
    } catch (e) {}
  }
})

const onClickLeft = () => {
  router.back()
}

const goMapPicker = () => {
  sessionStorage.setItem('publishForm', JSON.stringify({
    title: form.title,
    description: form.description,
    reward: form.reward,
    type: form.type
  }))
  router.push('/map-picker')
}

const onSubmit = async (values) => {
  const hasPhone = await verifyPhone(userStore.userInfo, router)
  if (!hasPhone) {
    return
  }

  try {
    loading.value = true
    await publishNeed({
      ...values,
      latitude: form.latitude,
      longitude: form.longitude
    })
    sessionStorage.removeItem('publishForm')
    showToast('发布成功')
    setTimeout(() => {
      router.replace('/home')
    }, 1000)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.form-wrap {
  padding-top: 12px;
}

.tips {
  margin: 16px;
  padding: 16px;
  background: #fff9e6;
  border-radius: 8px;
}

.tips h4 {
  font-size: 14px;
  color: #ff9800;
  margin-bottom: 8px;
}

.tips ul {
  padding-left: 20px;
  font-size: 12px;
  color: #999;
  line-height: 1.8;
}

.submit-btn {
  padding: 20px 16px;
}

.submit-btn .van-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>
