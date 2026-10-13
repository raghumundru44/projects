const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['citizen', 'officer', 'admin']).default('citizen'),
  department: z.string().max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const complaintSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['Pothole/Road Damage', 'Garbage', 'Water Leakage', 'Drainage', 'Streetlight', 'Other']),
  location_text: z.string().min(3).max(500),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'RESOLVED', 'REOPENED']),
  note: z.string().max(500).optional()
});

const routingRuleSchema = z.object({
  category: z.enum(['Pothole/Road Damage', 'Garbage', 'Water Leakage', 'Drainage', 'Streetlight', 'Other']),
  area_pattern: z.string().max(200).optional(),
  office_name: z.string().min(2).max(200),
  department: z.string().min(2).max(100),
  priority: z.coerce.number().int().min(1).max(10).default(1),
  demo_target_days: z.coerce.number().int().min(1).max(365).default(7),
  notes: z.string().max(500).optional()
});

const humanVerificationSchema = z.object({
  action: z.enum(['CONFIRMED', 'DISPUTED']),
  dispute_reason: z.string().max(1000).optional()
}).refine(data => {
  if (data.action === 'DISPUTED' && (!data.dispute_reason || data.dispute_reason.trim().length < 5)) {
    return false;
  }
  return true;
}, { message: 'Dispute reason is required and must be at least 5 characters.' });

module.exports = {
  registerSchema,
  loginSchema,
  complaintSchema,
  statusUpdateSchema,
  routingRuleSchema,
  humanVerificationSchema
};
