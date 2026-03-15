<script setup>
import { Location, Phone, Message, ArrowUp, ArrowDown, ChatRound } from '@element-plus/icons-vue'
import { useDialogStore } from '@/stores/dialogStore';

const dialogStore = useDialogStore()
const openComingSoonDialog = () => dialogStore.openDialog('comingSoon')

// 暂未实现：后续可替换为完整业务页或独立弹窗
const showRefundPolicy = () => openComingSoonDialog()
const showPrivacyPolicy = () => openComingSoonDialog()
const showTermsandConditionsDialog = () => openComingSoonDialog()
const showDisclaimerModal = () => openComingSoonDialog()

// 滚动到页面顶部
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function handleHeaderLogoError(event) {
  const img = event?.target
  if (!img || img.dataset.fallbackCreated === '1') return

  img.dataset.fallbackCreated = '1'
  img.style.display = 'none'

  const span = document.createElement('span')
  span.innerText = 'AusWine'
  span.className = 'logo-fallback-text'
  span.style.display = 'inline-block'
  span.style.height = '100%'
  span.style.color = '#101010'
  span.style.fontWeight = '700'
  img.parentNode?.appendChild(span)
}

//获取footer的六张图片
const imgs = ['bgfooter1.jpg', 'bgfooter2.jpg', 'footer1.jpg', 'footer2.jpg', 'footer3.jpg', 'footer4.jpg']
const getFooterImg = name => new URL(`../assets/img/footer/${name}`, import.meta.url).href
</script>

