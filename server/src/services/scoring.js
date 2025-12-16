// Simple scoring utilities.

function applyBetMultiplier(points, bet){
  // bet: 'more' | 'less' | 'none'
  if(!bet || bet === 'none') return points;
  if(bet === 'more') return points * 1.5;
  if(bet === 'less') return points * 0.75;
  return points;
}

module.exports = { applyBetMultiplier };
