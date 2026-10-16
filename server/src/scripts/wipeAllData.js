const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function wipe() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Wipe] Connected to MongoDB Atlas cluster');

    const dbNames = ['nitin_sir_classes', 'test'];

    for (const name of dbNames) {
      console.log(`\n--- Cleaning Database: ${name} ---`);
      const db = mongoose.connection.client.db(name);

      // 1. Delete all students
      const delStudents = await db.collection('students').deleteMany({});
      console.log(`[${name}] Students deleted: ${delStudents.deletedCount}`);

      // 2. Delete all fee dues
      const delDues = await db.collection('feedues').deleteMany({});
      console.log(`[${name}] Fee dues deleted: ${delDues.deletedCount}`);

      // 3. Delete all payments & receipts
      const delPayments = await db.collection('payments').deleteMany({});
      console.log(`[${name}] Payments deleted: ${delPayments.deletedCount}`);

      // 4. Delete audit logs if any
      try {
        const delAudit = await db.collection('auditlogs').deleteMany({});
        console.log(`[${name}] Audit logs deleted: ${delAudit.deletedCount}`);
      } catch (e) {
        // collection might not exist
      }

      // 5. Reset all library seats to available
      const resetSeats = await db.collection('seats').updateMany(
        {},
        {
          $set: {
            status: 'available',
            assignedStudent: null,
            assignedAt: null
          }
        }
      );
      console.log(`[${name}] Library seats reset to available: ${resetSeats.modifiedCount}`);
    }

    console.log('\n[Success] All student data, fees, payments, and seat allocations have been completely wiped!');
    process.exit(0);
  } catch (error) {
    console.error('[Error] Wipe failed:', error.message);
    process.exit(1);
  }
}

wipe();
