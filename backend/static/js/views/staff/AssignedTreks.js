const AssignedTreks = {
  name: "AssignedTreks",

  template: `
    <div>
      <h5 class="mb-3">My Assigned Treks</h5>

      <p v-if="loading">Loading treks...</p>

      <div v-else-if="treks.length === 0" class="alert alert-info">
        No treks assigned to you yet. Contact admin to be assigned.
      </div>

      <div v-else>
        <div v-for="trek in treks" :key="trek.id"
             class="card mb-3 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ trek.name }}</strong>
              <span class="ms-2 badge"
                :class="{
                  'bg-secondary': trek.status === 'Pending',
                  'bg-primary': trek.status === 'Approved',
                  'bg-success': trek.status === 'Open',
                  'bg-warning text-dark': trek.status === 'Closed',
                  'bg-dark': trek.status === 'Completed'
                }">
                {{ trek.status }}
              </span>
            </div>
            <button class="btn btn-sm btn-outline-primary"
                    @click="toggleExpand(trek.id)">
              {{ expandedTrekId === trek.id ? 'Collapse' : 'Manage' }}
            </button>
          </div>

          <div class="card-body">
            <div class="row text-muted small mb-2">
              <div class="col-md-3">
                <i>Location:</i> {{ trek.location }}
              </div>
              <div class="col-md-2">
                <i>Difficulty:</i> {{ trek.difficulty }}
              </div>
              <div class="col-md-2">
                <i>Duration:</i> {{ trek.duration_days }} days
              </div>
              <div class="col-md-2">
                <i>Slots:</i>
                <span :class="trek.available_slots === 0 ? 'text-danger fw-bold' : ''">
                  {{ trek.available_slots }} / {{ trek.total_slots }}
                </span>
              </div>
              <div class="col-md-3">
                <i>Participants:</i> {{ trek.active_bookings }}
              </div>
            </div>

            <div class="text-muted small mb-2" v-if="trek.start_date">
              {{ trek.start_date }} &rarr; {{ trek.end_date }}
            </div>

            <div v-if="expandedTrekId === trek.id" class="mt-3 border-top pt-3">

              <div class="row g-2 align-items-end mb-3">
                <div class="col-auto">
                  <label class="form-label mb-1 small fw-bold">
                    Update Available Slots
                  </label>
                  <input type="number" class="form-control form-control-sm"
                    style="width: 100px"
                    v-model.number="slotInputs[trek.id]"
                    :max="trek.total_slots" min="0" />
                </div>
                <div class="col-auto">
                  <button class="btn btn-sm btn-outline-secondary"
                          @click="updateSlots(trek)">
                    Update Slots
                  </button>
                </div>
                <div class="col-auto small text-muted">
                  (max: {{ trek.total_slots }})
                </div>
              </div>

              <div class="row g-2 align-items-end mb-3">
                <div class="col-auto">
                  <label class="form-label mb-1 small fw-bold">
                    Update Trek Status
                  </label>
                  <select class="form-select form-select-sm"
                          style="width: 150px"
                          v-model="statusInputs[trek.id]">
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div class="col-auto">
                  <button class="btn btn-sm btn-outline-secondary"
                          @click="updateStatus(trek)">
                    Update Status
                  </button>
                </div>
              </div>

              <div v-if="feedbackMsg[trek.id]"
                   class="alert alert-success py-1 px-2 small">
                {{ feedbackMsg[trek.id] }}
              </div>
              <div v-if="errorMsg[trek.id]"
                   class="alert alert-danger py-1 px-2 small">
                {{ errorMsg[trek.id] }}
              </div>

              <button class="btn btn-sm btn-outline-info mt-2"
                      @click="$emit('view-participants', trek)">
                View Participant List ({{ trek.active_bookings }})
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  emits: ["view-participants"],

  data() {
    return {
      treks: [],
      loading: false,
      expandedTrekId: null,
      slotInputs: {},
      statusInputs: {},
      feedbackMsg: {},
      errorMsg: {},
    };
  },

  created() {
    this.fetchTreks();
  },

  methods: {
    async fetchTreks() {
      this.loading = true;
      const r = await fetch("/api/staff/my-treks", { credentials: "include" });
      this.treks = await r.json();
      this.treks.forEach((t) => {
        this.slotInputs[t.id] = t.available_slots;
        this.statusInputs[t.id] =
          t.status === "Pending" || t.status === "Approved" ? "Open" : t.status;
      });
      this.loading = false;
    },

    toggleExpand(trekId) {
      this.expandedTrekId = this.expandedTrekId === trekId ? null : trekId;
    },

    async updateSlots(trek) {
      this.feedbackMsg[trek.id] = "";
      this.errorMsg[trek.id] = "";
      const r = await fetch(`/api/staff/treks/${trek.id}/slots`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available_slots: this.slotInputs[trek.id] }),
      });
      const data = await r.json();
      if (!r.ok) {
        this.errorMsg[trek.id] = data.error;
        return;
      }
      this.feedbackMsg[trek.id] = "Slots updated successfully.";
      trek.available_slots = data.available_slots;
    },

    async updateStatus(trek) {
      this.feedbackMsg[trek.id] = "";
      this.errorMsg[trek.id] = "";
      const r = await fetch(`/api/staff/treks/${trek.id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: this.statusInputs[trek.id] }),
      });
      const data = await r.json();
      if (!r.ok) {
        this.errorMsg[trek.id] = data.error;
        return;
      }
      this.feedbackMsg[trek.id] = `Status updated to ${data.status}.`;
      trek.status = data.status;
    },
  },
};
