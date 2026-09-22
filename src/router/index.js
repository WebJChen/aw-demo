import { applyPrivatePageSeo } from "@/utils/pageSeo"
import { createRouter, createWebHistory } from "vue-router"

import {
  getNavDataSync,
  findRegionByPath,
} from "@/utils/navHelpers"

import {
	FALLBACK_WINE_SUB_NAV_PATH,
	WINE_GRID_ROUTE_NAME,
	isLegacyWineRegionRouteName,
	resolveWineSubNavPath
} from "@/utils/wineGridRoute"
import { buildWineryItemKey } from "@/utils/wineryItemKey"

const navData = getNavDataSync()



const serviceNavRoutes = [

	{ name: 'tasmania', path: 'tasmania' },

	{ name: 'new-south-wales', path: 'new-south-wales' },

	{ name: 'south-australia', path: 'south-australia' },

	{ name: 'western-australia', path: 'western-australia' },

	{ name: 'victoria', path: 'victoria' },

	{ name: 'queensland', path: 'queensland' },

	{ name: 'northern-territory', path: 'northern-territory' },

	{ name: 'canberra', path: 'canberra' }

]



const routes = [

	{

		path: '/checkout',

		name: 'Checkout',

		component: () => import("@/views/CheckoutView.vue")

	},

	/** 兼容旧书签：统一到带顶栏底部的订单详情 */

	{

		path: '/order/:orderNo',

		redirect: (to) => ({

			name: 'OrderDetail',

			params: to.params,

			query: to.query

		})

	},

	{

		path: '/',

		component: () => import('@/layouts/DefaultLayout.vue'),

		children: [

			{

				path: '',

				component: () => import("@/views/HomeView.vue"),

				children: [

					{

						path: '',

						name: 'Home',

						component: () => import("@/views/ItemGrid.vue")

					},

					{

						path: 'wine/:subNav?',

						name: WINE_GRID_ROUTE_NAME,

						component: () => import("@/views/ItemGrid.vue")

					},

					{

						path: 'search',

						name: 'SearchResults',

						component: () => import("@/views/SearchResults.vue")

					},

					{

						path: 'cart',

						name: 'Cart',

						component: () => import("@/views/CartView.vue")

					},

					{

						path: 'account/orders',

						name: 'OrderList',

						component: () => import("@/views/OrderListView.vue")

					},

					{

						path: 'account/order/:orderNo',

						name: 'OrderDetail',

						component: () => import("@/views/OrderDetailView.vue")

					},

					{

						path: 'winery/:regionPath/:subNav/item/:itemIndex',

						redirect: (to) => ({

							name: 'WineryDetail',

							params: {

								regionPath: to.params.regionPath,

								subNav: to.params.subNav,

								itemKey: buildWineryItemKey(

									to.params.regionPath,

									to.params.subNav,

									to.params.itemIndex

								)

							},

							query: to.query

						})

					},

					{

						path: 'winery/:regionPath/:subNav/:itemKey',

						name: 'WineryDetail',

						component: () => import("@/views/WineryDetailView.vue")

					},

					{

						path: 'winery/:regionPath/:subNav?',

						name: 'WineryPreview',

						component: () => import("@/views/WineryPreviewView.vue")

					}

				]

			},

			{ path: 'home', redirect: { name: 'Home' } },

			{ path: 'index', redirect: { name: 'Home' } },

			{

				path: 'test',

				name: 'test',

				component: () => import("@/views/test.vue")

			},

			...serviceNavRoutes.map((item) => ({

				path: `${item.path}/:subNav?`,

				redirect: (to) => ({

					name: WINE_GRID_ROUTE_NAME,

					params: {

						subNav: typeof to.params.subNav === 'string' && to.params.subNav

							? to.params.subNav

							: FALLBACK_WINE_SUB_NAV_PATH

					}

				})

			}))

		]

	},

]



const router = createRouter({

	history: createWebHistory(import.meta.env.BASE_URL),

	routes

})



const findRegionByNavName = (navName) => navData.find((region) => region.navName === navName)



const catalogRouteNames = new Set([

	'Home',

	WINE_GRID_ROUTE_NAME,

	'WineryPreview',

	'WineryDetail'

])



