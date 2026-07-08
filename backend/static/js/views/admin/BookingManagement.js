const BookingManagement = {
  name: "BookingManagement",

  template: `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">All Bookings</h5>

        <div v-if="loading">Loading...</div>
        <div class="alert alert-info" v-else-if="bookings.length === 0">No bookings yet.</div>
        <div class="table-responsive" v-else>
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th><th>Trekker</th><th>Email</th><th>Trek</th>
                <th>Location</th><th>Booking Date</th><th>Booking Status</th><th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in bookings" :key="b.id">
                <td>{{ i + 1 }}</td>
                <td>{{ b.user_name }}</td>
                <td>{{ b.user_email }}</td>
                <td>{{ b.trek_name }}</td>
                <td>{{ b.trek_location }}</td>
                <td>{{ b.booking_date.substring(0, 10) }}</td>
                <td>
                  <span class="badge" :class="{
                    'bg-primary': b.status === 'Booked',
                    'bg-danger': b.status === 'Cancelled',
                    'bg-success': b.status === 'Completed'
                  }">{{ b.status }}</span>
                </td>
                <td>
                  <span class="badge" :class="b.payment_status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'">{{ b.payment_status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `,

  data() {
    return { bookings: [], loading: false };
  },

  created() {
    this.fetchBookings();
  },

  methods: {
    async fetchBookings() {
      this.loading = true;
      const r = await fetch("/api/admin/bookings", { credentials: "include" });
      this.bookings = await r.json();
      this.loading = false;
    }
  }
};
