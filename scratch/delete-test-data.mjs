import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [apps] = await conn.execute(
    `SELECT id, application_number, representative_name, mobile_number, email 
     FROM applications 
     WHERE mobile_number LIKE '%740430267%' 
        OR email LIKE '%harshgarg1009%' 
        OR category_id IN (20, 21, 22)`
  );
  const appIds = apps.map(a => a.id);
  console.log(`Target Applications to delete (${appIds.length}):`, appIds);
  console.table(apps);

  const [stalls] = await conn.execute(
    `SELECT id, stall_number, category_id, status, allotted_to_application_id 
     FROM shop_units 
     WHERE category_id IN (20, 21, 22)
        OR stall_number LIKE 'test-%'
        OR stall_number LIKE 'UAT-%'`
  );
  const stallIds = stalls.map(s => s.id);
  console.log(`Target Stalls to delete (${stallIds.length}):`, stallIds);
  console.table(stalls);

  const catIds = [20, 21, 22];
  console.log(`Target Categories to delete:`, catIds);

  await conn.beginTransaction();

  try {
    // 1. Direct allotments & changes
    if (appIds.length > 0) {
      const [daRows] = await conn.query(
        `SELECT id, change_id FROM direct_allotments WHERE application_id IN (?) OR category_id IN (?)`,
        [appIds, catIds]
      );
      const changeIds = daRows.map(r => r.change_id).filter(Boolean);

      const [resDa] = await conn.query(
        `DELETE FROM direct_allotments WHERE application_id IN (?) OR category_id IN (?)`,
        [appIds, catIds]
      );
      console.log('Deleted direct_allotments:', resDa.affectedRows);

      if (changeIds.length > 0) {
        const [resCh] = await conn.query(`DELETE FROM direct_allotment_changes WHERE id IN (?)`, [changeIds]);
        console.log('Deleted direct_allotment_changes:', resCh.affectedRows);
      }
    }

    // 2. Draw events & allocations
    const [drawEvents] = await conn.query(`SELECT id FROM draw_events WHERE category_id IN (?)`, [catIds]);
    const drawEventIds = drawEvents.map(e => e.id);

    if (appIds.length > 0 || drawEventIds.length > 0) {
      if (drawEventIds.length > 0) {
        await conn.query(`DELETE FROM draw_allocations WHERE draw_event_id IN (?)`, [drawEventIds]);
        await conn.query(`DELETE FROM draw_candidate_snapshots WHERE draw_event_id IN (?)`, [drawEventIds]);
      }
      if (appIds.length > 0) {
        await conn.query(`DELETE FROM draw_allocations WHERE application_id IN (?)`, [appIds]);
        await conn.query(`DELETE FROM draw_candidate_snapshots WHERE application_id IN (?)`, [appIds]);
      }
      console.log('Cleaned draw_allocations & candidate snapshots');
    }

    if (drawEventIds.length > 0) {
      const [resDe] = await conn.query(`DELETE FROM draw_events WHERE id IN (?)`, [drawEventIds]);
      console.log('Deleted draw_events:', resDe.affectedRows);
    }

    // 6. Application field values & checks
    if (appIds.length > 0) {
      const [r1] = await conn.query(`DELETE FROM application_field_values WHERE application_id IN (?)`, [appIds]);
      console.log('Deleted application_field_values:', r1.affectedRows);

      const [r2] = await conn.query(`DELETE FROM application_field_checks WHERE application_id IN (?)`, [appIds]);
      console.log('Deleted application_field_checks:', r2.affectedRows);

      const [r3] = await conn.query(`DELETE FROM application_documents WHERE application_id IN (?)`, [appIds]);
      console.log('Deleted application_documents:', r3.affectedRows);
    }

    // 7. Payments & Transactions
    if (appIds.length > 0) {
      const [payRows] = await conn.query(`SELECT id FROM payments WHERE application_id IN (?)`, [appIds]);
      const paymentIds = payRows.map(p => p.id);
      if (paymentIds.length > 0) {
        const [rpt] = await conn.query(`DELETE FROM payment_transactions WHERE payment_id IN (?)`, [paymentIds]);
        console.log('Deleted payment_transactions:', rpt.affectedRows);
      }

      const [rp2] = await conn.query(`DELETE FROM payments WHERE application_id IN (?)`, [appIds]);
      console.log('Deleted payments:', rp2.affectedRows);
    }

    // 8. Clean test OTP and notifications
    if (appIds.length > 0) {
      const [rotp] = await conn.query(
        `DELETE FROM otp_challenges WHERE mobile_number LIKE '%740430267%' OR application_id IN (?)`,
        [appIds]
      );
      console.log('Deleted otp_challenges:', rotp.affectedRows);

      const [rnotif] = await conn.query(
        `DELETE FROM notification_log WHERE destination LIKE '%740430267%' OR application_id IN (?)`,
        [appIds]
      );
      console.log('Deleted notification_log:', rnotif.affectedRows);
    } else {
      const [rotp] = await conn.execute(`DELETE FROM otp_challenges WHERE mobile_number LIKE '%740430267%'`);
      console.log('Deleted otp_challenges:', rotp.affectedRows);

      const [rnotif] = await conn.execute(`DELETE FROM notification_log WHERE destination LIKE '%740430267%'`);
      console.log('Deleted notification_log:', rnotif.affectedRows);
    }

    // 8. Reset any stalls allotted to these applications first
    if (appIds.length > 0) {
      const [ru1] = await conn.query(
        `UPDATE shop_units SET allotted_to_application_id = NULL, status = 'available' WHERE allotted_to_application_id IN (?)`,
        [appIds]
      );
      console.log('Reset shop_units allotment:', ru1.affectedRows);
    }

    // 9. Delete test shop units
    if (stallIds.length > 0) {
      const [ru2] = await conn.query(`DELETE FROM shop_units WHERE id IN (?)`, [stallIds]);
      console.log('Deleted shop_units:', ru2.affectedRows);
    }

    // 10. Delete applications
    if (appIds.length > 0) {
      const [rapp] = await conn.query(`DELETE FROM applications WHERE id IN (?)`, [appIds]);
      console.log('Deleted applications:', rapp.affectedRows);
    }

    // 11. Delete test categories definitions & categories
    await conn.query(`DELETE FROM category_shop_options WHERE category_id IN (?)`, [catIds]);
    await conn.query(`DELETE FROM category_document_definitions WHERE category_id IN (?)`, [catIds]);
    await conn.query(`DELETE FROM category_field_definitions WHERE category_id IN (?)`, [catIds]);
    const [rcat] = await conn.query(`DELETE FROM categories WHERE id IN (?)`, [catIds]);
    console.log('Deleted categories:', rcat.affectedRows);



    await conn.commit();
    console.log('=== ALL TEST / UAT DATA SUCCESSFULLY PURGED AND COMMITTED ===');
  } catch (err) {
    await conn.rollback();
    console.error('Error occurred, rolled back:', err);
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
