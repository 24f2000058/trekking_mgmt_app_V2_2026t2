const authState = Vue.reactive({ user: null });

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginView },
  { path: "/register", component: RegisterView },
  { path: "/admin", component: AdminDashboard },
  { path: "/staff", component: StaffDashboard },
  { path: "/dashboard", component: UserDashboard },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  const protectedPaths = ["/admin", "/staff", "/dashboard"];
  if (protectedPaths.includes(to.path) && !authState.user && to.path !== "/login" && to.path !== "/register") {
    return "/login";
  }
});

const RootComponent = {
  data() {
    return { currentUser: authState.user };
  },
  created() {
    fetch("/api/auth/me", { credentials: "include" }).then((res) => {
      if (res.ok) {
        res.json().then((data) => {
          this.setUser(data);
          this.redirectToDashboard(data.role);
        });
      }
    });
  },
  methods: {
    setUser(data) {
      this.currentUser = { name: data.name, role: data.role, id: data.id };
      authState.user = this.currentUser;
    },
    redirectToDashboard(role) {
      if (role === "admin") this.$router.push("/admin");
      else if (role === "staff") this.$router.push("/staff");
      else this.$router.push("/dashboard");
    },
    handleLogin(data) {
      this.setUser(data);
      this.redirectToDashboard(data.role);
    },
    handleLogout() {
      this.currentUser = null;
      authState.user = null;
      this.$router.push("/login");
    },
  },
  template: `
    <div>
      <navbar :user="currentUser" @logout="handleLogout"></navbar>
      <div class="container mt-4">
        <router-view @login-success="handleLogin"></router-view>
      </div>
    </div>
  `,
};

const app = Vue.createApp(RootComponent);
app.component("navbar", Navbar);
app.use(router);
app.mount("#app");
