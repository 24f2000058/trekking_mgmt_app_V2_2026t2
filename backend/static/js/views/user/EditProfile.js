const EditProfile = {
  name: "EditProfile",

  template: `
    <div>
      <h5 class="mb-3">Edit Profile</h5>

      <p v-if="loading">Loading profile...</p>

      <div v-else class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-body">

              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">
                  Email (cannot be changed)
                </label>
                <input class="form-control" :value="profile.email"
                       disabled readonly />
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">
                  Role
                </label>
                <input class="form-control text-capitalize"
                       :value="profile.role" disabled readonly />
              </div>

              <hr />

              <div class="mb-3">
                <label class="form-label fw-bold">Full Name</label>
                <input class="form-control" v-model="form.name"
                       placeholder="Your full name" />
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Phone</label>
                <input class="form-control" v-model="form.phone"
                       placeholder="Phone number (optional)" />
              </div>

              <hr />
              <p class="text-muted small mb-2">
                Change Password (leave blank to keep current password)
              </p>

              <div class="mb-3">
                <label class="form-label fw-bold">Current Password</label>
                <input class="form-control" type="password"
                       v-model="form.current_password"
                       placeholder="Required only if changing password" />
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">New Password</label>
                <input class="form-control" type="password"
                       v-model="form.new_password"
                       placeholder="Min 6 characters" />
              </div>

              <div v-if="feedbackMsg"
                   class="alert py-2"
                   :class="feedbackError
                     ? 'alert-danger' : 'alert-success'">
                {{ feedbackMsg }}
              </div>

              <button class="btn btn-primary w-100"
                      @click="saveProfile()"
                      :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      profile: {},
      form: { name: "", phone: "", current_password: "", new_password: "" },
      loading: false,
      saving: false,
      feedbackMsg: "",
      feedbackError: false
    }
  },

  created() { this.fetchProfile() },

  methods: {
    async fetchProfile() {
      this.loading = true
      const r = await fetch("/api/user/profile", { credentials: "include" })
      this.profile = await r.json()
      this.form.name = this.profile.name
      this.form.phone = this.profile.phone || ""
      this.loading = false
    },

    async saveProfile() {
      this.feedbackMsg = ""
      this.saving = true

      const payload = {
        name: this.form.name,
        phone: this.form.phone
      }
      if (this.form.new_password) {
        payload.current_password = this.form.current_password
        payload.new_password = this.form.new_password
      }

      const r = await fetch("/api/user/profile", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      this.saving = false

      if (!r.ok) {
        this.feedbackMsg = data.error
        this.feedbackError = true
        return
      }
      this.feedbackMsg = data.message
      this.feedbackError = false
      this.form.current_password = ""
      this.form.new_password = ""
      this.fetchProfile()
    }
  }
}
