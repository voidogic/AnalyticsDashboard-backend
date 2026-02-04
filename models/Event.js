const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      maxlength: [100, 'Event name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    year: {
      type: Number,
      required: [true, 'Event year is required'],
      min: [2020, 'Year must be 2020 or later'],
      max: [2030, 'Year cannot be beyond 2030']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(value) {
          return value >= this.startDate;
        },
        message: 'End date must be after or equal to start date'
      }
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    totalBudget: {
      type: Number,
      required: [true, 'Total budget is required'],
      min: [0, 'Budget cannot be negative']
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
    subEvents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubEvent'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for total revenue
eventSchema.virtual('totalRevenue', {
  ref: 'Revenue',
  localField: '_id',
  foreignField: 'event',
  justOne: false,
  options: { match: { status: 'paid' } }
});

// Virtual for total registrations
eventSchema.virtual('totalRegistrations', {
  ref: 'Registration',
  localField: '_id',
  foreignField: 'event',
  count: true
});

// Index for efficient queries
eventSchema.index({ year: 1, status: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Event', eventSchema);
