const Event = require('../models/Event');
const SubEvent = require('../models/SubEvent');
const Registration = require('../models/Registration');
const Revenue = require('../models/Revenue');
const { validationResult } = require('express-validator');

// Event CRUD Operations
exports.createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const eventData = {
      ...req.body,
      createdBy: req.user.id
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const { year, status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('subEvents')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(filter);

    res.json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalEvents: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate({
        path: 'subEvents',
        populate: {
          path: 'registrations',
          populate: {
            path: 'student',
            select: 'fullName email'
          }
        }
      });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event has registrations
    const registrationsCount = await Registration.countDocuments({ event: req.params.id });
    if (registrationsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete event with existing registrations'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

// Sub-Event CRUD Operations
exports.createSubEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const subEventData = {
      ...req.body,
      createdBy: req.user.id
    };

    const subEvent = await SubEvent.create(subEventData);

    // Add sub-event to parent event
    await Event.findByIdAndUpdate(
      req.body.event,
      { $push: { subEvents: subEvent._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Sub-event created successfully',
      data: subEvent
    });
  } catch (error) {
    console.error('Create sub-event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-event',
      error: error.message
    });
  }
};

exports.getSubEventsByEvent = async (req, res) => {
  try {
    const subEvents = await SubEvent.find({ event: req.params.eventId })
      .populate('event', 'name year')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: subEvents
    });
  } catch (error) {
    console.error('Get sub-events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-events',
      error: error.message
    });
  }
};

exports.updateSubEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const subEvent = await SubEvent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('event', 'name year');

    if (!subEvent) {
      return res.status(404).json({
        success: false,
        message: 'Sub-event not found'
      });
    }

    res.json({
      success: true,
      message: 'Sub-event updated successfully',
      data: subEvent
    });
  } catch (error) {
    console.error('Update sub-event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-event',
      error: error.message
    });
  }
};

exports.deleteSubEvent = async (req, res) => {
  try {
    const subEvent = await SubEvent.findById(req.params.id);

    if (!subEvent) {
      return res.status(404).json({
        success: false,
        message: 'Sub-event not found'
      });
    }

    // Check if sub-event has registrations
    const registrationsCount = await Registration.countDocuments({ subEvent: req.params.id });
    if (registrationsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sub-event with existing registrations'
      });
    }

    // Remove from parent event
    await Event.findByIdAndUpdate(
      subEvent.event,
      { $pull: { subEvents: req.params.id } }
    );

    await SubEvent.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Sub-event deleted successfully'
    });
  } catch (error) {
    console.error('Delete sub-event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-event',
      error: error.message
    });
  }
};

// Registration Operations
exports.registerForEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subEventId } = req.body;

    // Check if sub-event exists and is active
    const subEvent = await SubEvent.findById(subEventId);
    if (!subEvent) {
      return res.status(404).json({
        success: false,
        message: 'Sub-event not found'
      });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      student: req.user.id,
      subEvent: subEventId
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this sub-event'
      });
    }

    const registration = await Registration.create({
      student: req.user.id,
      event: subEvent.event,
      subEvent: subEventId
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

exports.getStudentRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.user.id })
      .populate('event', 'name year startDate endDate status')
      .populate('subEvent', 'name registrationFee maxParticipants')
      .sort({ registrationDate: -1 });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
};

exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('student', 'fullName email')
     .populate('subEvent', 'name');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // If marking as attended, set attendedAt
    if (status === 'attended' && !registration.attendedAt) {
      registration.attendedAt = new Date();
      await registration.save();
    }

    res.json({
      success: true,
      message: 'Registration status updated',
      data: registration
    });
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registration',
      error: error.message
    });
  }
};
