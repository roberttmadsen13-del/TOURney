// TOURney FORMAT_META — single source of truth for all scoring formats
// Consumed by: create.html, admin.html, scorecard.html, scoreboard.html
// lockScope: 'nine' = mix freely; 'round' = both nines must match; 'tourney' = all rounds + nines must match
window.FORMAT_META = [
  { value:'stroke',            label:'Stroke Play',           desc:'Every stroke counts. Lowest total score wins.',                                        structures:['individual','pairs','team'],  behavior:'default',    overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'scramble',          label:'Scramble',              desc:'All players hit, best shot chosen, repeat. Great for mixed-skill groups.',              structures:['pairs','team'],               behavior:'scramble',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'best_ball',         label:'Best Ball',             desc:"Each player plays their own ball; lowest score on each hole counts for the team.",      structures:['pairs','team'],               behavior:'best_ball',  overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'shambles',          label:'Shambles',              desc:'Scramble off the tee, then everyone plays their own ball from the best drive.',         structures:['pairs','team'],               behavior:'shambles',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'stableford',        label:'Stableford',            desc:'Points per hole vs par. Bogey=1, par=2, birdie=3, eagle=4. Most points wins.',         structures:['individual','pairs','team'],  behavior:'stableford', overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'mod_stableford',    label:'Modified Stableford',   desc:'Aggressive points scale. Eagle=+5, par=0, bogey=−1. Rewarding aggressive play.',       structures:['individual','pairs','team'],  behavior:'stableford', overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'match',             label:'Match Play',            desc:'Hole-by-hole: win a hole = 1 up. Match ends when lead exceeds holes remaining.',       structures:['individual','pairs'],         behavior:'match',      overlay:false, minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'alt_shot',          label:'Alternate Shot',        desc:'Partners share one ball, alternating every stroke. Odd holes: partner A tees.',        structures:['pairs'],                      behavior:'scramble',   overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'chapman',           label:'Chapman / Pinehurst',   desc:'Both drive, swap, choose best second shot, finish in alternate shot.',                 structures:['pairs'],                      behavior:'scramble',   overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'greensomes',        label:'Greensomes',            desc:'Both drive, pick best drive, then alternate shots all the way in.',                    structures:['pairs'],                      behavior:'scramble',   overlay:false, minParty:2, requiresExact:null, lockScope:'nine'    },
  { value:'nassau',            label:'Nassau',                desc:'Three match bets: front 9, back 9, and 18 holes. Win 0–3 segments.',                  structures:['individual','pairs','team'],  behavior:'nassau',     overlay:true,  minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'skins',             label:'Skins',                 desc:'Each hole is a skin. Ties carry forward. Winner takes clean holes.',                  structures:['individual','pairs','team'],  behavior:'skins',      overlay:true,  minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'superball',         label:'Superball',             desc:"Scramble with designated 'super ball' player whose tee shot is required on set holes.", structures:['pairs','team'],              behavior:'scramble',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'texas_scramble',    label:'Texas Scramble',        desc:'Scramble with a minimum drive quota per player (typically 3 of 18 holes).',           structures:['pairs','team'],               behavior:'scramble',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'florida_scramble',  label:'Florida Scramble',      desc:'Scramble where the player whose shot was used sits out the next shot.',               structures:['pairs','team'],               behavior:'scramble',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'ambrose',           label:'Ambrose',               desc:'Team scramble with handicap applied. Net = gross − (combined handicap ÷ players).',   structures:['pairs','team'],               behavior:'scramble',   overlay:false, minParty:4, requiresExact:null, lockScope:'nine'    },
  { value:'bogey_par',         label:'Bogey/Par Competition', desc:'Win, halve, or lose each hole vs par. Running net vs par across 18.',                 structures:['individual','pairs','team'],  behavior:'bogey_par',  overlay:false, minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'four_ball_match',   label:'Four-Ball Match',       desc:'Each player plays own ball. Best ball per pair competes match-play vs opposing pair.', structures:['pairs'],                      behavior:'match',      overlay:false, minParty:4, requiresExact:null, lockScope:'round'   },
  { value:'waltz',             label:'Waltz',                 desc:'Cycling team count: hole 1=best 1, hole 2=best 2, hole 3=best 3, repeat.',            structures:['pairs','team'],               behavior:'waltz',      overlay:false, minParty:4, requiresExact:null, lockScope:'round'   },
  { value:'vegas',             label:'Vegas',                 desc:"Combine pair scores as 2-digit number (best score = tens digit). e.g. 4+5=45.",       structures:['pairs','team'],               behavior:'vegas',      overlay:false, minParty:4, requiresExact:null, lockScope:'round'   },
  { value:'quota',             label:'Quota',                 desc:'Target = 36 − handicap. Earn Stableford points each hole. Beat your target to win.',  structures:['individual'],                 behavior:'stableford', overlay:false, minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'bingo_bango_bongo', label:'Bingo Bango Bongo',     desc:'3 pts per hole: first on green (Bingo), closest when all on (Bango), first to hole out (Bongo).', structures:['individual'],   behavior:'bbb',        overlay:false, minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'wolf',              label:'Wolf',                  desc:'Rotating wolf per hole picks a partner after tee shots, or goes solo (1v3, 2× pts).', structures:['individual'],                 behavior:'wolf',       overlay:false, minParty:4, requiresExact:4,    lockScope:'round'   },
  { value:'snake',             label:'Snake',                 desc:'Last player to 3-putt holds the snake (penalty). Passed on next 3-putt.',             structures:['individual'],                 behavior:'snake',      overlay:false, minParty:2, requiresExact:null, lockScope:'round'   },
  { value:'eclectic',          label:'Eclectic',              desc:'Best score on each hole across all rounds in the tournament. Running best-of.',       structures:['individual','pairs','team'],  behavior:'eclectic',   overlay:false, minParty:2, requiresExact:null, lockScope:'tourney' },
  { value:'peoria',            label:'Peoria',                desc:'Post-round: 6 secret holes used to compute handicap allowance for net scoring.',      structures:['individual'],                 behavior:'default',    overlay:false, minParty:2, requiresExact:null, lockScope:'tourney' },
  { value:'callaway',          label:'Callaway',              desc:'Post-round handicap via Callaway table. Worst holes deducted based on gross score.',  structures:['individual'],                 behavior:'default',    overlay:false, minParty:2, requiresExact:null, lockScope:'tourney' },
];

