import { createRouter, createWebHistory } from "vue-router"

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
				name: 'Home',
				component: () => import("@/views/HomeView.vue")
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
				name: item.name,
				component: () => import("@/views/HomeView.vue")
			}))
		]
	},
	// {
	// 	path: "/test",
	// 	component: () => import("@/views/test.vue")
	// }
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes
})

export default router