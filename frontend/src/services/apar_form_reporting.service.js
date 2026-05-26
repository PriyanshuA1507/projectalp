import { Api } from '../api/Api.js'

class AparFormReportingService {
  constructor() {
    this.api = new Api(import.meta.env.VITE_BASEURL)
  }

  async submit(form) {
    return this.api.post('/apar/mongo/reporting/submit', form) // Sending flattened body
  }

  async getAssigned(ay, archive = false) {
    let endpoint = `/apar/mongo/reporting/pending?archive=${archive}`
    if (ay) endpoint += `&ay=${encodeURIComponent(ay)}`
    return this.api.get(endpoint)
  }

  async getPendingReviews(ay, archive = false) {
    let endpoint = `/apar/mongo/reviewing/pending?archive=${archive}`
    if (ay) endpoint += `&ay=${encodeURIComponent(ay)}`
    return this.api.get(endpoint)
  }

  async getDeanStatus(ay, departmentId) {
    if (!ay) throw new Error('Academic year is required')
    let endpoint = `/apar/mongo/dean/status?ay=${encodeURIComponent(ay)}`
    if (departmentId) endpoint += `&department_id=${encodeURIComponent(departmentId)}`
    return this.api.get(endpoint)
  }

  async submitReview(form) {
    return this.api.post('/apar/mongo/reviewing/submit', form)
  }

  async getForm(facultyId, ay) {
    return this.api.get(`/apar/mongo/form?faculty_id=${encodeURIComponent(facultyId)}&ay=${encodeURIComponent(ay)}`)
  }

  async getCombined(gradedId, ay) {
    if (!gradedId || !ay) throw new Error('gradedId and ay are required')
    return this.getForm(gradedId, ay)
  }

  async getFacultyHistoryByDean(facultyId, ay) {
    if (!facultyId) throw new Error('Faculty ID is required')
    let endpoint = `/apar/mongo/dean/history?faculty_id=${encodeURIComponent(facultyId)}`
    if (ay) endpoint += `&ay=${encodeURIComponent(ay)}`
    return this.api.get(endpoint)
  }
}

export const aparFormReportingService = new AparFormReportingService()
