<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUp, ArrowDown, Switch } from '@element-plus/icons-vue'

const router = useRouter()

const showElevator = ref(false)
const isAtBottom = ref(false)
const isLeftPosition = ref(false) // 控制电梯导航位置，false为右侧，true为左侧

const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  const carouselHeight = 800 // 轮播图高度
  const threshold = carouselHeight * 2 / 3 // 约533px

  // 滚动超过2/3轮播图高度时显示电梯导航
  const shouldShow = scrollTop > threshold
  showElevator.value = shouldShow

  // 检查是否到达底部（距离底部10px以内）
  const isNearBottom = scrollTop + windowHeight >= documentHeight - 10
  isAtBottom.value = isNearBottom
}

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 跳到底部
const scrollToBottom = () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  })
}

// 切换电梯导航位置
const togglePosition = () => {
  isLeftPosition.value = !isLeftPosition.value
}

// 窗口大小变化处理
const handleResize = () => {
  // 窗口大小变化时重新判断是否显示电梯导航
  handleScroll()
}

// 组件挂载时添加事件监听器
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
  // 初始化时检查一次滚动位置
  handleScroll()
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
 <div class="elevator-nav" :class="{ show: showElevator, 'left-position': isLeftPosition }">
    <div class="elevator-btn pointer" :class="{ show: showElevator }" @click="scrollToTop">
      <el-icon>
        <ArrowUp />
      </el-icon>
    </div>
    <div class="elevator-btn pointer" :class="{ show: showElevator }" @click="scrollToBottom">
      <el-icon>
        <ArrowDown />
      </el-icon>
    </div>
    <div class="elevator-btn pointer" :class="{ show: showElevator }" @click="togglePosition">
      <el-icon>
        <Switch />
      </el-icon>
    </div>
  </div>
</template>

<style scoped lang="scss">
.elevator-nav {
  position: fixed !important;
  display: flex;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9200;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;

  &.show {
    opacity: 1;
    visibility: visible;
  }

  &.left-position {
    right: auto;
    left: 20px;
  }

  .elevator-btn {
    display: flex;
    width: 50px;
    height: 50px;
    background-color: #fff;
    border-radius: 8px;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: 1px solid #e0e0e0;
    // opacity: 0;
    transition: display 0.3s ease;

    // &.show {
    //   display: flex;
    // }

    &:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15) !important;
    }

    .el-icon {
      font-size: 20px !important;
      color: #33b1a3 !important;
    }
  }
}

// 移动端和平板端：电梯导航位置下移到 70%
@media (max-width: 1024px) {
  .elevator-nav {
    top: 70% !important;
  }
}
</style>