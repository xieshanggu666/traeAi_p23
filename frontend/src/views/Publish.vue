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
            v-model="typeName"
            is-link
            readonly
            label="需求类型"
            placeholder="请选择需求类型"
            @click="showTypePicker = true"
            :rules="[{ required: true, message: '请选择需求类型' }]"
          />
          <van-field
            v-model="form.description"
            name="description"
            label="描述"
            type="textarea"
            placeholder="请详细描述您的需求"
            rows="4"
          />

          <template v-if="form.type === 'express'">
            <van-field
              v-model="form.pickup_code"
              name="pickup_code"
              label="取件码"
              placeholder="请输入快递取件码"
              :rules="[{ required: true, message: '请输入取件码' }]"
            />
          </template>

          <template v-if="form.type === 'pet'">
            <van-field
              v-model="form.pet_info"
              name="pet_info"
              label="宠物信息"
              placeholder="请描述宠物种类、名称等"
              :rules="[{ required: true, message: '请填写宠物信息' }]"
            />
            <van-field
              v-model="petSizeName"
              is-link
              readonly
              label="宠物大小"
              placeholder="请选择宠物大小"
              @click="showPetSizePicker = true"
              :rules="[{ required: true, message: '请选择宠物大小' }]"
            />
            <van-field name="pet_gentle" label="是否温顺">
              <template #input>
                <van-switch v-model="form.pet_gentle" size="20" />
              </template>
            </van-field>
          </template>

          <template v-if="form.type === 'errand'">
            <van-field
              v-model="form.item_info"
              name="item_info"
              label="物品信息"
              placeholder="请描述运送物品"
              :rules="[{ required: true, message: '请填写物品信息' }]"
            />
            <van-field
              v-model="itemSizeName"
              is-link
              readonly
              label="物品大小"
              placeholder="请选择物品大小"
              @click="showItemSizePicker = true"
              :rules="[{ required: true, message: '请选择物品大小' }]"
            />
          </template>

          <van-field
            v-model="form.address"
            name="address"
            :label="form.type === 'errand' ? '取货地址' : '地址'"
            :placeholder="form.type === 'errand' ? '请点击选择取货地址' : '请点击选择地址'"
            readonly
            is-link
            @click="goMapPicker('address')"
            :rules="[{ required: true, message: '请选择地址' }]"
          />

          <template v-if="form.type === 'errand'">
            <van-field
              v-model="form.dest_address"
              name="dest_address"
              label="目的地"
              placeholder="请点击选择目的地地址"
              readonly
              is-link
              @click="goMapPicker('dest')"
              :rules="[{ required: true, message: '请选择目的地地址' }]"
            />
          </template>

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
            <li v-if="form.type === 'express'">请准确填写取件地址和快递信息</li>
            <li v-if="form.type === 'express'">取件码仅发布者和接取人可见，其他人看到为星号</li>
            <li v-if="form.type === 'pet'">请准确填写宠物信息，确保喂养人了解宠物情况</li>
            <li v-if="form.type === 'pet'">请标明宠物是否温顺，保障喂养人安全</li>
            <li v-if="form.type === 'errand'">请准确填写取货地址和目的地地址</li>
            <li v-if="form.type === 'errand'">请如实描述物品大小，方便接单人评估</li>
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

    <van-popup v-model:show="showTypePicker" round position="bottom">
      <van-picker
        :columns="typeColumns"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showPetSizePicker" round position="bottom">
      <van-picker
        :columns="petSizeColumns"
        @confirm="onPetSizeConfirm"
        @cancel="showPetSizePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showItemSizePicker" round position="bottom">
      <van-picker
        :columns="itemSizeColumns"
        @confirm="onItemSizeConfirm"
        @cancel="showItemSizePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/store/user'
import { publishNeed } from '@/api/need'
import { verifyPhone } from '@/utils/verify'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const showTypePicker = ref(false)
const showPetSizePicker = ref(false)
const showItemSizePicker = ref(false)

const typeColumns = [
  { text: '快递代取', value: 'express' },
  { text: '宠物喂养', value: 'pet' },
  { text: '跑腿送货', value: 'errand' }
]

