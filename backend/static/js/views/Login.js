const LoginView = {
  emits: ["login-success"],
  setup(props, { emit }) {
    const email = Vue.ref("");
    const password = Vue.ref("");
    const error = Vue.ref("");

    async function handleSubmit() {
      error.value = "";
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      const data = await res.json();
      if (res.ok) {
        emit("login-success", data);
      } else {
        error.value = data.error || "Login failed";
      }
    }

    return { email, password, error, handleSubmit };
  },
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h4 class="card-title mb-3">Login</h4>
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" v-model="email" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" v-model="password" required>
              </div>
              <div class="alert alert-danger" v-if="error">{{ error }}</div>
              <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
            <div class="mt-3 text-center">
              <router-link to="/register">New user? Register here</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
