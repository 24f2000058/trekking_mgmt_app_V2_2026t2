const UserManagement = {
  name: "UserManagement",

  template: `
    <div class="card">
      <div class="card-body">

        <div class="d-flex gap-2 mb-3">
          <input v-model="searchQuery" type="text" class="form-control" placeholder="Search by name or email">
          <button class="btn btn-outline-secondary" @click="fetchUsers">Search</button>
          <button v-if="searchQuery" class="btn btn-outline-secondary" @click="searchQuery=''; fetchUsers()">X Clear</button>
        </div>

        <div v-if="loading">Loading...</div>
        <div class="alert alert-info" v-else-if="users.length === 0">No trekkers registered yet.</div>
        <div class="table-responsive" v-else>
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Email</th><th>Phone</th>
                <th>Total Bookings</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(user, i) in users" :key="user.id">
                <td>{{ i + 1 }}</td>
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.phone || '-' }}</td>
                <td>{{ user.total_bookings }}</td>
                <td>
                  <span class="badge" :class="user.status === 'active' ? 'bg-success' : 'bg-danger'">{{ user.status }}</span>
                </td>
                <td>{{ user.created_at.substring(0, 10) }}</td>
                <td>
                  <button v-if="user.status === 'active'" class="btn btn-sm btn-outline-danger" @click="toggleStatus(user, 'blacklisted')">Blacklist</button>
                  <button v-else class="btn btn-sm btn-outline-success" @click="toggleStatus(user, 'active')">Activate</button>
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
      users: [], loading: false, searchQuery: ""
    };
  },

  created() {
    this.fetchUsers();
  },

  methods: {
    async fetchUsers() {
      this.loading = true;
      const q = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : "";
      const r = await fetch(`/api/admin/users${q}`, { credentials: "include" });
      this.users = await r.json();
      this.loading = false;
    },

    async toggleStatus(user, newStatus) {
      if (!window.confirm(`${newStatus === "blacklisted" ? "Blacklist" : "Activate"} ${user.name}?`)) return;
      await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      this.fetchUsers();
    }
  }
};
