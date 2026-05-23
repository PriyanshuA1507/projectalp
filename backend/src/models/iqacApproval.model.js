import mongoose from 'mongoose';

const IqacApprovalSchema = new mongoose.Schema({
  resource_id: {
    type: String,
    required: true,
    index: true
  },
  resource_title: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Untitled record'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  faculty_ids: [{
    type: String,
    required: true
  }],
  approvals: [{
    faculty_id: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comment: String,
    acted_at: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'failed'],
    default: 'pending',
    index: true
  },
  created_by: {
    user_id: String,
    name: String,
    role: String,
    department_id: String
  },
  permanent_record_id: String,
  finalization_error: String,
  finalized_at: Date
}, {
  timestamps: true,
  collection: 'iqac_approval_requests'
});

IqacApprovalSchema.index({ faculty_ids: 1, status: 1 });
IqacApprovalSchema.index({ 'created_by.user_id': 1, createdAt: -1 });

export const IqacApproval = mongoose.model('IqacApproval', IqacApprovalSchema);
