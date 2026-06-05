import { showToast } from 'vant'

const AMAP_KEY = '1019ae34f3019ab0da256f57b7bb0a5f'

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    const cachedLocation = localStorage.getItem('userLocation')
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          resolve(parsed)
          return
        }
      } catch (e) {
        // ignore
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now()
          }
          localStorage.setItem('userLocation', JSON.stringify(location))
          resolve(location)
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    } else {
      reject(new Error('浏览器不支持定位'))
    }
  })
}

const getCachedLocation = () => {
  const cached = localStorage.getItem('userLocation')
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch (e) {
      return null
    }
  }
  return null
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null

  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance
}

const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return ''
  if (distance < 1) {
    return Math.round(distance * 1000) + 'm'
  }
  return distance.toFixed(2) + 'km'
}

const regeocode = (latitude, longitude) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const callbackName = 'amap_regeocode_' + Date.now()

    window[callbackName] = (data) => {
      delete window[callbackName]
      document.body.removeChild(script)

      if (data.status === '1' && data.regeocode) {
        resolve({
          address: data.regeocode.formatted_address,
          province: data.regeocode.addressComponent.province,
          city: data.regeocode.addressComponent.city,
          district: data.regeocode.addressComponent.district,
          township: data.regeocode.addressComponent.township
        })
      } else {
        reject(new Error(data.info || '逆地理编码失败'))
      }
    }

    script.src = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}&extensions=base&callback=${callbackName}`
    script.onerror = () => {
      delete window[callbackName]
      document.body.removeChild(script)
      reject(new Error('请求失败'))
    }
    document.body.appendChild(script)
  })
}

const openNavigation = (latitude, longitude, name, address) => {
  if (!latitude || !longitude) {
    showToast('地址坐标不存在')
    return
  }

  if (typeof wx !== 'undefined' && wx.openLocation) {
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name || '目标位置',
      address: address || '',
      scale: 15,
      success: () => {},
      fail: () => {
        openWebNavigation(latitude, longitude, name, address)
      }
    })
  } else {
    openWebNavigation(latitude, longitude, name, address)
  }
}

const openWebNavigation = (latitude, longitude, name, address) => {
  const url = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(name || '目标位置')}&policy=0&coordinate=gaode&callnative=1`
  window.open(url, '_blank')
}

export {
  AMAP_KEY,
  getCurrentLocation,
  getCachedLocation,
  calculateDistance,
  formatDistance,
  regeocode,
  openNavigation,
  openWebNavigation
}
