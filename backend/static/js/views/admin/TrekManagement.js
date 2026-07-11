const TrekManagement = {
  name: "TrekManagement",

  template: `
    <div class="card">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div class="d-flex gap-2">
            <input v-model="searchQuery" type="text" class="form-control" placeholder="Search by name or location">
            <button class="btn btn-outline-secondary" @click="fetchTreks">Search</button>
            <button v-if="searchQuery" class="btn btn-outline-secondary" @click="searchQuery=''; fetchTreks()">X Clear</button>
          </div>
          <button class="btn btn-success" @click="showCreateForm = !showCreateForm">Add Trek</button>
        </div>

        <div class="card mb-3" v-if="showCreateForm">
          <div class="card-body">
            <h5 class="card-title">New Trek</h5>
            <div class="alert alert-danger" v-if="errorMsg">{{ errorMsg }}</div>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Trek Name</label>
                <input v-model="createForm.name" type="text" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Location</label>
                <input v-model="createForm.location" type="text" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Difficulty</label>
                <select v-model="createForm.difficulty" class="form-select">
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Duration (days)</label>
                <input v-model="createForm.duration_days" type="number" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Total Slots</label>
                <input v-model="createForm.total_slots" type="number" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Start Date</label>
                <input v-model="createForm.start_date" type="date" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">End Date</label>
                <input v-model="createForm.end_date" type="date" class="form-control">
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <textarea v-model="createForm.description" class="form-control"></textarea>
              </div>
            </div>
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-primary" @click="createTrek">Create Trek</button>
              <button class="btn btn-secondary" @click="showCreateForm = false; resetCreateForm()">Cancel</button>
            </div>
          </div>
        </div>

        <div class="card mb-3" v-if="editingTrek">
          <div class="card-body">
            <h5 class="card-title">Edit Trek</h5>
            <div class="alert alert-danger" v-if="editErrorMsg">{{ editErrorMsg }}</div>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Trek Name</label>
                <input v-model="editForm.name" type="text" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Location</label>
                <input v-model="editForm.location" type="text" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Difficulty</label>
                <select v-model="editForm.difficulty" class="form-select">
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Duration (days)</label>
                <input v-model="editForm.duration_days" type="number" class="form-control">
              </div>
              <div class="col-md-4">
                <label class="form-label">Total Slots</label>
                <input v-model="editForm.total_slots" type="number" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Start Date</label>
                <input v-model="editForm.start_date" type="date" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">End Date</label>
                <input v-model="editForm.end_date" type="date" class="form-control">
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select v-model="editForm.status" class="form-select">
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Available Slots</label>
                <input v-model="editForm.available_slots" type="number" class="form-control">
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <textarea v-model="editForm.description" class="form-control"></textarea>
              </div>
            </div>
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-primary" @click="updateTrek">Save Changes</button>
              <button class="btn btn-secondary" @click="editingTrek = null">Cancel</button>
            </div>
          </div>
        </div>

        <div class="card mb-3" v-if="assigningTrek">
          <div class="card-body">
            <h5 class="card-title">Assign Staff to: {{ assigningTrek.name }}</h5>
            <select v-model="selectedStaffProfileId" class="form-select mb-3">
              <option value="">Select staff...</option>
              <option v-for="s in staffList" :key="s.staff_profile_id" :value="s.staff_profile_id">{{ s.name }}</option>
            </select>
            <div class="d-flex gap-2">
              <button class="btn btn-primary" @click="assignStaff">Assign</button>
              <button class="btn btn-secondary" @click="assigningTrek = null">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="loading">Loading...</div>
        <div class="alert alert-info" v-else-if="treks.length === 0">No treks found.</div>
        <div class="table-responsive" v-else>
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Location</th><th>Difficulty</th>
                <th>Duration (days)</th><th>Slots</th><th>Status</th>
                <th>Assigned Staff</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(trek, i) in treks" :key="trek.id">
                <td>{{ i + 1 }}</td>
                <td>{{ trek.name }}</td>
                <td>{{ trek.location }}</td>
                <td>{{ trek.difficulty }}</td>
                <td>{{ trek.duration_days }}</td>
                <td :class="{'text-danger': trek.available_slots === 0}">{{ trek.available_slots }} / {{ trek.total_slots }}</td>
                <td>
                  <span class="badge" :class="{
                    'bg-secondary': trek.status === 'Pending',
                    'bg-primary': trek.status === 'Approved',
                    'bg-success': trek.status === 'Open',
                    'bg-warning': trek.status === 'Closed',
                    'bg-dark': trek.status === 'Completed'
                  }">{{ trek.status }}</span>
                </td>
                <td>{{ trek.assigned_staff_name || '-' }}</td>
                <td>
                  <div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm btn-outline-primary" @click="startEdit(trek)">Edit</button>
                    <button v-if="trek.status === 'Pending'" class="btn btn-sm btn-outline-success" @click="approveTrek(trek.id)">Approve</button>
                    <button class="btn btn-sm btn-outline-info" @click="startAssign(trek)">Assign Staff</button>
                    <button class="btn btn-sm btn-outline-danger" @click="deleteTrek(trek.id)">Delete</button>
                  </div>
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
      treks: [],
      loading: false,
      searchQuery: "",
      showCreateForm: false,
      createForm: {
        name: "", location: "", difficulty: "Easy",
        duration_days: "", total_slots: "",
        start_date: "", end_date: "", description: ""
      },
      editingTrek: null,
      editForm: {},
      assigningTrek: null,
      selectedStaffProfileId: "",
      staffList: [],
      errorMsg: "",
      editErrorMsg: ""
    };
  },

  created() {
    this.fetchTreks();
  },

  methods: {
    async fetchTreks() {
      this.loading = true;
      const q = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : "";
      const r = await fetch(`/api/admin/treks${q}`, { credentials: "include" });
      this.treks = await r.json();
      this.loading = false;
    },

    async createTrek() {
      this.errorMsg = "";
      const r = await fetch("/api/admin/treks", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.createForm)
      });
      const data = await r.json();
      if (!r.ok) { this.errorMsg = data.error; return; }
      this.showCreateForm = false;
      this.resetCreateForm();
      this.fetchTreks();
    },

    resetCreateForm() {
      this.createForm = {
        name: "", location: "", difficulty: "Easy",
        duration_days: "", total_slots: "",
        start_date: "", end_date: "", description: ""
      };
    },

    startEdit(trek) {
      this.editingTrek = trek;
      this.assigningTrek = null;
      this.editForm = {
        name: trek.name, location: trek.location,
        difficulty: trek.difficulty,
        duration_days: trek.duration_days,
        total_slots: trek.total_slots,
        available_slots: trek.available_slots,
        start_date: trek.start_date ? trek.start_date.substring(0, 10) : "",
        end_date: trek.end_date ? trek.end_date.substring(0, 10) : "",
        description: trek.description || "",
        status: trek.status
      };
    },

    async updateTrek() {
      this.editErrorMsg = "";
      const r = await fetch(`/api/admin/treks/${this.editingTrek.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.editForm)
      });
      const data = await r.json();
      if (!r.ok) { this.editErrorMsg = data.error; return; }
      this.editingTrek = null;
      this.fetchTreks();
    },

    async approveTrek(trekId) {
      await fetch(`/api/admin/treks/${trekId}/approve`, {
        method: "PUT", credentials: "include"
      });
      this.fetchTreks();
    },

    async deleteTrek(trekId) {
      if (!window.confirm("Delete this trek?")) return;
      const r = await fetch(`/api/admin/treks/${trekId}`, {
        method: "DELETE", credentials: "include"
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data.error);
        return;
      }
      this.fetchTreks();
    },

    async startAssign(trek) {
      this.assigningTrek = trek;
      this.editingTrek = null;
      this.selectedStaffProfileId = trek.assigned_staff_id || "";
      const r = await fetch("/api/admin/staff-list", { credentials: "include" });
      this.staffList = await r.json();
    },

    async assignStaff() {
      if (!this.selectedStaffProfileId) return;
      await fetch(`/api/admin/treks/${this.assigningTrek.id}/assign-staff`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_profile_id: parseInt(this.selectedStaffProfileId) })
      });
      this.assigningTrek = null;
      this.fetchTreks();
    }
  }
};
