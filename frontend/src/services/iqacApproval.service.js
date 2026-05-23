import { Api } from '../api/Api.js';

class IqacApprovalService {
  constructor() {
    this.api = new Api(import.meta.env.VITE_BASEURL);
  }

  async createApprovalRequest(resourceId, payload, files = {}) {
    const formData = new FormData();
    formData.append('resource_id', resourceId);
    formData.append('payload', JSON.stringify(payload));

    Object.entries(files || {}).forEach(([fieldName, file]) => {
      if (file) {
        formData.append(fieldName, file);
      }
    });

    return await this.api.post('/iqac-approvals', formData, {
      'Content-Type': 'multipart/form-data'
    });
  }

  async getMyApprovals() {
    return await this.api.get('/iqac-approvals/mine');
  }

  async getSubmittedApprovals() {
    return await this.api.get('/iqac-approvals');
  }

  async decideApproval(id, action, comment = '', correctedPayload = null) {
    return await this.api.post(`/iqac-approvals/${id}/decision`, {
      action,
      comment,
      ...(correctedPayload ? { corrected_payload: correctedPayload } : {})
    });
  }
}

export const iqacApprovalService = new IqacApprovalService();
