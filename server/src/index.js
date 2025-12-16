require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const playersRoutes = require('./routes/players');
const matchups = require('./routes/matchups');
const teamsRoute = require('./routes/teams');
const usersRoutes = require('./routes/users');
const leaguesRoutes = require('./routes/leagues');

const app = express();
app.use(cors());
app.use(express.json());

// HTTP server + Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST','PATCH'] } });
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join-league', ({ leagueId }) => {
    if(!leagueId) return;
    socket.join(String(leagueId));
  });
});

const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wildcat_dev')
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB connection error', err));

app.use('/auth', authRoutes);
app.use('/players', playersRoutes);
app.use('/users', usersRoutes);
app.use('/leagues', leaguesRoutes);
app.use('/matchups', matchups);
app.use('/teams', teamsRoute);

app.get('/', (req, res) => res.json({ok:true, msg:'Wildcat server'}));

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
