import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [columns] = await conn.execute('DESCRIBE applications');
  console.log('Columns:', columns.map(c => c.Field).join(', '));

  const [apps] = await conn.execute(
    `SELECT id, application_number, representative_name, mobile_number, email, category_id, status 
     FROM applications 
     WHERE mobile_number LIKE '%740430267%' 
        OR email LIKE '%harshgarg1009%' 
        OR representative_name LIKE '%test%'`
  );
  console.log('=== Matching Applications (' + apps.length + ') ===');
  console.table(apps);

  const [tables] = await conn.execute('SHOW TABLES');
  console.log('Tables:', tables.map(t => Object.values(t)[0]));

  const [catCols] = await conn.execute('DESCRIBE categories');
  console.log('Category Columns:', catCols.map(c => c.Field).join(', '));

  const [categories] = await conn.execute(
    `SELECT * FROM categories WHERE id IN (20, 21, 22) OR slug LIKE '%test%'`
  );
  console.log('Test Categories:', categories);

  const [unitCols] = await conn.execute('DESCRIBE shop_units');
  console.log('Shop Unit Columns:', unitCols.map(c => c.Field).join(', '));

  const [shopUnits] = await conn.execute(
    `SELECT * FROM shop_units 
     WHERE category_id IN (20, 21, 22)
        OR stall_number LIKE '%test%'
        OR stall_number LIKE '%uat%'`
  );
  console.log('Shop Units:', shopUnits);

  await conn.end();
}
check().catch(console.error);
