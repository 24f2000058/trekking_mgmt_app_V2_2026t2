const StaffManagement = {
  name: "StaffManagement",

  template: `
    <div class="card">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div class="d-flex gap-2">
            <input v-model="searchQuery" type="text" class="form-control" placeholder="Search by name or email">
            <button class="btn btn-outline-secondary" @click="fetchStaff">Search</button>
            <button v-if="searchQuery" class="btn btn-outline-secondary" @click="searchQuery=''; fetchStaff()">X Clear</button>
          </div>
          <button class="btn btn-success" @click="showCreateForm = !showCreateForm">Add Staff Member</button>
        </div>

        <div class="card mb-3" v-if="showCreateForm">
          <div class="card-body">
            <h5 class="card-title">New Staff Member</h5>
            <div class="alert alert-danger" v-if="errorMsg">{{ errorMsg }}</div>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Full Name</label>
                <input v-model="createForm.name" type="text" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input v-model="createForm.email" type="email" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Phone</label>
                <input v-model="createForm.phone" type="text" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Password</label>
                <input v-model="createForm.password" type="password" class="form-control">
              </div>
              <div class="col-12">
                <label class="form-label">Bio / Notes</label>
                <textarea v-model="createForm.bio" class="form-control"></textarea>
              </div>
            </div>
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-primary" @click="createStaff">Create Staff</button>
              <button class="btn btn-secondary" @click="showCreateForm = false">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="loading">Loading...</div>
        <div class="alert alert-info" v-else-if="staffList.length === 0">No staff members found.</div>
        <div class="table-responsive" v-else>
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Email</th><th>Phone</th>
                <th>Bio</th><th>Assigned Treks</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(staff, i) in staffList" :key="staff.user_id">
                <td>{{ i + 1 }}</td>
                <td>{{ staff.name }}</td>
                <td>{{ staff.email }}</td>
                <td>{{ staff.phone || '-' }}</td>
                <td>{{ staff.bio || '-' }}</td>
                <td>{{ staff.assigned_treks.length ? staff.assigned_treks.map(t => t.name).join(', ') : 'None' }}</td>
                <td>
                  <span class="badge" :class="staff.status === 'active' ? 'bg-success' : 'bg-danger'">{{ staff.status }}</span>
                </td>
                <td>
                  <button v-if="staff.status === 'active'" class="btn btn-sm btn-outline-danger" @click="toggleStatus(staff, 'blacklisted')">Blacklist</button>
                  <button v-else class="btn btn-sm btn-outline-success" @click="toggleStatus(staff, 'active')">Activate</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `,

  data() {
    return {
      staffList: [],
      loading: false,
      searchQuery: "",
      showCreateForm: false,
      createForm: {
        name: "", email: "", phone: "", password: "", bio: ""
      },
      errorMsg: ""
    };
  },

  created() {
    this.fetchStaff();
  },

  methods: {
    async fetchStaff() {
      this.loading = true;
      const q = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : "";
      const r = await fetch(`/api/admin/staff${q}`, { credentials: "include" });
      this.staffList = await r.json();
      this.loading = false;
    },

    async createStaff() {
      this.errorMsg = "";
      const r = await fetch("/api/admin/staff", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.createForm)
      });
      const data = await r.json();
      if (!r.ok) { this.errorMsg = data.error; return; }
      this.showCreateForm = false;
      this.createForm = { name: "", email: "", phone: "", password: "", bio: "" };
      this.fetchStaff();
    },

    async toggleStatus(staff, newStatus) {
      const confirmMsg = newStatus === "blacklisted"
        ? `Blacklist ${staff.name}?`
        : `Activate ${staff.name}?`;
      if (!window.confirm(confirmMsg)) return;
      await fetch(`/api/admin/staff/${staff.user_id}/status`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      this.fetchStaff();
    }
  }
};