<template>
  <el-container>
    <el-header class="fs15 bgfff">
      <span class="logo fowe7 no-select pointer">
        <!-- <RouterLink to="/DemoForTTO/trips/freeinfo"> -->
        <RouterLink to="/">
          <img src="@/assets/img/header_logo.png" alt="AusWine" class="logo-img logo-desktop"
            @error="handleHeaderLogoError" />
        </RouterLink>
      </span>
      <span class="btns no-select">
        <ul class="ul-css fs16 clearfix">
          <li class="pointer" @click="dialogStore.openDialog('aboutUs')">关于我们</li>
          <li class="pointer dropdown">
            <el-dropdown class="language-dropdown">
              <span class="el-dropdown-link">
                语言/語言/LANGUAGE<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>中文简体</el-dropdown-item>
                  <el-dropdown-item disabled>中文繁體</el-dropdown-item>
                  <el-dropdown-item disabled>ENGLISH</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </li>
          <li class="pointer" @click="dialogStore.openDialog('comingSoon')">付款与退款</li>
          <li class="pointer" @click="dialogStore.openDialog('comingSoon')">用户注册/登录</li>
          <li class="pointer" @click="dialogStore.openDialog('comingSoon')">成为会员</li>
          <li class="pointer" @click="dialogStore.openDialog('joinUs')">加入我们</li>
          <li class="pointer" @click="dialogStore.openDialog('contactUs')">联系我们</li>
        </ul>
      </span>
    </el-header>

    <RouterView />

    <el-footer>
      <div class="footer-content">
        <!-- 关于我们 -->
        <div class="footer-section">
          <div class="logo-section">
            <div class="company-name"><img src="@/assets/img/header_logo.png" alt="AusWine"
                class="logo-img logo-desktop" />
            </div>
          </div>
          <div class="about-text">
            旅游是一种社会行为，古已有之。
            中国是史上最早出现旅游活动的国家之一。从春秋战国时期孔子“周游列国”到明朝徐霞客写下了《游大理日记》、《三峡》、
            《游雁荡山日记》等等的宝贵游记。现代社会，随着世界经济的增长和科技的进步，人们出游的需求与日俱增，
            本公司便是有感于此而创立，立意为人民的出行提供专业、
            适宜的行程安排，提供适时又有温度的服务，提供安全、安心的保障和后勤服务。
            诚会天下游者，祝所有游者健康、平安、喜乐、祥和、家庭幸福、旅途愉快，若是有缘，必定江湖相见，请请。
          </div>
          <div class="contact-info">
            <div class="contact-item">
              <el-icon>
                <Location />
              </el-icon>
              <span>1/18 WENDOVER PLACE NEW TOWN,TASMANIA 7008 AUSTRALIA.</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <Phone />
              </el-icon>
              <span>(+61)0488 388 188</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <Message />
              </el-icon>
              <span>tto.advisory@gmail.com（咨询用邮箱）</span>
            </div>
            <div class="contact-item">
              <el-icon>
                <ChatRound />
              </el-icon>
              <span>TasmaniaTrips（欢迎添加微信号咨询）</span>
            </div>
          </div>
        </div>

        <!-- 最新资讯 -->
        <div class="footer-section">
          <div class="section-title">
            <h3>塔州最新资讯</h3>
            <div class="title-underline"></div>
          </div>
          <div class="news-content">
            <!-- 伊朗波鲁埃新建攀岩建筑项目，由"新浪潮"建筑公司承建，位于伊朗最高峰前，项目总投资约500万美元，预计明年完工。 -->
            2025塔斯马尼亚亮点：1月杜松子酒节狂欢，4-9月惠灵顿山追极光，每周六萨拉曼卡市集淘宝。
          </div>
          <div class="news-date">{{ new Date().toLocaleDateString() }}</div>
        </div>

        <!-- 快速导航 -->
        <div class="footer-section">
          <div class="section-title">
            <h3>快速导航入口</h3>
            <div class="title-underline"></div>
          </div>
          <div class="nav-links">
            <div class="nav-item">
              <!-- 路由待修改 -->
              <RouterLink to="/" @click="scrollToTop()">
                网站首页 <span>Home</span>
              </RouterLink>
            </div>
            <div class="nav-item" @click="openComingSoonDialog">
              <!-- 暂未实现：精品路线详情页 -->
              精品路线 <span>Tourist route</span>
            </div>
            <div class="nav-item">
              <RouterLink to="/" @click="scrollToTop()">
                八大服务 <span>Service</span>
              </RouterLink>
            </div>
            <div class="nav-item" @click="dialogStore.openDialog('aboutUs')">关于我们 <span>About
                us</span></div>
            <div class="nav-item" @click="dialogStore.openDialog('contactUs')">联系我们 <span>Contact us</span></div>
          </div>
        </div>

        <!-- 精品路线 -->
        <div class="footer-section">
          <div class="section-title">
            <h3>精品度假路线</h3>
            <div class="title-underline"></div>
          </div>
          <div class="route-grid">
            <div class="route-item" v-for="(src, idx) in imgs" :key="idx">
              <!-- 暂未实现：图片点击跳转对应路线页 -->
              <img :src="getFooterImg(src)" alt="route" class="route-img" @click="openComingSoonDialog" />
            </div>
          </div>
        </div>
        <div class="web-msg">
          <div class="important-msg">
            <ul>
              <!-- 暂未实现：以下页脚协议页先用 comingSoon 占位 -->
              <li @click="showRefundPolicy">退款政策</li>
              <li @click="showDisclaimerModal">
                免责条款
              </li>
              <li @click="showPrivacyPolicy">隐私政策</li>
              <li @click="showTermsandConditionsDialog">条款与条件</li>
            </ul>
          </div>
          <div class="declaration center">AusWine由TASMANIA TRIPS PTY LTD（塔斯马尼亚旅行有限公司）运营</div>
          <div class="copyright center">© 2025 AusWine 保留所有权利。</div>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>

<style lang="scss">
.el-header .ul-css .el-dropdown {
  // position: relative;
  color: #111;
  font-size: 16px;
}

