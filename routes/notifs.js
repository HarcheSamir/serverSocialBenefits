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

module.exports = router;
