const StaffDashboard = {
  name: "StaffDashboard",
  components: { AssignedTreks, ParticipantList },

  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Staff Dashboard</h2>
        <span class="text-muted small">Logged in as Trek Staff</span>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card text-white bg-primary">
            <div class="card-body text-center">
              <h3>{{ summary ? summary.total_assigned_treks : '...' }}</h3>
              <div class="small">Assigned Treks</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-white bg-success">
            <div class="card-body text-center">
              <h3>{{ summary ? summary.active_treks : '...' }}</h3>
              <div class="small">Active Treks (Approved / Open)</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-white bg-info">
            <div class="card-body text-center">
              <h3>{{ summary ? summary.total_participants : '...' }}</h3>
              <div class="small">Total Registered Participants</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body">

          <ParticipantList
            v-if="selectedTrek"
            :trek="selectedTrek"
            @back="selectedTrek = null" />

          <AssignedTreks
            v-else
            @view-participants="showParticipants" />

        </div>
      </div>
    </div>
  `,

  data() {
    return {
      summary: null,
      selectedTrek: null,
    };
  },

  created() {
    this.fetchSummary();
  },

  methods: {
    async fetchSummary() {
      const r = await fetch("/api/staff/dashboard-summary", { credentials: "include" });
      this.summary = await r.json();
    },

    showParticipants(trek) {
      this.selectedTrek = trek;
    },
  },
};