// Quick lookup helpers
window.FORMAT_BY_VALUE = Object.fromEntries(window.FORMAT_META.map(f => [f.value, f]));
window.FORMAT_SCOPE = (v) => (window.FORMAT_BY_VALUE[v] && window.FORMAT_BY_VALUE[v].lockScope) || 'nine';

// Scope badge for picker option labels: [9] / [18] / [ALL]
window.FORMAT_SCOPE_BADGE = (v) => {
  const s = window.FORMAT_SCOPE(v);
  return s === 'tourney' ? '[ALL]' : s === 'round' ? '[18]' : '[9]';
};

// Normalize a roundFormats map ({day1:{front,back}, ...}) so it obeys lockScope.
// - If any day's format is tourney-locked, pin every day's front+back to it (first tourney-locked value wins).
// - If a day's front is round-locked, force back = front.
// - Returns a NEW object (does not mutate). Logs console.warn when coerced.
window.normalizeRoundFormats = function(roundFormats, allDays) {
  if (!roundFormats || typeof roundFormats !== 'object') return roundFormats;
  const days = allDays || Object.keys(roundFormats);
  let coerced = false;
  let tourneyLock = null;
  for (const d of days) {
    const f = roundFormats[d];
    if (!f) continue;
    if (window.FORMAT_SCOPE(f.front) === 'tourney') { tourneyLock = f.front; break; }
    if (window.FORMAT_SCOPE(f.back) === 'tourney')  { tourneyLock = f.back;  break; }
  }
  const out = {};
  for (const d of days) {
    const src = roundFormats[d] || { front:'stroke', back:'stroke' };
    let front = src.front || 'stroke';
    let back  = src.back  || 'stroke';
    if (tourneyLock) {
      if (front !== tourneyLock || back !== tourneyLock) coerced = true;
      front = tourneyLock; back = tourneyLock;
    } else if (window.FORMAT_SCOPE(front) === 'round' && back !== front) {
      coerced = true; back = front;
    } else if (window.FORMAT_SCOPE(back) === 'round' && front !== back) {
      coerced = true; front = back;
    }
    out[d] = { front, back };
  }
  if (coerced && typeof console !== 'undefined') {
    console.warn('[formats] illegal scope combo detected; coerced', { input: roundFormats, output: out });
  }
  return out;
};

// Round-locked + tourney-locked value lists (handy for SQL CHECK & UI grays)
window.FORMAT_ROUND_LOCKED   = window.FORMAT_META.filter(f => f.lockScope === 'round'  ).map(f => f.value);
window.FORMAT_TOURNEY_LOCKED = window.FORMAT_META.filter(f => f.lockScope === 'tourney').map(f => f.value);
