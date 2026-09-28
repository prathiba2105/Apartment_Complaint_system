const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const Category = require('../models/Category');

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set. Create a .env file based on .env.example.');
      process.exit(1);
    }
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Complaint.deleteMany({}),
      Notification.deleteMany({}),
      ComplaintTimeline.deleteMany({}),
      Category.deleteMany({}),
    ]);

    console.log('Cleared existing data');

    // Categories
    const categories = await Category.insertMany([
      { name: 'Plumbing', description: 'Water and pipe related issues' },
      { name: 'Electrical', description: 'Wiring, power, lighting issues' },
      { name: 'Cleaning', description: 'General cleaning services' },
      { name: 'Security', description: 'Security related concerns' },
      { name: 'Carpentry', description: 'Woodwork and furniture' },
      { name: 'Painting', description: 'Painting and wall finishing' },
      { name: 'Lift Maintenance', description: 'Elevator maintenance' },
      { name: 'Water Maintenance', description: 'Water supply and storage' },
      { name: 'Other', description: 'Other maintenance needs' },
    ]);
    console.log(`Created ${categories.length} categories`);

    // Workers
    const workers = await Worker.create([
      {
        name: 'Ramesh Kumar',
        email: 'worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543210',
        category: 'Plumbing',
        experience: 5,
        address: 'Near Block C, Green Valley',
        role: 'WORKER',
      },
      {
        name: 'Suresh Kumar',
        email: 'suresh.worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543211',
        category: 'Plumbing',
        experience: 3,
        address: 'Block B, Sunrise Apartments',
        role: 'WORKER',
      },
      {
        name: 'Amit Sharma',
        email: 'amit.worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543212',
        category: 'Electrical',
        experience: 7,
        address: 'Near Main Gate',
        role: 'WORKER',
      },
      {
        name: 'Priya Singh',
        email: 'priya.worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543213',
        category: 'Cleaning',
        experience: 2,
        address: 'Block D',
        role: 'WORKER',
      },
      {
        name: 'Vikram Patel',
        email: 'vikram.worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543214',
        category: 'Security',
        experience: 4,
        address: 'Main Entrance',
        role: 'WORKER',
      },
      {
        name: 'Ravi Menon',
        email: 'ravi.worker@apartmentcare.com',
        password: 'worker123',
        phone: '9876543215',
        category: 'Carpentry',
        experience: 6,
        address: 'Block A',
        role: 'WORKER',
      },
    ]);
    console.log(`Created ${workers.length} workers`);

    // Users
    const users = await User.create([
      {
        name: 'Rahul Verma',
        email: 'user@apartmentcare.com',
        password: 'user123',
        phone: '9123456789',
        apartment: 'Green Valley Apartments',
        block: 'A',
        floor: '1',
        flat: '101',
        role: 'USER',
      },
      {
        name: 'Anita Desai',
        email: 'anita@apartmentcare.com',
        password: 'user123',
        phone: '9123456788',
        apartment: 'Green Valley Apartments',
        block: 'B',
        floor: '2',
        flat: '204',
        role: 'USER',
      },
      {
        name: 'Mohammed Farhan',
        email: 'farhan@apartmentcare.com',
        password: 'user123',
        phone: '9123456787',
        apartment: 'Sunrise Apartments',
        block: 'C',
        floor: '3',
        flat: '310',
        role: 'USER',
      },
      {
        name: 'Kavita Rao',
        email: 'kavita@apartmentcare.com',
        password: 'user123',
        phone: '9123456786',
        apartment: 'Green Valley Apartments',
        block: 'A',
        floor: '5',
        flat: '502',
        role: 'USER',
      },
    ]);
    console.log(`Created ${users.length} users`);

    // Complaints
    const complaintsData = [
      {
        title: 'Kitchen Sink Leakage',
        description: 'Water leaking from the kitchen sink pipe',
        category: 'Plumbing',
        priority: 'High',
        status: 'PENDING',
      },
      {
        title: 'Bedroom Light Not Working',
        description: 'The bedroom ceiling light has stopped working',
        category: 'Electrical',
        priority: 'Medium',
        status: 'ASSIGNED',
        assignedWorker: workers[2]._id,
        assignedAt: new Date(),
      },
      {
        title: 'AC Not Cooling Properly',
        description: 'Air conditioner in living room not cooling',
        category: 'Maintenance',
        priority: 'Medium',
        status: 'IN_PROGRESS',
        assignedWorker: workers[2]._id,
        assignedAt: new Date(new Date().setDate(new Date().getDate() - 1)),
        acceptedAt: new Date(),
        startedAt: new Date(),
      },
      {
        title: 'Main Door Hinge Broken',
        description: 'The main entrance door hinge is broken',
        category: 'Maintenance',
        priority: 'Low',
        status: 'COMPLETED',
        assignedWorker: workers[5]._id,
        completedAt: new Date(new Date().setDate(new Date().getDate() - 3)),
      },
      {
        title: 'Water Tank Overflow',
        description: 'Water tank on the roof is overflowing',
        category: 'Water',
        priority: 'Emergency',
        status: 'PENDING',
      },
    ];

    let seq = 1;
    const complaints = [];
    for (const data of complaintsData) {
      const complaintId = `CMP-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
      seq += 1;
      const complaint = await Complaint.create({
        complaintId,
        userId: users[seq % users.length]._id,
        title: data.title,
        description: data.description,
        category: data.category,
        apartment: 'Green Valley Apartments',
        block: 'A',
        floor: '2',
        flat: '204',
        priority: data.priority,
        status: data.status,
        assignedWorker: data.assignedWorker,
        assignedAt: data.assignedAt,
        acceptedAt: data.acceptedAt,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      });
      complaints.push(complaint);
    }
    console.log(`Created ${complaints.length} complaints`);

    // Update worker task counts
    for (const c of complaints) {
      if (c.assignedWorker) {
        const w = await Worker.findById(c.assignedWorker);
        if (w) {
          if (c.status === 'COMPLETED') w.completedTaskCount += 1;
          else w.currentTaskCount += 1;
          await w.save();
        }
      }
    }

    // Notifications
    await Notification.create([
      {
        userId: users[0]._id,
        userModel: 'User',
        type: 'complaint_created',
        title: 'Complaint Created',
        message: `Your complaint "Kitchen Sink Leakage" was created successfully.`,
        complaintId: complaints[0]._id,
      },
      {
        userId: workers[2]._id,
        userModel: 'Worker',
        type: 'new_assignment',
        title: 'New Complaint Assigned',
        message: `New complaint "Bedroom Light Not Working" assigned.`,
        complaintId: complaints[1]._id,
      },
      {
        userId: users[0]._id,
        userModel: 'User',
        type: 'complaint_completed',
        title: 'Complaint Completed',
        message: `Your complaint "Main Door Hinge Broken" has been completed.`,
        complaintId: complaints[3]._id,
      },
    ]);
    console.log('Created notifications');

    // Timeline entries
    await ComplaintTimeline.create([
      {
        complaintId: complaints[0]._id,
        action: 'Complaint Created',
        performedBy: users[0].name,
        role: 'user',
        description: 'Complaint "Kitchen Sink Leakage" was created',
      },
      {
        complaintId: complaints[1]._id,
        action: 'Complaint Created',
        performedBy: users[1].name,
        role: 'user',
        description: 'Complaint "Bedroom Light Not Working" was created',
      },
      {
        complaintId: complaints[1]._id,
        action: 'Worker Assigned',
        performedBy: 'Admin',
        role: 'admin',
        description: `Complaint assigned to ${workers[2].name}`,
      },
      {
        complaintId: complaints[2]._id,
        action: 'Work Started',
        performedBy: workers[2].name,
        role: 'worker',
        description: 'Work started on AC complaint',
      },
      {
        complaintId: complaints[3]._id,
        action: 'Work Completed',
        performedBy: workers[5].name,
        role: 'worker',
        description: 'Door hinge repaired',
      },
    ]);
    console.log('Created timeline entries');

    console.log('\n==================================================');
    console.log('SEED COMPLETE - Demo Accounts:');
    console.log('==================================================');
    console.log('ADMIN   : admin@apartmentcare.com / admin123');
    console.log('WORKER  : worker@apartmentcare.com / worker123');
    console.log('USER    : user@apartmentcare.com / user123');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

run();
