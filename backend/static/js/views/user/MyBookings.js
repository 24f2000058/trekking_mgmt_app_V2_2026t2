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
      feedbackError: false
    }
  },

  created() { this.fetchBookings() },

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
    }
  }
}
