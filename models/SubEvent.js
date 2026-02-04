const mongoose = require('mongoose');

const subEventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sub-event name is required'],
      trim: true,
      maxlength: [100, 'Sub-event name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Sub-event description is required'],
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Parent event is required']
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function(value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Maximum participants is required'],
      min: [1, 'At least 1 participant required'],
      max: [1000, 'Maximum 1000 participants allowed']
    },
    registrationFee: {
      type: Number,
      required: [true, 'Registration fee is required'],
      min: [0, 'Registration fee cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        message: 'Status must be upcoming, ongoing, completed, or cancelled'
      },
      default: 'upcoming'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    registrations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for current participants count
subEventSchema.virtual('currentParticipants', {
  ref: 'Registration',
  localField: '_id',
  foreignField: 'subEvent',
  count: true
});

// Virtual for available spots
subEventSchema.virtual('availableSpots').get(function() {
  return this.maxParticipants - (this.registrations?.length || 0);
});

// Index for efficient queries
subEventSchema.index({ event: 1, status: 1 });
subEventSchema.index({ startTime: 1 });
subEventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('SubEvent', subEventSchema);