const buildRestoreTargetFromLastRoute = (lastRoute, persisted) => {

	if (!lastRoute?.name) return null



	const params = lastRoute.params && typeof lastRoute.params === 'object' ? { ...lastRoute.params } : {}



	if (lastRoute.name === 'WineryPreview') {

		const regionPath = String(params.regionPath || '').trim() || navData[0]?.path || 'tasmania'

		const region = findRegionByPath(regionPath)

		const itemSubNav = String(params.subNav || '').trim()

			|| region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath

			|| 'wineries'

		return {

			name: 'WineryPreview',

			params: { regionPath, subNav: itemSubNav === 'wine' ? 'wineries' : itemSubNav }

		}

	}



	if (lastRoute.name === 'WineryDetail') {

		const regionPath = String(params.regionPath || '').trim() || navData[0]?.path || 'tasmania'

		const region = findRegionByPath(regionPath)

		const itemSubNavRaw = String(params.subNav || '').trim()

			|| region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath

			|| 'wineries'

		const itemSubNav = itemSubNavRaw === 'wine' ? 'wineries' : itemSubNavRaw

		const itemKey = String(params.itemKey ?? '').trim()

			|| (String(params.itemIndex ?? '').trim()
				? buildWineryItemKey(regionPath, itemSubNav, params.itemIndex)
				: '')

		if (!itemKey) return null

		return {

			name: 'WineryDetail',

			params: { regionPath, subNav: itemSubNav, itemKey }

		}

	}



	if (lastRoute.name === 'Home' || lastRoute.name === WINE_GRID_ROUTE_NAME || isLegacyWineRegionRouteName(lastRoute.name)) {

		const subNav = resolveWineSubNavPath({

			subNavPath: params.subNav,

			activeSubNavName: persisted?.activeSubNav

		})

		return {

			name: WINE_GRID_ROUTE_NAME,

			params: { subNav }

		}

	}



	return null

}



const readPersistedNavState = () => {

	if (typeof window === 'undefined') return null

	try {

		const raw = localStorage.getItem('nav')

		if (!raw) return null

		const parsed = JSON.parse(raw)

		return parsed || null

	} catch (_) {

		return null

	}

}



router.beforeEach((to, _from, next) => {

	if (to.name === WINE_GRID_ROUTE_NAME && !to.params.subNav) {

		const persisted = readPersistedNavState()

		next({

			name: WINE_GRID_ROUTE_NAME,

			params: {

				subNav: resolveWineSubNavPath({ activeSubNavName: persisted?.activeSubNav })

			},

			replace: true

		})

		return

	}



	if (to.name !== 'Home') return next()



	const persisted = readPersistedNavState()

	const fromLastRoute = buildRestoreTargetFromLastRoute(persisted?.lastVisitedRoute, persisted)

	if (fromLastRoute) {

		next({ ...fromLastRoute, replace: true })

		return

	}



	const subNav = resolveWineSubNavPath({ activeSubNavName: persisted?.activeSubNav })

	next({

		name: WINE_GRID_ROUTE_NAME,

		params: { subNav },

		replace: true

	})

})

const PRIVATE_SEO_BY_NAME = {
	SearchResults: {
		title: '搜索',
		description: '搜索酒庄或酒款。搜索结果页不对外开放收录。',
	},
	Cart: {
		title: '购物车',
		description: '购物车为登录用户私有页面，不对外开放收录。',
	},
	Checkout: {
		title: '订单结算',
		description: '订单结算为私有流程，不对外开放收录。',
	},
	OrderList: {
		title: '我的订单',
		description: '订单列表为登录用户私有页面，不对外开放收录。',
	},
	OrderDetail: {
		title: '订单详情',
		description: '订单详情为私有页面，不对外开放收录。',
	},
}

router.afterEach((to) => {
	const privateSeo = PRIVATE_SEO_BY_NAME[to.name]
	if (privateSeo) {
		applyPrivatePageSeo(privateSeo.title, privateSeo.description)
	}
})

export { catalogRouteNames, WINE_GRID_ROUTE_NAME }

export default router