.el-dropdown-menu {
  z-index: 3000 !important;
}
</style>
<style scoped lang="scss">
.el-container {
  min-height: 100vh;

  .el-header {
    position: sticky;
    top: 0;
    height: 70px;
    line-height: 70px;
    // background-color: #39c5bb;
    z-index: 2000;
    overflow: visible;

    .logo,
    .btns {
      text-align: center;
    }

    .logo {
      // font-size: 24px;

      .logo-img {
        width: 200px;
        vertical-align: middle;
      }

      :deep(.logo-fallback-text) {
        line-height: 48px;
        font-size: 20px;
      }
    }

    .btns {
      position: absolute;
      right: 40px;
      color: #111;

      .ul-css {

        li {
          float: left;
          height: 55px;
          margin-left: 30px;
          transition: all 0.3s ease;
        }

        li:not(.dropdown):hover {
          color: #2da099;
          border-bottom: 1px #2da099 solid;
        }
      }

      i {
        display: inline-block;
        height: 40px;
        line-height: 70px;
        font-size: 14px;
      }
    }

  }

  .el-footer {
    // height: 620px;
    height: auto;
    background-color: #f8f9fa;
    color: #333;
    /* Added background color for footer */
    padding: 24px 0 0;
    position: relative;

    .footer-content {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 2fr;
      gap: 30px;
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 20px;
      height: 100%;
      align-items: center;
      color: #333;

      .footer-section {
        // background-color: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        height: 420px;
        border-radius: 10px;
        text-align: left;

        padding: {
          top: 25px;
        }

        // 第一个方块 - 关于我们
        &:first-child {
          // .logo-section {
          //     // margin-bottom: 20px;
          // }

          .about-text {
            flex: 1;
            margin-bottom: 10px;
            padding-top: 20px;
          }

          .contact-info {
            margin-top: auto;
          }
        }

        // 第二个方块 - 最新资讯
        &:nth-child(2) {
          .section-title {
            margin-bottom: 20px;
          }

          .news-content {
            flex: 1;
            margin-bottom: 10px;
            padding-top: 20px;
          }

          .news-date {
            margin-top: auto;
            text-align: left;
          }
        }

        // 第四个方块 - 精品路线
        &:nth-child(4) {
          .section-title {
            margin-bottom: 20px;
          }

          .route-grid {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            align-content: flex-start;
            padding-top: 20px;
          }
        }

        .logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 15px;

          .company-name {
            // font-size: 25px;
            font-weight: bold;
            font-style: italic;

            .logo-img {
              width: 215px;
              margin-top: -15px;
              vertical-align: middle;
            }
          }
        }

        .about-text {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 20px;
        }

        .contact-info {
          .contact-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;

            .el-icon {
              margin-right: 8px;
              font-size: 18px;
              color: #33b1a3;
            }

            i {
              width: 1em;
              height: 1em;
            }

            i:last-child {
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M8.5 12c0 .8-.7 1.5-1.5 1.5S5.5 12.8 5.5 12s.7-1.5 1.5-1.5S8.5 11.2 8.5 12zm7 0c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5S15.5 11.2 15.5 12z'/%3E%3C/svg%3E");
            }
          }
        }

        .section-title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 20px;

          h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: bold;
          }

          .title-underline {
            width: 36px;
            height: 2px;
            background-color: #33b1a3;
          }
        }

        .news-content {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .news-date {
          font-size: 12px;
          text-align: right;
          color: #33b1a3;
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          height: 100%;

          .nav-item {
            font-size: 14px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: color 0.3s ease;

            &:hover {
              color: #2da099;
            }

            // 英文部分使用指定颜色
            span {
              color: #33b1a3;
              margin-left: 8px;
            }
          }
        }

        .route-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;

          .route-item {
            display: flex;
            justify-content: center;
            align-items: center;

            .route-img {
              width: 88px;
              height: 88px;
              object-fit: cover;
              border-radius: 8px;
              cursor: pointer;
              transition: transform 0.3s ease;

              &:hover {
                transform: scale(1.05);
              }
            }
          }
        }
      }

      .web-msg {
        grid-column: 1 / -1;
        width: 100%;
        max-width: 1200px;
        margin: 10px auto 0;
        padding-top: 14px;
        border-top: 1px solid #e6e6e6;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.6;

        .important-msg {
          display: flex;
          justify-content: center;
          margin-bottom: 6px;

          ul {
            display: flex;
            gap: 20px;
            list-style: none;
            padding: 0;
            margin: 0;
          }

          li {
            cursor: pointer;
            color: #6b7280;
            transition: color 0.2s ease;

            &:hover {
              color: #111827;
            }
          }

          a:hover {
            color: #111827
          }

        }

        .declaration,
        .copyright {
          text-align: center;
          color: #6b7280;
        }
      }
    }
  }
}

