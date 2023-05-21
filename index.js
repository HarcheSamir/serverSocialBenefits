const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const Auth = require('./routes/Auth')
const Employee= require('./routes/Employee')
const Admin = require('./routes/Admin')
const Accountant = require('./routes/Accountant')
const HrManager = require('./routes/HrManager')
const Password = require('./routes/Password')
let cors = require("cors");
const http = require('http').Server(app);
const WebSocket = require('ws');
require('dotenv').config(); // Load environment variables from .env file

// Import your decision routes
const decisionRoutes = require('./routes/notifs');
app.use(cors({credentials: true,  origin: true}));
http.listen(process.env.PORT||3006, () => console.log('Server listening on port 3006.'));
const wss = new WebSocket.Server({ server: http });
app.set('wss', wss); // Set the WebSocket instance to be accessible in the routes

wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  // ...

  ws.on('message', (message) => {
    console.log('Received message:', message);
    // You can perform additional logic here based on the received message
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
  });
});
app.get('/background', (req, res) => {
    console.log('Background process executed');
    res.sendStatus(200); // Respond with a success status code (e.g., 200)
  });
  
app.use('/', decisionRoutes);
app.use('/' ,Auth)
app.use('/', Employee)
app.use('/' , Admin)
app.use('/', Accountant)
app.use('/', HrManager)
app.use('/',Password)




    
