// Subscription tier feature flags.
// Plans: 'free' | 'pro'
// Features: 'design' | 'access'
// Add new features here; gate them in UI with canAccess(plan, feature).

const TOURNEY_PLANS = {
  free: { design: false, access: false },
  pro:  { design: true,  access: true  },
};

function canAccess(plan, feature) {
  return !!(TOURNEY_PLANS[plan]?.[feature] ?? false);
}

if (typeof module !== 'undefined') {
  module.exports = { canAccess, TOURNEY_PLANS };
} else {
  window.tourneyTier = { canAccess, TOURNEY_PLANS };
}
