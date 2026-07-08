const ParticipantList = {
  name: "ParticipantList",
  props: ["trek"],

  template: `
    <div>
      <div class="mb-3">
        <button class="btn btn-sm btn-secondary" @click="$emit('back')">
          &larr; Back to My Treks
        </button>
        <span class="ms-3 fw-bold">{{ trek.name }} &mdash; Participants</span>
        <span class="ms-2 text-muted small">({{ trek.location }})</span>
      </div>

      <div class="alert alert-light border d-flex gap-4 mb-3 py-2">
        <span><strong>Total Slots:</strong> {{ trek.total_slots }}</span>
        <span><strong>Available:</strong>
          <span :class="trek.available_slots === 0 ? 'text-danger' : ''">
            {{ trek.available_slots }}
          </span>
        </span>
        <span><strong>Registered:</strong> {{ participants.length }}</span>
        <span><strong>Trek Status:</strong>
          <span class="badge"
            :class="{
              'bg-success': trek.status === 'Open',
              'bg-warning text-dark': trek.status === 'Closed',
              'bg-dark': trek.status === 'Completed',
              'bg-primary': trek.status === 'Approved',
              'bg-secondary': trek.status === 'Pending'
            }">
            {{ trek.status }}
          </span>
        </span>
      </div>

      <p v-if="loading">Loading participants...</p>
      <div v-else-if="participants.length === 0" class="alert alert-info">
        No registered participants for this trek yet.
      </div>

      <div v-else class="table-responsive">
        <table class="table table-striped table-hover table-sm">
          <thead class="table-dark">
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Booked On</th>
              <th>Booking Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in participants" :key="p.booking_id">
              <td>{{ idx + 1 }}</td>
              <td>{{ p.user_name }}</td>
              <td>{{ p.user_email }}</td>
              <td>{{ p.user_phone || '—' }}</td>
              <td>{{ p.booking_date.substring(0, 10) }}</td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-primary': p.booking_status === 'Booked',
                    'bg-success': p.booking_status === 'Completed',
                    'bg-danger': p.booking_status === 'Cancelled'
                  }">
                  {{ p.booking_status }}
                </span>
              </td>
              <td>
                <span class="badge"
                  :class="{
                    'bg-warning text-dark': p.payment_status === 'Pending',
                    'bg-success': p.payment_status === 'Paid'
                  }">
                  {{ p.payment_status }}
                </span>
              </td>
              <td>
                <span v-if="p.booking_status === 'Booked'" class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-success"
                    @click="updateBookingStatus(p, 'Completed')"
                    title="Mark as Completed">
                    &check; Done
                  </button>
                  <button class="btn btn-sm btn-outline-danger"
                    @click="updateBookingStatus(p, 'Cancelled')"
                    title="Cancel this booking">
                    &times; Cancel
                  </button>
                </span>
                <span v-else class="text-muted small">&mdash;</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="feedbackMsg" class="alert alert-success mt-2 py-2">
        {{ feedbackMsg }}
      </div>
      <div v-if="errorMsg" class="alert alert-danger mt-2 py-2">
        {{ errorMsg }}
      </div>
    </div>
  `,

  emits: ["back"],

  data() {
    return {
      participants: [],
      loading: false,
      feedbackMsg: "",
      errorMsg: "",
    };
  },

  created() {
    this.fetchParticipants();
  },

  watch: {
    "trek.id"() {
      this.fetchParticipants();
    },
  },

  methods: {
    async fetchParticipants() {
      this.loading = true;
      const r = await fetch(`/api/staff/treks/${this.trek.id}/participants`, {
        credentials: "include",
      });
      this.participants = await r.json();
      this.loading = false;
    },

    async updateBookingStatus(participant, newStatus) {
      this.feedbackMsg = "";
      this.errorMsg = "";
      const confirmMsg =
        newStatus === "Completed"
          ? `Mark ${participant.user_name} as Completed?`
          : `Cancel ${participant.user_name}'s booking? This will restore a slot.`;
      if (!window.confirm(confirmMsg)) return;

      const r = await fetch(
        `/api/staff/treks/${this.trek.id}/participants/${participant.booking_id}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await r.json();
      if (!r.ok) {
        this.errorMsg = data.error;
        return;
      }
      this.feedbackMsg = `Booking updated to ${newStatus}.`;
      this.fetchParticipants();
    },
  },
};