const petSizeColumns = [
  { text: '小型（10kg以下）', value: 'small' },
  { text: '中型（10-25kg）', value: 'medium' },
  { text: '大型（25kg以上）', value: 'large' }
]

const itemSizeColumns = [
  { text: '小件（可手持）', value: 'small' },
  { text: '中件（需搬运）', value: 'medium' },
  { text: '大件（需车辆）', value: 'large' }
]

const petSizeMap = {
  small: '小型（10kg以下）',
  medium: '中型（10-25kg）',
  large: '大型（25kg以上）'
}

const itemSizeMap = {
  small: '小件（可手持）',
  medium: '中件（需搬运）',
  large: '大件（需车辆）'
}

const typeName = computed(() => {
  const item = typeColumns.find(c => c.value === form.type)
  return item ? item.text : ''
})

const petSizeName = computed(() => {
  return petSizeMap[form.pet_size] || ''
})

const itemSizeName = computed(() => {
  return itemSizeMap[form.item_size] || ''
})

const onTypeConfirm = ({ selectedValues }) => {
  form.type = selectedValues[0]
  showTypePicker.value = false
}

const onPetSizeConfirm = ({ selectedValues }) => {
  form.pet_size = selectedValues[0]
  showPetSizePicker.value = false
}

const onItemSizeConfirm = ({ selectedValues }) => {
  form.item_size = selectedValues[0]
  showItemSizePicker.value = false
}

const form = reactive({
  title: '',
  description: '',
  address: '',
  latitude: null,
  longitude: null,
  reward: '',
  type: 'express',
  pickup_code: '',
  pet_info: '',
  pet_size: '',
  pet_gentle: true,
  item_info: '',
  item_size: '',
  dest_address: '',
  dest_latitude: null,
  dest_longitude: null
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
    const addressType = route.query.addressType || 'address'
    if (addressType === 'dest') {
      form.dest_address = route.query.address
      form.dest_latitude = route.query.latitude
      form.dest_longitude = route.query.longitude
    } else {
      form.address = route.query.address
      form.latitude = route.query.latitude
      form.longitude = route.query.longitude
    }
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

const goMapPicker = (addressType) => {
  const saveData = {
    title: form.title,
    description: form.description,
    reward: form.reward,
    type: form.type,
    pickup_code: form.pickup_code,
    pet_info: form.pet_info,
    pet_size: form.pet_size,
    pet_gentle: form.pet_gentle,
    item_info: form.item_info,
    item_size: form.item_size
  }
  if (addressType !== 'dest') {
    saveData.dest_address = form.dest_address
    saveData.dest_latitude = form.dest_latitude
    saveData.dest_longitude = form.dest_longitude
  }
  if (addressType !== 'address') {
    saveData.address = form.address
    saveData.latitude = form.latitude
    saveData.longitude = form.longitude
  }
  sessionStorage.setItem('publishForm', JSON.stringify(saveData))
  router.push({ path: '/map-picker', query: { addressType } })
}

const onSubmit = async (values) => {
  const hasPhone = await verifyPhone(userStore.userInfo, router)
  if (!hasPhone) {
    return
  }

  try {
    loading.value = true
    const data = {
      ...values,
      type: form.type,
      latitude: form.latitude,
      longitude: form.longitude,
      pickup_code: form.type === 'express' ? form.pickup_code : undefined,
      pet_info: form.type === 'pet' ? form.pet_info : undefined,
      pet_size: form.type === 'pet' ? form.pet_size : undefined,
      pet_gentle: form.type === 'pet' ? form.pet_gentle : undefined,
      item_info: form.type === 'errand' ? form.item_info : undefined,
      item_size: form.type === 'errand' ? form.item_size : undefined,
      dest_address: form.type === 'errand' ? form.dest_address : undefined,
      dest_latitude: form.type === 'errand' ? form.dest_latitude : undefined,
      dest_longitude: form.type === 'errand' ? form.dest_longitude : undefined
    }
    await publishNeed(data)
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
