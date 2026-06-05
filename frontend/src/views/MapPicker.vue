<template>
  <div class="map-picker-page">
    <van-nav-bar :title="addressType === 'dest' ? '选择目的地' : '选择地址'" left-text="返回" left-arrow @click-left="onClickLeft">
      <template #right>
        <span class="confirm-btn" @click="onConfirm" :class="{ disabled: !selectedLocation }">确定</span>
      </template>
    </van-nav-bar>

    <div class="search-bar">
      <van-search
        v-model="searchKeyword"
        placeholder="搜索地址"
        show-action
        @search="onSearch"
      >
        <template #action>
          <div class="search-action-btn" @click.stop="onSearch">搜索</div>
        </template>
      </van-search>
    </div>

    <div v-if="searchResults.length > 0" class="search-results">
      <div
        v-for="item in searchResults"
        :key="item.id"
        class="search-result-item"
        @click="onSelectSearchResult(item)"
      >
        <van-icon name="location-o" size="16" color="#667eea" />
        <div class="result-text">
          <p class="result-name">{{ item.name }}</p>
          <p class="result-address">{{ item.address || item.district }}</p>
        </div>
      </div>
    </div>

    <div class="map-container" v-show="searchResults.length === 0">
      <div id="mapContainer" class="amap-container"></div>
      <div class="map-marker">
        <van-icon name="location" size="32" color="#ff6034" />
      </div>
    </div>

    <div class="address-info" v-show="searchResults.length === 0">
      <div v-if="loading" class="loading">
        <van-loading size="16px" />
        <span>定位中...</span>
      </div>
      <div v-else-if="selectedLocation" class="address-detail">
        <h4>{{ selectedLocation.address }}</h4>
        <p class="address-sub">{{ selectedLocation.province }}{{ selectedLocation.city }}{{ selectedLocation.district }}</p>
      </div>
      <div v-else class="no-address">
        <p>请在地图上选择位置</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { AMAP_KEY, getCachedLocation, regeocode, searchPlace } from '@/utils/location'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const selectedLocation = ref(null)
const map = ref(null)
const searchKeyword = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const addressType = ref(route.query.addressType || 'address')

const initMap = () => {
  const userLocation = getCachedLocation()
  let center = [116.397428, 39.90923]

  if (userLocation) {
    center = [userLocation.longitude, userLocation.latitude]
  }

  map.value = new window.AMap.Map('mapContainer', {
    zoom: 15,
    center: center,
    resizeEnable: true
  })

  map.value.on('complete', () => {
    loading.value = false
    handleMapMove()
  })

  map.value.on('moveend', handleMapMove)

  if (userLocation) {
    getAddressByLocation(userLocation.latitude, userLocation.longitude)
  }
}

const handleMapMove = () => {
  const center = map.value.getCenter()
  getAddressByLocation(center.lat, center.lng)
}

const getAddressByLocation = async (lat, lng) => {
  loading.value = true
  try {
    const result = await regeocode(lat, lng)
    selectedLocation.value = {
      ...result,
      latitude: lat,
      longitude: lng
    }
  } catch (err) {
    console.error(err)
    selectedLocation.value = {
      address: '未知地址',
      province: '',
      city: '',
      district: '',
      latitude: lat,
      longitude: lng
    }
  } finally {
    loading.value = false
  }
}

const onSearch = async () => {
  if (!searchKeyword.value.trim()) {
    showToast('请输入搜索关键词')
    return
  }

  if (searchLoading.value) return
  searchLoading.value = true

  try {
    const results = await searchPlace(searchKeyword.value)
    searchResults.value = results.map(poi => ({
      ...poi,
      district: poi.province + poi.city + poi.district,
      districtName: poi.district
    }))
    if (searchResults.value.length === 0) {
      showToast('未找到相关地址')
    }
  } catch (err) {
    console.error(err)
    showToast('搜索失败，请重试')
  } finally {
    searchLoading.value = false
  }
}

const onSelectSearchResult = async (item) => {
  searchResults.value = []
  searchKeyword.value = ''
  loading.value = true
  try {
    const result = await regeocode(item.latitude, item.longitude)
    selectedLocation.value = {
      ...result,
      latitude: item.latitude,
      longitude: item.longitude
    }
  } catch (err) {
    selectedLocation.value = {
      address: item.name,
      province: item.province || '',
      city: item.city || '',
      district: item.districtName || '',
      latitude: item.latitude,
      longitude: item.longitude
    }
  } finally {
    loading.value = false
  }
  if (map.value) {
    map.value.setCenter([item.longitude, item.latitude])
  }
}

const onClickLeft = () => {
  router.back()
}

const onConfirm = () => {
  if (!selectedLocation.value) {
    showToast('请选择地址')
    return
  }
  router.push({
    path: '/publish',
    query: {
      address: selectedLocation.value.address,
      latitude: selectedLocation.value.latitude,
      longitude: selectedLocation.value.longitude,
      addressType: addressType.value
    }
  })
}

const loadAmapScript = () => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.PlaceSearch`
    script.onload = () => {
      resolve()
    }
    script.onerror = () => {
      reject(new Error('地图加载失败'))
    }
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    await loadAmapScript()
    initMap()
  } catch (err) {
    console.error(err)
    showToast('地图加载失败')
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (map.value) {
    map.value.destroy()
  }
})
</script>

<style scoped>
.map-picker-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.confirm-btn {
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
}

.confirm-btn.disabled {
  color: #ccc;
  cursor: not-allowed;
}

.search-bar {
  flex-shrink: 0;
}

.search-bar .van-search {
  padding: 8px 12px;
}

.search-action-btn {
  color: #667eea;
  font-size: 14px;
  padding: 0 8px;
  white-space: nowrap;
  cursor: pointer;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.search-result-item:active {
  background: #f5f5f5;
}

.search-result-item .van-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.result-text {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 15px;
  color: #333;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-address {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-container {
  flex: 1;
  position: relative;
}

.amap-container {
  width: 100%;
  height: 100%;
}

.map-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 10;
}

.address-info {
  background: #fff;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  min-height: 80px;
}

.loading {
  display: flex;
  align-items: center;
  color: #999;
  font-size: 14px;
  gap: 8px;
}

.address-detail h4 {
  font-size: 16px;
  margin: 0 0 6px;
  color: #333;
}

.address-sub {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.no-address {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 20px 0;
}
</style>
