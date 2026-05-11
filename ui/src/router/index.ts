import { createRouter, createWebHistory } from "vue-router";
import ScaffoldView from "../views/ScaffoldView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "scaffold",
      component: ScaffoldView,
    },
    {
      path: "/public",
      name: "public",
      component: () => import("../views/PublicSitesView.vue"),
    },
  ],
});

export default router;
