import request from '@/utils/request'

export const getNeedList = (params) => {
  return request({
    url: '/need/list',
    method: 'get',
    params
  })
}

export const getNeedDetail = (id) => {
  return request({
    url: `/need/${id}`,
    method: 'get'
  })
}

export const publishNeed = (data) => {
  return request({
    url: '/need/publish',
    method: 'post',
    data
  })
}

export const acceptNeed = (id) => {
  return request({
    url: `/need/accept/${id}`,
    method: 'post'
  })
}

export const completeNeed = (id) => {
  return request({
    url: `/need/complete/${id}`,
    method: 'post'
  })
}

export const cancelNeed = (id) => {
  return request({
    url: `/need/cancel/${id}`,
    method: 'post'
  })
}

export const getMyPublished = () => {
  return request({
    url: '/need/my/published',
    method: 'get'
  })
}

export const getMyAccepted = () => {
  return request({
    url: '/need/my/accepted',
    method: 'get'
  })
}
