/// <reference types="@tarojs/taro" />
export default defineAppConfig({
  pages: ['pages/spin/index', 'pages/history/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFF7ED',
    navigationBarTitleText: '今天吃什么',
    navigationBarTextStyle: 'black',
  },
  requiredPrivateInfos: ['getLocation'],
  permission: {
    'scope.userLocation': {
      desc: '用于查找你附近的餐厅',
    },
  },
})
