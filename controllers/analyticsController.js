const Event = require('../models/Event');
const SubEvent = require('../models/SubEvent');
const Registration = require('../models/Registration');
const Revenue = require('../models/Revenue');
const User = require('../models/User');

// Yearly Overview Analytics
exports.getYearlyOverview = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Total Events in the year
    const totalEvents = await Event.countDocuments({ year: targetYear });

    // Total Registered Students (unique students who registered for any event in the year)
    const registeredStudents = await Registration.distinct('student', {
      event: { $in: await Event.find({ year: targetYear }).distinct('_id') }
    });

    // Total Students Appeared (attended any sub-event)
    const appearedStudents = await Registration.distinct('student', {
      status: 'attended',
      event: { $in: await Event.find({ year: targetYear }).distinct('_id') }
    });

    // Total Revenue Generated
    const totalRevenue = await Revenue.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $match: {
          'event.year': targetYear,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const revenueAmount = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.json({
      success: true,
      data: {
        year: targetYear,
        totalEvents,
        totalRegisteredStudents: registeredStudents.length,
        totalAppearedStudents: appearedStudents.length,
        totalRevenue: revenueAmount
      }
    });
  } catch (error) {
    console.error('Yearly overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yearly overview',
      error: error.message
    });
  }
};

// Event-wise Analytics
exports.getEventAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get all sub-events for this event
    const subEvents = await SubEvent.find({ event: eventId });

    // Analytics for each sub-event
    const subEventAnalytics = await Promise.all(
      subEvents.map(async (subEvent) => {
        const registrations = await Registration.find({
          subEvent: subEvent._id
        }).populate('student', 'fullName email');

        const totalRegistrations = registrations.length;
        const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
        const attendedCount = registrations.filter(r => r.status === 'attended').length;
        const revenue = registrations
          .filter(r => r.paymentStatus === 'paid')
          .reduce((sum, r) => sum + r.amountPaid, 0);

        return {
          subEventId: subEvent._id,
          subEventName: subEvent.name,
          totalRegistrations,
          confirmedRegistrations: confirmedCount,
          attendedParticipants: attendedCount,
          revenue,
          maxParticipants: subEvent.maxParticipants,
          registrationFee: subEvent.registrationFee
        };
      })
    );

    // Overall event analytics
    const totalRevenue = subEventAnalytics.reduce((sum, se) => sum + se.revenue, 0);
    const totalRegistrations = subEventAnalytics.reduce((sum, se) => sum + se.totalRegistrations, 0);
    const totalAttended = subEventAnalytics.reduce((sum, se) => sum + se.attendedParticipants, 0);

    res.json({
      success: true,
      data: {
        event: {
          id: event._id,
          name: event.name,
          year: event.year,
          status: event.status
        },
        overall: {
          totalSubEvents: subEvents.length,
          totalRegistrations,
          totalAttended,
          totalRevenue,
          revenuePerEvent: totalRevenue / subEvents.length || 0
        },
        subEvents: subEventAnalytics
      }
    });
  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event analytics',
      error: error.message
    });
  }
};

// Chart Data for Yearly Trends
exports.getYearlyTrends = async (req, res) => {
  try {
    const { years = 5 } = req.query;
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - parseInt(years) + 1;

    const yearlyData = [];

    for (let year = startYear; year <= currentYear; year++) {
      const events = await Event.find({ year });
      const eventIds = events.map(e => e._id);

      // Total events
      const totalEvents = events.length;

      // Total registrations
      const totalRegistrations = await Registration.countDocuments({
        event: { $in: eventIds }
      });

      // Total appeared
      const totalAppeared = await Registration.countDocuments({
        event: { $in: eventIds },
        status: 'attended'
      });

      // Total revenue
      const revenueData = await Revenue.aggregate([
        {
          $match: {
            event: { $in: eventIds },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

      yearlyData.push({
        year,
        totalEvents,
        totalRegistrations,
        totalAppeared,
        totalRevenue
      });
    }

    res.json({
      success: true,
      data: yearlyData
    });
  } catch (error) {
    console.error('Yearly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yearly trends',
      error: error.message
    });
  }
};

// Participation Ratio Pie Chart Data
exports.getParticipationRatio = async (req, res) => {
  try {
    const { eventId } = req.params;

    const registrations = await Registration.find({ event: eventId });

    const registered = registrations.length;
    const attended = registrations.filter(r => r.status === 'attended').length;
    const notAttended = registered - attended;

    res.json({
      success: true,
      data: {
        labels: ['Attended', 'Registered but Not Attended'],
        datasets: [{
          data: [attended, notAttended],
          backgroundColor: ['#4CAF50', '#FF9800'],
          borderColor: ['#388E3C', '#F57C00'],
          borderWidth: 1
        }]
      }
    });
  } catch (error) {
    console.error('Participation ratio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch participation ratio',
      error: error.message
    });
  }
};

// Revenue per Event Bar Chart Data
exports.getRevenuePerEvent = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const events = await Event.find({ year: targetYear }).select('name _id');

    const revenueData = await Promise.all(
      events.map(async (event) => {
        const revenue = await Revenue.aggregate([
          {
            $match: {
              event: event._id,
              status: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]);

        return {
          eventName: event.name,
          revenue: revenue.length > 0 ? revenue[0].total : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        labels: revenueData.map(d => d.eventName),
        datasets: [{
          label: 'Revenue per Event',
          data: revenueData.map(d => d.revenue),
          backgroundColor: '#2196F3',
          borderColor: '#1976D2',
          borderWidth: 1
        }]
      }
    });
  } catch (error) {
    console.error('Revenue per event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue per event',
      error: error.message
    });
  }
};

// Student Analytics (for user dashboard)
exports.getStudentAnalytics = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Total events participated
    const totalParticipated = await Registration.countDocuments({
      student: studentId,
      status: 'attended'
    });

    // Total registrations
    const totalRegistrations = await Registration.countDocuments({
      student: studentId
    });

    // Total amount paid
    const totalPaid = await Registration.aggregate([
      {
        $match: {
          student: mongoose.Types.ObjectId(studentId),
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    const amountPaid = totalPaid.length > 0 ? totalPaid[0].total : 0;

    // Recent registrations
    const recentRegistrations = await Registration.find({
      student: studentId
    })
    .populate('event', 'name year')
    .populate('subEvent', 'name')
    .sort({ registrationDate: -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        totalParticipated,
        totalRegistrations,
        totalAmountPaid: amountPaid,
        recentRegistrations
      }
    });
  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student analytics',
      error: error.message
    });
  }
};
