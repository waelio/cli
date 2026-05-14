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
      path: "/public-sites",
      name: "public-sites",
      component: () => import("../views/PublicSitesView.vue"),
    },
    {
      path: "/negotiation",
      name: "negotiation",
      component: () => import("../views/NegotiationView.vue"),
    },
  ],
});

export default router;
