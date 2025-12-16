const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const League = require('../models/League');
const Player = require('../models/Player');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/signup', async (req, res) => {
  const { email, password, displayName, teamName, roster } = req.body;
  if(!email || !password) return res.status(400).json({error:'Email and password required'});
  try{
    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({error:'Email already in use'});
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = new User({email, passwordHash, displayName});
    await user.save();
    const token = jwt.sign({id: user._id, email: user.email}, JWT_SECRET, {expiresIn: '7d'});
    // If roster/teamName provided, create a League + Team for the user and map roster entries
    let league = null;
    if(Array.isArray(roster) && roster.length > 0){
      // Map roster entries: expect Player._id strings only
      const mongoose = require('mongoose');
      const mappedRoster = [];
      for(const r of roster){
        if(typeof r === 'string' && mongoose.Types.ObjectId.isValid(r)){
          mappedRoster.push(r);
        } else {
          return res.status(400).json({ error: 'Roster entries must be valid Player _id strings' });
        }
      }

      const teamObj = { name: teamName || `${user.email} Team`, owner: user._id, roster: mappedRoster };
      league = new League({ name: `${user.email || 'User'} League`, teams: [teamObj] });
      await league.save();
    }

    res.json({token, user:{id:user._id, email:user.email, displayName:user.displayName}, league});
  } catch(err){
    console.error(err);
    res.status(500).json({error:'Server error'});
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({error:'Email and password required'});
  try{
    const user = await User.findOne({email});
    if(!user) return res.status(400).json({error:'Invalid credentials'});
    const match = await bcrypt.compare(password, user.passwordHash);
    if(!match) return res.status(400).json({error:'Invalid credentials'});
    const token = jwt.sign({id: user._id, email: user.email}, JWT_SECRET, {expiresIn: '7d'});
    res.json({token, user:{id:user._id, email:user.email, displayName:user.displayName}});
  } catch(err){
    console.error(err);
    res.status(500).json({error:'Server error'});
  }
});

// GET /auth/me - validate token and return user info
router.get('/me', auth, async (req, res) => {
  try{
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('_id email displayName');
    if(!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, email: user.email, displayName: user.displayName } });
  } catch(err){
    console.error('GET /auth/me error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
