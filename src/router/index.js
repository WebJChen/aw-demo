import { createRouter, createWebHistory } from "vue-router"

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
			}
		]
	},
	// {
	// 	path: "/test",
	// 	component: () => import("@/views/test.vue")
	// }
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

export default router