const UserDashboard = {
  name: "UserDashboard",
  components: { TrekBrowser, MyBookings, EditProfile },

  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Trekker Dashboard</h2>
        <span class="text-muted small">Welcome, {{ userName }}</span>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card text-white bg-success">
            <div class="card-body text-center py-2">
              <h4>{{ stats.active_bookings }}</h4>
              <div class="small">Active Bookings</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-white bg-dark">
            <div class="card-body text-center py-2">
              <h4>{{ stats.completed_treks }}</h4>
              <div class="small">Completed Treks</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-white bg-secondary">
            <div class="card-body text-center py-2">
              <h4>{{ stats.total_bookings }}</h4>
              <div class="small">Total Bookings (all time)</div>
            </div>
          </div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a class="nav-link" href="#"
            :class="{ active: currentTab === 'browse' }"
            @click.prevent="currentTab = 'browse'">
            Browse Treks
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#"
            :class="{ active: currentTab === 'bookings' }"
            @click.prevent="currentTab = 'bookings'">
            My Bookings
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#"
            :class="{ active: currentTab === 'profile' }"
            @click.prevent="currentTab = 'profile'">
            Edit Profile
          </a>
        </li>
      </ul>

      <div class="card shadow-sm">
        <div class="card-body">
          <TrekBrowser  v-if="currentTab === 'browse'"
            @booked="refreshStats()" />
          <MyBookings   v-if="currentTab === 'bookings'" />
          <EditProfile  v-if="currentTab === 'profile'" />
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      currentTab: "browse",
      userName: "",
      stats: {
        active_bookings: "...",
        completed_treks: "...",
        total_bookings: "..."
      }
    }
  },

  created() {
    this.fetchStats()
    this.fetchName()
  },

  methods: {
    async fetchName() {
      const r = await fetch("/api/user/profile", { credentials: "include" })
      if (r.ok) {
        const data = await r.json()
        this.userName = data.name
      }
    },

    async fetchStats() {
      const r = await fetch("/api/user/bookings", { credentials: "include" })
      if (!r.ok) return
      const bookings = await r.json()
      this.stats.total_bookings = bookings.length
      this.stats.active_bookings = bookings.filter(
        b => b.booking_status === "Booked").length
      this.stats.completed_treks = bookings.filter(
        b => b.booking_status === "Completed").length
    },

    refreshStats() {
      this.fetchStats()
    }
  }
}
