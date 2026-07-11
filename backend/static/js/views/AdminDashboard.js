const AdminDashboard = {
  name: "AdminDashboard",
  components: {
    TrekManagement,
    StaffManagement,
    UserManagement,
    BookingManagement
  },

  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <span class="text-muted">System Admin</span>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card text-white bg-primary">
            <div class="card-body">
              <h3 class="card-title">{{ stats ? stats.total_treks : '...' }}</h3>
              <div>Total Treks</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-success">
            <div class="card-body">
              <h3 class="card-title">{{ stats ? stats.total_users : '...' }}</h3>
              <div>Total Trekkers</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-info">
            <div class="card-body">
              <h3 class="card-title">{{ stats ? stats.total_staff : '...' }}</h3>
              <div>Total Staff</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-warning text-dark">
            <div class="card-body">
              <h3 class="card-title">{{ stats ? stats.total_bookings : '...' }}</h3>
              <div>Total Bookings</div>
            </div>
          </div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='overview'}" @click.prevent="currentTab='overview'" href="#">Overview</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='treks'}" @click.prevent="currentTab='treks'" href="#">Treks</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='staff'}" @click.prevent="currentTab='staff'" href="#">Staff</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='users'}" @click.prevent="currentTab='users'" href="#">Users</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='bookings'}" @click.prevent="currentTab='bookings'" href="#">Bookings</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='search'}" @click.prevent="currentTab='search'" href="#">Search</a></li>
        <li class="nav-item"><a class="nav-link" :class="{active: currentTab==='history'}" @click.prevent="currentTab='history'" href="#">History</a></li>
      </ul>

      <div class="tab-content">

        <div v-if="currentTab === 'overview'">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Treks by Status</h5>
                  <table class="table table-sm" v-if="stats">
                    <tbody>
                      <tr v-for="([status, count]) in Object.entries(stats.trek_by_status)" :key="status">
                        <td>{{ status }}</td>
                        <td>{{ count }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Top Treks by Bookings</h5>
                  <div v-if="!stats || stats.top_treks.length === 0">No bookings yet.</div>
                  <ol v-else>
                    <li v-for="t in stats.top_treks" :key="t.name">{{ t.name }} - {{ t.bookings }} bookings</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'treks'">
          <TrekManagement />
        </div>

        <div v-if="currentTab === 'staff'">
          <StaffManagement />
        </div>

        <div v-if="currentTab === 'users'">
          <UserManagement />
        </div>

        <div v-if="currentTab === 'bookings'">
          <BookingManagement />
        </div>

        <div v-if="currentTab === 'search'">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Search</h5>
              <div class="d-flex gap-2 mb-3">
                <input v-model="searchQuery" type="text" class="form-control" placeholder="Search...">
                <select v-model="searchType" class="form-select" style="max-width: 150px;">
                  <option value="all">All</option>
                  <option value="treks">Treks</option>
                  <option value="staff">Staff</option>
                  <option value="users">Users</option>
                </select>
                <button class="btn btn-primary" @click="doSearch">Search</button>
              </div>

              <div v-if="searchResults">
                <div v-if="searchResults.treks && searchResults.treks.length">
                  <h6>Treks</h6>
                  <table class="table table-sm">
                    <thead><tr><th>Name</th><th>Location</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr v-for="t in searchResults.treks" :key="t.id">
                        <td>{{ t.name }}</td><td>{{ t.location }}</td><td>{{ t.status }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="searchResults.users && searchResults.users.length">
                  <h6>Users</h6>
                  <table class="table table-sm">
                    <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr v-for="u in searchResults.users" :key="u.id">
                        <td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.status }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="searchResults.staff && searchResults.staff.length">
                  <h6>Staff</h6>
                  <table class="table table-sm">
                    <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr v-for="s in searchResults.staff" :key="s.id">
                        <td>{{ s.name }}</td><td>{{ s.email }}</td><td>{{ s.status }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="alert alert-info" v-if="!hasAnyResults">No results found.</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'history'">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Completed Trek History</h5>
              <p v-if="historyList.length === 0" class="alert alert-info">
                No completed treks yet.
              </p>
              <table v-else class="table table-striped table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>Trek</th><th>Location</th><th>Staff</th>
                    <th>Start</th><th>End</th>
                    <th>Completed</th><th>Cancelled</th><th>Total Booked</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in historyList" :key="h.trek_id">
                    <td>{{ h.name }}</td>
                    <td>{{ h.location }}</td>
                    <td>{{ h.assigned_staff_name || '—' }}</td>
                    <td>{{ h.start_date ? h.start_date.substring(0,10) : '—' }}</td>
                    <td>{{ h.end_date ? h.end_date.substring(0,10) : '—' }}</td>
                    <td><span class="badge bg-success">{{ h.completed_count }}</span></td>
                    <td><span class="badge bg-danger">{{ h.cancelled_count }}</span></td>
                    <td>{{ h.total_ever_booked }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,

  data() {
    return {
      currentTab: "overview",
      stats: null,
      searchQuery: "",
      searchType: "all",
      searchResults: null,
      historyList: []
    };
  },

  computed: {
    hasAnyResults() {
      if (!this.searchResults) return false;
      return ["treks", "users", "staff"].some(
        key => this.searchResults[key] && this.searchResults[key].length > 0
      );
    }
  },

  created() {
    this.fetchStats();
    this.fetchHistory();
  },

  methods: {
    async fetchStats() {
      const r = await fetch("/api/admin/stats", { credentials: "include" });
      this.stats = await r.json();
    },

    async fetchHistory() {
      const r = await fetch("/api/admin/history", { credentials: "include" });
      this.historyList = await r.json();
    },

    async doSearch() {
      if (!this.searchQuery.trim()) return;
      const r = await fetch(
        `/api/admin/search?q=${encodeURIComponent(this.searchQuery)}&type=${this.searchType}`,
        { credentials: "include" }
      );
      this.searchResults = await r.json();
    }
  }
};
