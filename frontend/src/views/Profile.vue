<template>
  <div class="profile-page page-container">
    <van-nav-bar title="个人中心" />

    <div class="user-card">
      <div class="user-avatar-wrapper" @click="previewAvatar">
        <img v-if="userStore.userInfo?.avatar" :src="userStore.userInfo.avatar" class="user-avatar-img" />
        <van-icon v-else name="user-o" size="40" color="#fff" />
      </div>
      <div class="user-info">
        <h2 class="user-name">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</h2>
        <p class="user-account">账号：{{ userStore.userInfo?.username }}</p>
      </div>
    </div>

    <div class="stats-card">
      <div class="stat-item" @click="$router.push('/my-needs')">
        <div class="stat-num">{{ userStats.published_count || 0 }}</div>
        <div class="stat-label">我发布的</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item" @click="$router.push('/my-accepted')">
        <div class="stat-num">{{ userStats.accepted_count || 0 }}</div>
        <div class="stat-label">我接取的</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-num">{{ userStats.completed_count || 0 }}</div>
        <div class="stat-label">已完成</div>
      </div>
    </div>

    <van-cell-group inset class="menu-group">
      <van-cell title="我发布的需求" is-link @click="$router.push('/my-needs')">
        <template #icon>
          <van-icon name="edit" size="18" color="#667eea" />
        </template>
      </van-cell>
      <van-cell title="我接取的需求" is-link @click="$router.push('/my-accepted')">
        <template #icon>
          <van-icon name="orders-o" size="18" color="#667eea" />
        </template>
      </van-cell>
      <van-cell title="修改资料" is-link @click="openEdit">
        <template #icon>
          <van-icon name="user-circle-o" size="18" color="#667eea" />
        </template>
      </van-cell>
    </van-cell-group>

    <div class="logout-btn">
      <van-button block type="danger" size="large" @click="handleLogout">
        退出登录
      </van-button>
    </div>

    <van-popup v-model:show="showEdit" round position="bottom" :style="{ height: 'auto', minHeight: '50%', maxHeight: '80%' }">
      <div class="edit-popup">
        <div class="popup-header">
          <h3>修改资料</h3>
          <van-icon name="cross" size="24" @click="showEdit = false" />
        </div>
        <van-form @submit="onEditSubmit" class="edit-form">
          <div class="avatar-section">
            <div class="avatar-edit" @click="chooseAvatar">
              <img v-if="editForm.avatar" :src="editForm.avatar" class="avatar-preview" />
              <van-icon v-else name="user-o" size="48" color="#ccc" />
              <div class="avatar-edit-mask">
                <van-icon name="photograph" size="20" color="#fff" />
                <span>更换头像</span>
              </div>
            </div>
            <p class="avatar-tip">点击头像可更换</p>
          </div>
          <van-cell-group inset class="form-group">
            <van-field
              v-model="editForm.nickname"
              label="昵称"
              placeholder="请输入昵称"
              :rules="[{ required: true, message: '请输入昵称' }]"
            />
            <van-field
              v-model="editForm.phone"
              label="手机号"
              placeholder="请输入手机号"
              :rules="[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' }
              ]"
            />
          </van-cell-group>
          <div class="popup-footer">
            <van-button block type="primary" native-type="submit" :loading="editLoading">
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast, showImagePreview } from 'vant'
import { useUserStore } from '@/store/user'
import { updateProfile, getProfile, uploadFile } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()
const showEdit = ref(false)
const editLoading = ref(false)
const fileInput = ref(null)
const userStats = ref({
  published_count: 0,
  accepted_count: 0,
  completed_count: 0
})

const editForm = reactive({
  nickname: '',
  phone: '',
  avatar: ''
})

const fetchUserInfo = async () => {
  try {
    const res = await getProfile()
    userStats.value = {
      published_count: res.data.published_count || 0,
      accepted_count: res.data.accepted_count || 0,
      completed_count: res.data.completed_count || 0
    }
    editForm.nickname = res.data.nickname || ''
    editForm.phone = res.data.phone || ''
    editForm.avatar = res.data.avatar || ''
  } catch (err) {
    console.error(err)
  }
}

const openEdit = () => {
  editForm.nickname = userStore.userInfo?.nickname || ''
  editForm.phone = userStore.userInfo?.phone || ''
  editForm.avatar = userStore.userInfo?.avatar || ''
  showEdit.value = true
}

const previewAvatar = () => {
  const avatar = userStore.userInfo?.avatar
  if (avatar) {
    showImagePreview({
      images: [avatar],
      closeable: true
    })
  }
}

const chooseAvatar = () => {
  fileInput.value?.click()
}

const onFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片不能超过5MB')
    return
  }
  try {
    const res = await uploadFile(file)
    editForm.avatar = res.data.url
  } catch (err) {
    showToast('头像上传失败')
    console.error(err)
  }
  e.target.value = ''
}

const onEditSubmit = async () => {
  try {
    editLoading.value = true
    await updateProfile({
      nickname: editForm.nickname,
      phone: editForm.phone,
      avatar: editForm.avatar
    })
    await userStore.fetchProfile()
    showToast('修改成功')
    showEdit.value = false
  } catch (err) {
    console.error(err)
  } finally {
    editLoading.value = false
  }
}

const handleLogout = () => {
  showDialog({
    title: '提示',
    message: '确定要退出登录吗？',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    userStore.logout()
    router.replace('/login')
  }).catch(() => {})
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.profile-page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.user-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  display: flex;
  align-items: center;
  color: #fff;
}

.user-avatar-wrapper {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}

.user-account {
  font-size: 13px;
  opacity: 0.9;
}

.stats-card {
  background: #fff;
  margin: -20px 12px 12px;
  border-radius: 16px;
  padding: 16px 8px;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.stat-item {
  text-align: center;
  flex: 1;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 12px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-item:active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: scale(0.98);
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 50px;
  background: linear-gradient(180deg, transparent 0%, #e8e8e8 50%, transparent 100%);
  align-self: center;
}

.menu-group {
  margin-top: 12px;
}

.logout-btn {
  padding: 20px 16px;
}

.edit-popup {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.popup-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.edit-form {
  flex: 1;
  overflow-y: auto;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px 16px;
}

.avatar-edit {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  gap: 2px;
}

.avatar-edit-mask span {
  font-size: 10px;
  color: #fff;
}

.avatar-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  margin-bottom: 0;
}

.form-group {
  margin-top: 8px;
}

.popup-footer {
  padding: 20px 16px;
  flex-shrink: 0;
}

.popup-footer .van-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>
