const players = [
  {id:'p1', name:'Patrick Mahomes', position:'QB'},
  {id:'p2', name:'Christian McCaffrey', position:'RB'},
  {id:'p3', name:'Justin Jefferson', position:'WR'},
  {id:'p4', name:'Travis Kelce', position:'TE'},
  {id:'p5', name:'Derrick Henry', position:'RB'}
];

const league = {
  id: 'l1',
  name: 'Wildcat Demo League',
  teams: [
    {id: 't1', name: 'Siraaj Stars', owner: 'Siraaj'},
    {id: 't2', name: 'Maple Mayhem', owner: 'Alex'},
  ]
};

export default {
  loginDemo: async ({email, password}) => {
    return {ok:true, token:'demo-token'};
  },
  signupDemo: async ({email, password}) => {
    return {ok:true, token:'demo-token'};
  },
  fetchDemoLeague: () => league,
  fetchPlayers: () => players,
};
