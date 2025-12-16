require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Player = require('./src/models/Player');
const League = require('./src/models/League');

async function run(){
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wildcat_dev';
  await mongoose.connect(uri, {useNewUrlParser:true, useUnifiedTopology:true});
  console.log('Connected to', uri);

  // Clear small collections
  await User.deleteMany({});
  await Player.deleteMany({});
  await League.deleteMany({});

  // Create demo user
  const salt = await bcrypt.genSalt(10);
  const demoHash = await bcrypt.hash('demo123', salt);
  const demoUser = await new User({email:'siraaj@wildcat.test', passwordHash: demoHash, displayName:'Siraaj'}).save();
  console.log('Created user siraaj', demoUser.email);

  const rivalHash = await bcrypt.hash('rival123', salt);
  const rivalUser = await new User({email:'mark@wildcat.test', passwordHash: rivalHash, displayName:'Mark'}).save();
  console.log('Created user mark', rivalUser.email);

  const playersData = [
    {name:'Patrick Mahomes', position:'QB', team:'KC', weeklyStats:[
      {season:2025, week:1, fantasyPoints:26.02, projectedPoints:19.08},
      {season:2025, week:2, fantasyPoints:23.08, projectedPoints:19.46},
      {season:2025, week:3, fantasyPoints:13.16, projectedPoints:20.79},
      {season:2025, week:4, fantasyPoints:27.30, projectedPoints:18.42},
      {season:2025, week:5, fantasyPoints:27.72, projectedPoints:20.50}
    ]},
    {name:'Christian McCaffrey', position:'RB', team:'SF', weeklyStats:[
      {season:2025, week:1, fantasyPoints:23.20, projectedPoints:19.72},
      {season:2025, week:2, fantasyPoints:22.70, projectedPoints:20.68},
      {season:2025, week:3, fantasyPoints:24.00, projectedPoints:24.29},
      {season:2025, week:4, fantasyPoints:26.10, projectedPoints:23.38},
      {season:2025, week:5, fantasyPoints:27.90, projectedPoints:24.90}
    ]},
    {name:'Justin Jefferson', position:'WR', team:'MIN', weeklyStats:[
      {season:2025, week:1, fantasyPoints:14.80, projectedPoints: 18.82},
      {season:2025, week:2, fantasyPoints:11.10, projectedPoints: 18.43},
      {season:2025, week:3, fantasyPoints:12.50, projectedPoints: 18.02},
      {season:2025, week:4, fantasyPoints:22.60, projectedPoints: 14.66},
      {season:2025, week:5, fantasyPoints:19.30, projectedPoints: 14.92}
    ]},
    {name:'Travis Kelce', position:'TE', team:'KC', weeklyStats:[
      {season:2025, week:1, fantasyPoints:12.70, projectedPoints:11.5},
      {season:2025, week:2, fantasyPoints:10.10, projectedPoints:12.0},
      {season:2025, week:3, fantasyPoints:6.60, projectedPoints:10.8},
      {season:2025, week:4, fantasyPoints:9.80, projectedPoints:9.9},
      {season:2025, week:5, fantasyPoints:19.10, projectedPoints:14.5}
    ]},
    {name:'Derrick Henry', position:'RB', team:'BAL', weeklyStats:[
      {season:2025, week:1, fantasyPoints:29.20, projectedPoints:22.5},
      {season:2025, week:2, fantasyPoints:2.30, projectedPoints:12.0},
      {season:2025, week:3, fantasyPoints:10.70, projectedPoints:14.0},
      {season:2025, week:4, fantasyPoints:9.30, projectedPoints:11.2},
      {season:2025, week:5, fantasyPoints:14.00, projectedPoints:13.8}
    ]},
    {name:'Tyreek Hill', position:'WR', team:'MIA', weeklyStats:[
      {season:2025, week:1, fantasyPoints:8.00, projectedPoints:12.2},
      {season:2025, week:2, fantasyPoints:16.90, projectedPoints:15.8},
      {season:2025, week:3, fantasyPoints:15.90, projectedPoints:14.7},
      {season:2025, week:4, fantasyPoints:12.70, projectedPoints:13.0},
      {season:2025, week:5, fantasyPoints:0, projectedPoints:10.0}
    ]},
    {name:'Jonathan Taylor', position:'RB', team:'IND', weeklyStats:[
      {season:2025, week:1, fantasyPoints:12.80, projectedPoints:11.2},
      {season:2025, week:2, fantasyPoints:29.50, projectedPoints:20.0},
      {season:2025, week:3, fantasyPoints:32.80, projectedPoints:22.5},
      {season:2025, week:4, fantasyPoints:14.60, projectedPoints:15.0},
      {season:2025, week:5, fantasyPoints:31.60, projectedPoints:19.8}
    ]},
    {name:'A.J. Brown', position:'WR', team:'PHI', weeklyStats:[
      {season:2025, week:1, fantasyPoints:1.80, projectedPoints:11.0},
      {season:2025, week:2, fantasyPoints:7.70, projectedPoints:12.2},
      {season:2025, week:3, fantasyPoints:22.90, projectedPoints:18.5},
      {season:2025, week:4, fantasyPoints:2.70, projectedPoints:13.0},
      {season:2025, week:5, fantasyPoints:9.30, projectedPoints:12.4}
    ]},
    {name:'Lamar Jackson', position:'QB', team:'BAL', weeklyStats:[
      {season:2025, week:1, fantasyPoints:29.36, projectedPoints:24.0},
      {season:2025, week:2, fantasyPoints:26.30, projectedPoints:21.5},
      {season:2025, week:3, fantasyPoints:27.02, projectedPoints:20.9},
      {season:2025, week:4, fantasyPoints:11.68, projectedPoints:18.0},
      {season:2025, week:5, fantasyPoints:0, projectedPoints:15.0}
    ]},
    {name:'Nick Chubb', position:'RB', team:'HOU', weeklyStats:[
      {season:2025, week:1, fantasyPoints:6.00, projectedPoints:10.2},
      {season:2025, week:2, fantasyPoints:15.20, projectedPoints:13.8},
      {season:2025, week:3, fantasyPoints:7.00, projectedPoints:12.0},
      {season:2025, week:4, fantasyPoints:8.20, projectedPoints:11.4},
      {season:2025, week:5, fantasyPoints:12.10, projectedPoints:14.0}
    ]},
    {name:'Cooper Kupp', position:'WR', team:'SEA', weeklyStats:[
      {season:2025, week:1, fantasyPoints:3.50, projectedPoints:12.0},
      {season:2025, week:2, fantasyPoints:16.00, projectedPoints:15.5},
      {season:2025, week:3, fantasyPoints:5.10, projectedPoints:13.0},
      {season:2025, week:4, fantasyPoints:6.60, projectedPoints:11.2},
      {season:2025, week:5, fantasyPoints:11.90, projectedPoints:12.8}
    ]},
    {name:'Trey McBride', position:'TE', team:'AZ', weeklyStats:[
      {season:2025, week:1, fantasyPoints:12.10, projectedPoints:10.5},
      {season:2025, week:2, fantasyPoints:13.80, projectedPoints:12.8},
      {season:2025, week:3, fantasyPoints:15.30, projectedPoints:13.9},
      {season:2025, week:4, fantasyPoints:12.20, projectedPoints:11.6},
      {season:2025, week:5, fantasyPoints:9.10, projectedPoints:9.8}
    ]},
    {name:'Josh Allen', position:'QB', team:'BUF', weeklyStats:[
      {season:2025, week:1, fantasyPoints:38.76, projectedPoints:28.5},
      {season:2025, week:2, fantasyPoints:11.82, projectedPoints:20.0},
      {season:2025, week:3, fantasyPoints:23.02, projectedPoints:22.5},
      {season:2025, week:4, fantasyPoints:25.86, projectedPoints:24.0},
      {season:2025, week:5, fantasyPoints:20.42, projectedPoints:21.0}
    ]},
    {name:'Davante Adams', position:'WR', team:'LAR', weeklyStats:[
      {season:2025, week:1, fantasyPoints:9.10, projectedPoints:13.0},
      {season:2025, week:2, fantasyPoints:22.60, projectedPoints:16.5},
      {season:2025, week:3, fantasyPoints:14.60, projectedPoints:15.2},
      {season:2025, week:4, fantasyPoints:15.60, projectedPoints:14.8},
      {season:2025, week:5, fantasyPoints:13.80, projectedPoints:14.0}
    ]},
    {name:'Stefon Diggs', position:'WR', team:'NE', weeklyStats:[
      {season:2025, week:1, fantasyPoints:11.70, projectedPoints:12.2},
      {season:2025, week:2, fantasyPoints:7.20, projectedPoints:11.6},
      {season:2025, week:3, fantasyPoints:5.30, projectedPoints:10.8},
      {season:2025, week:4, fantasyPoints:16.10, projectedPoints:13.5},
      {season:2025, week:5, fantasyPoints:24.60, projectedPoints:18.9}
    ]},
    {name:'Brock Bowers', position:'TE', team:'LV', weeklyStats:[
      {season:2025, week:1, fantasyPoints:15.30, projectedPoints:12.0},
      {season:2025, week:2, fantasyPoints:8.80, projectedPoints:10.0},
      {season:2025, week:3, fantasyPoints:9.80, projectedPoints:9.5},
      {season:2025, week:4, fantasyPoints:9.60, projectedPoints:10.2},
      {season:2025, week:5, fantasyPoints:0, projectedPoints:9.0}
    ]},
    {name:'JaMarr Chase', position:'WR', team:'CIN', weeklyStats:[
      {season:2025, week:1, fantasyPoints:4.60, projectedPoints:13.8},
      {season:2025, week:2, fantasyPoints:36.50, projectedPoints:18.5},
      {season:2025, week:3, fantasyPoints:8.90, projectedPoints:14.0},
      {season:2025, week:4, fantasyPoints:7.30, projectedPoints:12.2},
      {season:2025, week:5, fantasyPoints:29.00, projectedPoints:17.9}
    ]},
    {name:'Jaxon Smith-Njigba', position:'WR', team:'SEA', weeklyStats:[
      {season:2025, week:1, fantasyPoints:19.40, projectedPoints:16.0},
      {season:2025, week:2, fantasyPoints:18.30, projectedPoints:15.8},
      {season:2025, week:3, fantasyPoints:20.60, projectedPoints:15.2},
      {season:2025, week:4, fantasyPoints:13.00, projectedPoints:13.5},
      {season:2025, week:5, fantasyPoints:27.20, projectedPoints:18.9}
    ]},
    {name:'Josh Jacobs', position:'RB', team:'GB', weeklyStats:[
      {season:2025, week:1, fantasyPoints:14.00, projectedPoints:13.5},
      {season:2025, week:2, fantasyPoints:14.40, projectedPoints:14.0},
      {season:2025, week:3, fantasyPoints:12.40, projectedPoints:13.0},
      {season:2025, week:4, fantasyPoints:31.70, projectedPoints:17.5},
      {season:2025, week:5, fantasyPoints:32.00, projectedPoints:19.2}
    ]},
    {name:'Mark Andrews', position:'TE', team:'BAL', weeklyStats:[
      {season:2025, week:1, fantasyPoints:12.8, projectedPoints:11.0},
      {season:2025, week:2, fantasyPoints:11.6, projectedPoints:11.2},
      {season:2025, week:3, fantasyPoints:14.2, projectedPoints:12.8},
      {season:2025, week:4, fantasyPoints:12.3, projectedPoints:11.5},
      {season:2025, week:5, fantasyPoints:13.4, projectedPoints:12.6}
    ]}
  ];
  const playerDocs = await Player.insertMany(playersData);
  console.log('Inserted players', playerDocs.length);

  // Create a sample league with two teams, each with 6-player rosters
  const league = await new League({
    name: 'Wildcat League',
    teams: [
      {name:'Siraaj\'s Stars', owner: demoUser._id, roster: playerDocs.slice(0,6).map(p=>p._id)},
      {name:'Mark Em Down', owner: rivalUser._id, roster: playerDocs.slice(6,12).map(p=>p._id)}
    ]
  }).save();
  console.log('Created league', league.name);

  await mongoose.disconnect();
  console.log('Seed complete');
}

run().catch(err=>{console.error(err); process.exit(1)});
