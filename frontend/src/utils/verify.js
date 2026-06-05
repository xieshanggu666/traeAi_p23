import { showDialog } from 'vant'

const checkPhone = (userInfo) => {
  if (!userInfo || !userInfo.phone) {
    return false
  }

  const phoneReg = /^1[3-9]\d{9}$/
  return phoneReg.test(userInfo.phone)
}

const verifyPhone = async (userInfo, router) => {
  if (checkPhone(userInfo)) {
    return true
  }

  try {
    await showDialog({
      title: '提示',
      message: '您还未填写手机号，请先到个人中心完善资料',
      confirmButtonText: '去完善',
      cancelButtonText: '取消'
    })
    router.push('/profile')
    return false
  } catch (e) {
    return false
  }
}

export {
  checkPhone,
  verifyPhone
}
