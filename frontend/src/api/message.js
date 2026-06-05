import request from '@/utils/request'

export const getMessageList = () => {
  return request({
    url: '/message/list',
    method: 'get'
  })
}

export const getUnreadCount = () => {
  return request({
    url: '/message/unread/count',
    method: 'get'
  })
}

export const markAsRead = (id) => {
  return request({
    url: `/message/read/${id}`,
    method: 'post'
  })
}

export const markAllAsRead = () => {
  return request({
    url: '/message/read/all',
    method: 'post'
  })
}

export const markConversationAsRead = (userId) => {
  return request({
    url: `/message/read/conversation/${userId}`,
    method: 'post'
  })
}

export const sendPrivateMessage = (data) => {
  return request({
    url: '/message/send',
    method: 'post',
    data
  })
}

export const getChatHistory = (userId) => {
  return request({
    url: `/message/chat/${userId}`,
    method: 'get'
  })
}
