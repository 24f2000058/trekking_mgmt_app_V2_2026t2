const TrekBrowser = {
  name: "TrekBrowser",

  template: `
    <div>
      <h5 class="mb-3">Browse Available Treks</h5>

      <div class="card mb-3 bg-light">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">

            <div class="col-md-3">
              <label class="form-label small mb-1">Search</label>
              <input class="form-control form-control-sm"
                v-model="filters.search"
                placeholder="Name or location..."
                @keyup.enter="fetchTreks()" />
            </div>

            <div class="col-md-2">
              <label class="form-label small mb-1">Difficulty</label>
              <select class="form-select form-select-sm"
                      v-model="filters.difficulty">
                <option value="">All</option>
                <option>Easy</option>
                <option>Moderate</option>
                <option>Hard</option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small mb-1">Location</label>
              <input class="form-control form-control-sm"
                v-model="filters.location"
                placeholder="Filter by location..." />
            </div>

            <div class="col-md-2">
              <label class="form-label small mb-1">Duration (days)</label>
              <input class="form-control form-control-sm" type="number"
                v-model="filters.duration" min="1"
                placeholder="Exact days" />
            </div>

            <div class="col-md-3 d-flex gap-2">
              <button class="btn btn-sm btn-primary"
                      @click="fetchTreks()">
                Search
              </button>
              <button class="btn btn-sm btn-outline-secondary"
                      @click="clearFilters()">
                Clear
              </button>
            </div>

          </div>
        </div>
      </div>

      <p v-if="loading" class="text-muted">Loading treks...</p>

      <div v-else-if="treks.length === 0" class="alert alert-info">
        No open treks found. Try adjusting your filters or check back later.
      </div>

      <div v-else class="row g-3">
        <div v-for="trek in treks" :key="trek.id" class="col-md-6">
          <div class="card h-100 shadow-sm">

            <div class="card-header d-flex justify-content-between
                        align-items-center">
              <strong>{{ trek.name }}</strong>
              <span class="badge"
                :class="{
                  'bg-success': trek.difficulty === 'Easy',
                  'bg-warning text-dark': trek.difficulty === 'Moderate',
                  'bg-danger': trek.difficulty === 'Hard'
                }">
                {{ trek.difficulty }}
              </span>
            </div>

            <div class="card-body">

              <div class="row text-muted small mb-2">
                <div class="col-6">
                  <strong>Location:</strong> {{ trek.location }}
                </div>
                <div class="col-6">
                  <strong>Duration:</strong> {{ trek.duration_days }} days
                </div>
              </div>

              <div class="row text-muted small mb-2">
                <div class="col-6">
                  <strong>Start:</strong>
                  {{ trek.start_date ? trek.start_date.substring(0,10) : 'TBD' }}
                </div>
                <div class="col-6">
                  <strong>End:</strong>
                  {{ trek.end_date ? trek.end_date.substring(0,10) : 'TBD' }}
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span>Available Slots</span>
                  <span :class="trek.available_slots === 0
                    ? 'text-danger fw-bold' : 'text-success fw-bold'">
                    {{ trek.available_slots }} / {{ trek.total_slots }}
                  </span>
                </div>
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar"
                    :class="trek.available_slots === 0
                      ? 'bg-danger' : 'bg-success'"
                    :style="{ width: slotPercent(trek) + '%' }">
                  </div>
                </div>
              </div>

              <p v-if="trek.description"
                 class="small text-muted mb-2"
                 style="display: -webkit-box; -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical; overflow: hidden;">
                {{ trek.description }}
              </p>

              <div v-if="bookingMsg[trek.id]"
                   class="alert py-1 px-2 small mb-2"
                   :class="bookingError[trek.id]
                     ? 'alert-danger' : 'alert-success'">
                {{ bookingMsg[trek.id] }}
              </div>

            </div>

            <div class="card-footer bg-transparent">

              <span v-if="trek.is_booked"
                    class="badge bg-primary fs-6 py-2 px-3">
                ✓ Already Booked
              </span>

              <span v-else-if="trek.available_slots === 0"
                    class="badge bg-secondary fs-6 py-2 px-3">
                Fully Booked
              </span>

              <button v-else
                class="btn btn-success"
                :disabled="bookingInProgress[trek.id]"
                @click="bookTrek(trek)">
                {{ bookingInProgress[trek.id] ? 'Booking...' : 'Book Now' }}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      treks: [],
      loading: false,
      filters: {
        search: "", difficulty: "", location: "", duration: ""
      },
      bookingMsg: {},
      bookingError: {},
      bookingInProgress: {}
    }
  },

  created() { this.fetchTreks() },

  methods: {
    async fetchTreks() {
      this.loading = true
      const params = new URLSearchParams()
      if (this.filters.search)     params.append("search", this.filters.search)
      if (this.filters.difficulty) params.append("difficulty", this.filters.difficulty)
      if (this.filters.location)   params.append("location", this.filters.location)
      if (this.filters.duration)   params.append("duration", this.filters.duration)
      const qs = params.toString() ? "?" + params.toString() : ""
      const r = await fetch(`/api/user/treks${qs}`, { credentials: "include" })
      this.treks = await r.json()
      this.loading = false
    },

    clearFilters() {
      this.filters = { search: "", difficulty: "", location: "", duration: "" }
      this.fetchTreks()
    },

    slotPercent(trek) {
      if (trek.total_slots === 0) return 0
      return Math.round((trek.available_slots / trek.total_slots) * 100)
    },

    async bookTrek(trek) {
      this.bookingMsg = { ...this.bookingMsg, [trek.id]: "" }
      this.bookingError = { ...this.bookingError, [trek.id]: false }
      this.bookingInProgress = { ...this.bookingInProgress, [trek.id]: true }

      const r = await fetch(`/api/user/treks/${trek.id}/book`, {
        method: "POST", credentials: "include"
      })
      const data = await r.json()

      this.bookingInProgress = { ...this.bookingInProgress, [trek.id]: false }

      if (!r.ok) {
        this.bookingMsg = { ...this.bookingMsg, [trek.id]: data.error }
        this.bookingError = { ...this.bookingError, [trek.id]: true }
        return
      }

      this.bookingMsg = { ...this.bookingMsg, [trek.id]: data.message }
      this.bookingError = { ...this.bookingError, [trek.id]: false }
      trek.is_booked = true
      trek.available_slots = Math.max(0, trek.available_slots - 1)
      this.$emit("booked")
    }
  }
}