/* 响应式适配：平板（768px-1024px） */
@media (min-width: 768px) and (max-width: 1024px) {
  .el-container {
    .el-header {
      display: flex;
      position: relative;
      flex-direction: column;
      height: auto;
      line-height: 1.4;
      padding: 8px 0 12px 8px;

      .logo {
        font-size: 20px;
        text-align: left;

        :deep(.logo-fallback-text) {
          line-height: 40px;
          font-size: 19px;
        }
      }

      .btns {
        position: relative !important;
        right: auto;
        width: 100%;
        margin-top: 6px;

        .ul-css {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-evenly;
          gap: 8px;
          overflow: visible;
          white-space: normal;

          li {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: auto;
            height: 40px;
            margin-left: 0;
            padding: 0 6px;
          }
        }

        i {
          display: none;
        }
      }
    }

    .el-footer {
      // min-height: 620px;

      .footer-content {
        grid-template-columns: 1fr 1fr;
        // gap: 24px;
        column-gap: 30px;
        padding: 0 16px;
        height: auto;
      }

      .footer-section {
        padding: 12px 0;
        margin-bottom: 50px;
      }

      .route-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .web-msg {
        max-width: 90%;
        font-size: 12px;
      }
    }
  }
}

/* 响应式适配：手机（<768px） */
@media (max-width: 767px) {
  .el-container {
    .el-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      height: auto;
      line-height: 1.4;
      padding: 8px 0 12px 8px;
      position: relative;

      .logo {
        font-size: 18px;
        text-align: left;

        :deep(.logo-fallback-text) {
          line-height: 32px;
          font-size: 18px;
        }
      }

      .btns {
        position: static !important;
        right: auto;
        width: 100%;
        margin-top: 6px;

        .ul-css {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-evenly;
          gap: 8px;
          overflow: visible;
          white-space: normal;

          li {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: auto;
            height: 40px;
            margin-left: 0;
            padding: 0 6px;
          }
        }

        i {
          display: none;
        }
      }
    }

    .el-footer {
      // min-height: 680px;
      padding: 16px 0 16px;

      .footer-content {
        grid-template-columns: 1fr;
        gap: 90px;
        padding: 0 12px;
        height: auto;
      }

      .footer-section {
        padding: 8px 0;
        margin-bottom: 50px;
      }

      .route-grid {
        grid-template-columns: repeat(3, 1fr);

        .route-img {
          width: 72px;
          height: 72px;
        }
      }

      .web-msg {
        max-width: 92%;
        margin-top: 12px;
        font-size: 11px;

        .important-msg ul {
          gap: 14px;
        }
      }
    }
  }
}

