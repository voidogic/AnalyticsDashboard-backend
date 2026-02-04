const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required']
    },
    subEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubEvent',
      required: [true, 'Sub-event is required']
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: {
        values: ['registered', 'confirmed', 'attended', 'cancelled'],
        message: 'Status must be registered, confirmed, attended, or cancelled'
      },
      default: 'registered'
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'refunded'],
        message: 'Payment status must be pending, paid, or refunded'
      },
      default: 'pending'
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative']
    },
    attendedAt: {
      type: Date,
      default: null
    },
    certificateIssued: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate registrations
registrationSchema.index({ student: 1, subEvent: 1 }, { unique: true });

// Index for efficient queries
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ student: 1, registrationDate: -1 });
registrationSchema.index({ paymentStatus: 1 });

// Pre-save middleware to set amountPaid based on subEvent fee if paid
registrationSchema.pre('save', async function(next) {
  if (this.paymentStatus === 'paid' && this.amountPaid === 0) {
    try {
      const SubEvent = mongoose.model('SubEvent');
      const subEvent = await SubEvent.findById(this.subEvent);
      if (subEvent) {
        this.amountPaid = subEvent.registrationFee;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);
