const Navbar = {
  props: ["user"],
  emits: ["logout"],
  methods: {
    async handleLogout() {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      this.$emit("logout");
    },
  },
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <span class="navbar-brand">TrekManager</span>
        <div class="d-flex align-items-center" v-if="user">
          <span class="text-light me-3">{{ user.name }}</span>
          <button class="btn btn-outline-light btn-sm" @click="handleLogout">Logout</button>
        </div>
        <div class="d-flex" v-else>
          <router-link class="btn btn-outline-light btn-sm me-2" to="/login">Login</router-link>
          <router-link class="btn btn-outline-light btn-sm" to="/register">Register</router-link>
        </div>
      </div>
    </nav>
  `,
};
