import { createRouter, createWebHashHistory } from "vue-router"
import itemJson from "@/data/item.json"

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
						path: 'search',
						name: 'SearchResults',
						component: () => import("@/views/SearchResults.vue")
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
				component: () => import("@/views/HomeView.vue"),
				children: [
					{
						path: '',
						name: item.name,
						component: () => import("@/views/ItemGrid.vue")
					}
				]
			}))
		]
	},
	// {
	// 	path: "/test",
	// 	component: () => import("@/views/test.vue")
	// }
]

const router = createRouter({
	// history: createWebHistory(import.meta.env.BASE_URL),
	history: createWebHashHistory(import.meta.env.BASE_URL),
	routes
})

const firstRegion = itemJson[0]
const fallbackRegionPath = firstRegion?.path || 'tasmania'
const fallbackSubNavPath = firstRegion?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath || 'red-wine'

const findRegionByPath = (path) => itemJson.find((region) => region.path === path)
const findRegionByNavName = (navName) => itemJson.find((region) => region.navName === navName)
const getFirstEnabledSubNavPath = (region) => region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath || fallbackSubNavPath
const getEnabledSubNavPath = (region, subNavName) => {
	const target = region?.subNavList?.find((subNav) => subNav.subNavName === subNavName && subNav?.isShow !== false)
	return target?.subNavPath || getFirstEnabledSubNavPath(region)
}

const readPersistedNavState = () => {
	// 根路径优先恢复上次导航：读取 pinia persistedstate 默认写入的 nav store
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
	// 根路径仅作为入口，直接跳转到“上次访问”或默认业务路径，保证 URL 与页面状态一致
	if (to.name !== 'Home') return next()

	const persisted = readPersistedNavState()
	const persistedRegion = findRegionByNavName(persisted?.activeNav)
	const regionPath = persistedRegion?.path || fallbackRegionPath
	const subNavPath = getEnabledSubNavPath(persistedRegion || findRegionByPath(regionPath), persisted?.activeSubNav)

	next({
		name: regionPath,
		params: { subNav: subNavPath },
		replace: true
	})
})

export default router