/* 超小屏幕设备适配（iPhone 4、iPhone 5、iPhone SE等，<=375px） */
@media (max-width: 375px) {
  .el-container {
    .el-header {
      padding: 6px 8px;

      .logo {
        font-size: 16px;
      }

      .btns {
        margin-top: 4px;

        .ul-css {
          gap: 4px;

          li {
            height: 36px;
            padding: 0 4px;
          }
        }
      }
    }

    .el-footer {
      // min-height: 720px;
      padding: 12px 0 12px;

      .footer-content {
        gap: 20px;
        padding: 0 8px;
      }

      .footer-section {
        padding: 6px 0;
        margin-bottom: 50px;

        // 第一个方块 - 关于我们
        &:first-child {
          .logo-section {
            margin-bottom: 12px;

            .company-name {
              font-size: 20px;
            }
          }

          .about-text {
            font-size: 12px;
            line-height: 1.6;
            margin-bottom: 12px;
            padding-top: 12px;
          }

          .contact-info {
            .contact-item {
              margin-bottom: 6px;
              font-size: 11px;
              line-height: 1.4;
              flex-wrap: wrap;

              .el-icon {
                margin-right: 6px;
                font-size: 14px;
                flex-shrink: 0;
                color: #33b1a3;
              }

              span {
                word-break: break-word;
                hyphens: auto;
              }


            }
          }
        }

        // 第二个方块 - 最新资讯
        &:nth-child(2) {
          .section-title {
            margin-bottom: 12px;

            h3 {
              font-size: 16px;
            }
          }

          .news-content {
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 8px;
            padding-top: 12px;
          }

          .news-date {
            font-size: 10px;
          }
        }

        // 第三个方块 - 快速导航
        &:nth-child(3) {
          .section-title {
            margin-bottom: 12px;

            h3 {
              font-size: 16px;
            }
          }

          .nav-links {
            .nav-item {
              font-size: 12px;
              margin-bottom: 6px;
              line-height: 1.3;

              span {
                margin-left: 4px;
                font-size: 11px;
              }
            }
          }
        }

        // 第四个方块 - 精品路线
        &:nth-child(4) {
          .section-title {
            margin-bottom: 12px;

            h3 {
              font-size: 16px;
            }
          }

          .route-grid {
            gap: 6px;
            padding-top: 12px;

            .route-img {
              width: 60px;
              height: 60px;
            }
          }
        }
      }

      .web-msg {
        max-width: 96%;
        margin-top: 8px;
        font-size: 10px;

        .important-msg {
          margin-bottom: 4px;

          ul {
            gap: 10px;
          }

          li {
            font-size: 10px;
          }
        }
      }
    }
  }
}

/* 极超小屏幕设备适配（iPhone 4等，<=320px） */
@media (max-width: 320px) {
  .el-container {
    .el-header {
      padding: 4px 6px;

      .logo {
        font-size: 14px;
      }

      .btns {
        margin-top: 3px;

        .ul-css {
          gap: 2px;

          li {
            height: 32px;
            padding: 0 2px;
            font-size: 11px;
          }
        }
      }
    }

    .el-footer {
      // min-height: 760px;
      padding: 8px 0 8px;

      .footer-content {
        gap: 6px;
        padding: 0 6px;
      }

      .footer-section {
        padding: 4px 0;
        margin-bottom: 50px;

        // 第一个方块 - 关于我们
        &:first-child {
          .logo-section {
            margin-bottom: 8px;

            .company-name {
              font-size: 18px;
            }
          }

          .about-text {
            font-size: 11px;
            line-height: 1.5;
            margin-bottom: 8px;
            padding-top: 8px;
          }

          .contact-info {
            .contact-item {
              margin-bottom: 4px;
              font-size: 10px;
              line-height: 1.3;

              .el-icon {
                margin-right: 4px;
                font-size: 12px;
              }

              span {
                word-break: break-all;
              }

              i {
                width: 1em;
                height: 1em;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M8.5 12c0 .8-.7 1.5-1.5 1.5S5.5 12.8 5.5 12s.7-1.5 1.5-1.5S8.5 11.2 8.5 12zm7 0c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5S15.5 11.2 15.5 12z'/%3E%3C/svg%3E");
              }
            }
          }
        }

        // 其他方块
        .section-title {
          margin-bottom: 8px;

          h3 {
            font-size: 14px;
          }
        }

        .news-content {
          font-size: 11px;
          line-height: 1.4;
          margin-bottom: 6px;
          padding-top: 8px;
        }

        .nav-links {
          .nav-item {
            font-size: 11px;
            margin-bottom: 4px;
            line-height: 1.2;

            span {
              margin-left: 2px;
              font-size: 10px;
            }
          }
        }

        .route-grid {
          gap: 4px;
          padding-top: 8px;

          .route-img {
            width: 50px;
            height: 50px;
          }
        }
      }

      .web-msg {
        max-width: 98%;
        margin-top: 6px;
        font-size: 9px;

        .important-msg {
          margin-bottom: 3px;

          ul {
            gap: 8px;
          }

          li {
            font-size: 9px;
          }
        }
      }
    }
  }
}
</style>