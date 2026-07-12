const MyBookings = {
  name: "MyBookings",

  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">My Bookings & History</h5>

        <div class="btn-group btn-group-sm">
          <button class="btn"
            v-for="tab in statusTabs" :key="tab.value"
            :class="activeTab === tab.value
              ? 'btn-dark' : 'btn-outline-secondary'"
            @click="setTab(tab.value)">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="mb-3">
        <button class="btn btn-sm btn-outline-primary"
                :disabled="exporting"
                @click="startExport()">
          {{ exporting ? 'Preparing export...' : '⬇ Export as CSV' }}
        </button>
        <div v-if="exportMsg" class="alert mt-2 py-2"
             :class="exportError ? 'alert-danger' : 'alert-success'">
          {{ exportMsg }}
          <a v-if="exportDownloadUrl" :href="exportDownloadUrl"
             class="alert-link ms-2" target="_blank">Download CSV</a>
        </div>
      </div>

      <p v-if="loading" class="text-muted">Loading bookings...</p>

      <div v-else-if="bookings.length === 0" class="alert alert-info">
        <span v-if="activeTab === 'all'">
          You have no booking history yet. Browse available treks to get started!
        </span>
        <span v-else>
          No {{ activeTab.toLowerCase() }} bookings found.
        </span>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-dark">
            <tr>
              <th>#</th>
              <th>Trek</th>
              <th>Location</th>
              <th>Difficulty</th>
              <th>Duration</th>
              <th>Start Date</th>
              <th>Booked On</th>
              <th>Trek Status</th>
              <th>Booking Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in bookings" :key="b.booking_id">
              <td>{{ idx + 1 }}</td>
              <td>{{ b.trek_name }}</td>
              <td>{{ b.trek_location }}</td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-success': b.trek_difficulty === 'Easy',
                    'bg-warning text-dark': b.trek_difficulty === 'Moderate',
                    'bg-danger': b.trek_difficulty === 'Hard'
                  }">
                  {{ b.trek_difficulty }}
                </span>
              </td>
              <td>{{ b.trek_duration_days }}d</td>
              <td>{{ b.trek_start_date
                ? b.trek_start_date.substring(0,10) : 'TBD' }}</td>
              <td>{{ b.booking_date.substring(0,10) }}</td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-secondary': b.trek_status === 'Pending',
                    'bg-primary': b.trek_status === 'Approved',
                    'bg-success': b.trek_status === 'Open',
                    'bg-warning text-dark': b.trek_status === 'Closed',
                    'bg-dark': b.trek_status === 'Completed'
                  }">
                  {{ b.trek_status }}
                </span>
              </td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-primary': b.booking_status === 'Booked',
                    'bg-success': b.booking_status === 'Completed',
                    'bg-danger': b.booking_status === 'Cancelled'
                  }">
                  {{ b.booking_status }}
                </span>
              </td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-warning text-dark': b.payment_status === 'Pending',
                    'bg-success': b.payment_status === 'Paid'
                  }">
                  {{ b.payment_status }}
                </span>
              </td>
              <td>
                <button v-if="b.booking_status === 'Booked'"
                  class="btn btn-sm btn-outline-danger"
                  @click="cancelBooking(b)">
                  Cancel
                </button>
                <span v-else class="text-muted small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="feedbackMsg"
           class="alert mt-2 py-2"
           :class="feedbackError ? 'alert-danger' : 'alert-success'">
        {{ feedbackMsg }}
      </div>
    </div>
  `,

  data() {
    return {
      bookings: [],
      loading: false,
      activeTab: "all",
      statusTabs: [
        { label: "All", value: "all" },
        { label: "Booked", value: "Booked" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" }
      ],
      feedbackMsg: "",
      feedbackError: false,
      exporting: false,
      exportMsg: "",
      exportError: false,
      exportDownloadUrl: null,
      exportPollTimer: null
    }
  },

  created() { this.fetchBookings() },

  beforeUnmount() {
    if (this.exportPollTimer) clearTimeout(this.exportPollTimer)
  },

  methods: {
    setTab(value) {
      this.activeTab = value
      this.fetchBookings()
    },

    async fetchBookings() {
      this.loading = true
      this.feedbackMsg = ""
      const qs = this.activeTab !== "all"
        ? `?status=${this.activeTab}` : ""
      const r = await fetch(`/api/user/bookings${qs}`,
        { credentials: "include" })
      this.bookings = await r.json()
      this.loading = false
    },

    async cancelBooking(booking) {
      if (!window.confirm(
        `Cancel your booking for "${booking.trek_name}"? ` +
        `A slot will be restored.`)) return

      this.feedbackMsg = ""
      const r = await fetch(
        `/api/user/bookings/${booking.booking_id}/cancel`,
        { method: "PUT", credentials: "include" }
      )
      const data = await r.json()
      if (!r.ok) {
        this.feedbackMsg = data.error
        this.feedbackError = true
        return
      }
      this.feedbackMsg = data.message
      this.feedbackError = false
      this.fetchBookings()
    },

    async startExport() {
      this.exporting = true
      this.exportMsg = ""
      this.exportDownloadUrl = null
      const r = await fetch("/api/user/export-bookings", {
        method: "POST", credentials: "include"
      })
      const data = await r.json()
      if (!r.ok) {
        this.exportMsg = data.error
        this.exportError = true
        this.exporting = false
        return
      }
      this.pollExportStatus(data.job_id, 0)
    },

    pollExportStatus(jobId, attempt) {
      if (attempt > 30) {   // ~60 seconds max
        this.exporting = false
        this.exportMsg = "Export is taking longer than expected. Please try again shortly."
        this.exportError = true
        return
      }
      this.exportPollTimer = setTimeout(async () => {
        const r = await fetch(`/api/user/export-bookings/${jobId}/status`,
          { credentials: "include" })
        const data = await r.json()
        if (data.status === "Completed") {
          this.exporting = false
          this.exportMsg = "Your export is ready!"
          this.exportError = false
          this.exportDownloadUrl = data.download_url
        } else if (data.status === "Failed") {
          this.exporting = false
          this.exportMsg = "Export failed: " + (data.error_message || "unknown error")
          this.exportError = true
        } else {
          this.pollExportStatus(jobId, attempt + 1)
        }
      }, 2000)
    }
  }
}
