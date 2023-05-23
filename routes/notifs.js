const pool = require('../db')
const express = require('express');
const router = express.Router();
const WebSocket = require('ws');

// Example route to fetch decisions
router.get('/decisions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM decisions');
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Error retrieving decisions:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Route to insert a new decision
router.post('/decisions', async (req, res) => {
  try {
    const { user_email } = req.body;
    const connection = await pool.getConnection();

    // Insert the new decision row into the table
    const [result] = await connection.execute('INSERT INTO decisions (user_email) VALUES (?)', [user_email]);

    // Get the inserted decision row
    const [insertedRow] = await connection.execute('SELECT * FROM decisions WHERE id = ?', [result.insertId]);
    console.log(insertedRow[0])
    connection.release();

    // Broadcast the new row to all connected WebSocket clients
    const wss = req.app.get('wss');
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'new_decision', data: insertedRow[0] }));
      }
    });

    res.json({ success: true, message: 'New decision inserted successfully.' });
  } catch (error) {
    console.error('Error inserting new decision:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

/*router.post('/updateNotifs', async (req, res) => {
  const { email, number } = req.body;

  try {
    const connection = await pool.getConnection();

    // Update the notifications column for the specified email
    const updateQuery = `UPDATE accounts SET notifications = ? WHERE email = ?`;
    await connection.query(updateQuery, [number, email]);

    connection.release();
    const wss = req.app.get('wss');
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'notif', data:{number:number , email : email} }));
      }
    });
    res.status(200).json({ message: 'Notifications updated successfully' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'An error occurred while updating notifications' });
  }
});*/



router.post('/updateNotifs', async (req, res) => {
  const { email, number } = req.body;

  try {
    const connection = await pool.getConnection();
if(number==0){

  // Update the notifications column for the specified email
  const updateQuery = `UPDATE accounts SET notifications = ? WHERE email = ?`;
  await connection.query(updateQuery, [number, email]);

  connection.release();
  const wss = req.app.get('wss');
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event: 'notif', data:{number:number , email : email} }));
    }
  });
  res.status(200).json({ message: 'Notifications updated successfully' });

}else{
    const selectQuery = `SELECT notifications FROM accounts WHERE email = ?`;
    const [result] = await connection.query(selectQuery, [email]);
    const originalNotifications = result[0].notifications;

console.log(originalNotifications) ;

    // Increment the notifications column for the specified email
    const updateQuery = `UPDATE accounts SET notifications = notifications + 1 WHERE email = ?`;
    await connection.query(updateQuery, [email]);

    connection.release();
    const wss = req.app.get('wss');
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'notif', data:{number:originalNotifications+1 , email : email} }));
      }
    });
    res.status(200).json({ message: 'Notifications updated successfully' });
  }
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'An error occurred while updating notifications' });
  }
});



router.get('/notifications', async (req, res) => {
  try {
    const { forr } = req.query;

    // Get a connection from the connection pool
    const connection = await pool.getConnection();

    // Perform the SELECT query
    const query = 'SELECT * FROM notifications WHERE forr = ? ORDER BY time DESC LIMIT 10';
    const [rows] = await connection.query(query, [forr]);

    // Release the connection back to the pool
    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).send('An error occurred');
  }
});



module.exports = router;
