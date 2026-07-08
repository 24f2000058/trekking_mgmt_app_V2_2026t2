const RegisterView = {
  setup() {
    const name = Vue.ref("");
    const email = Vue.ref("");
    const phone = Vue.ref("");
    const password = Vue.ref("");
    const confirmPassword = Vue.ref("");
    const error = Vue.ref("");
    const success = Vue.ref("");
    const router = VueRouter.useRouter();

    async function handleSubmit() {
      error.value = "";
      success.value = "";

      if (password.value !== confirmPassword.value) {
        error.value = "Passwords do not match";
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          phone: phone.value,
          password: password.value,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        success.value = data.message;
        setTimeout(() => router.push("/login"), 1500);
      } else {
        error.value = data.error || "Registration failed";
      }
    }

    return { name, email, phone, password, confirmPassword, error, success, handleSubmit };
  },
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h4 class="card-title mb-3">Register</h4>
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-control" v-model="name" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" v-model="email" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Phone (optional)</label>
                <input type="text" class="form-control" v-model="phone">
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" v-model="password" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Confirm Password</label>
                <input type="password" class="form-control" v-model="confirmPassword" required>
              </div>
              <div class="alert alert-danger" v-if="error">{{ error }}</div>
              <div class="alert alert-success" v-if="success">{{ success }}</div>
              <button type="submit" class="btn btn-primary w-100">Register</button>
            </form>
            <div class="mt-3 text-center">
              <router-link to="/login">Already have an account? Login</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
