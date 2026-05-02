/* Golf Course Database — US courses with 18-hole pars
   Each entry: { name, city, state, pars: [18 numbers] }
   Used by admin.html for course search/auto-populate. */

const GOLF_COURSES_DB = [
  // --- SOUTH CAROLINA (Myrtle Beach area) ---
  { name:"Barefoot Resort — Dye Course", city:"North Myrtle Beach", state:"SC", pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,3,5,4,4] },
  { name:"Barefoot Resort — Fazio Course", city:"North Myrtle Beach", state:"SC", pars:[4,4,3,5,4,4,5,3,4,4,3,4,5,4,3,4,5,4] },
  { name:"Barefoot Resort — Love Course", city:"North Myrtle Beach", state:"SC", pars:[4,3,5,4,4,4,3,5,4,5,4,3,4,4,5,3,4,4] },
  { name:"Barefoot Resort — Norman Course", city:"North Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Caledonia Golf & Fish Club", city:"Pawleys Island", state:"SC", pars:[4,4,3,4,5,4,3,5,4,4,3,4,4,5,3,4,5,4] },
  { name:"TPC Myrtle Beach", city:"Murrells Inlet", state:"SC", pars:[4,5,3,4,4,4,3,5,4,4,3,4,5,4,4,3,5,4] },
  { name:"Tidewater Golf Club", city:"North Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,3,5,4,4,4,3,5,4] },
  { name:"Dunes Golf & Beach Club", city:"Myrtle Beach", state:"SC", pars:[4,5,4,3,4,4,5,3,4,4,3,5,4,4,3,5,4,4] },
  { name:"Grande Dunes Resort Course", city:"Myrtle Beach", state:"SC", pars:[5,4,3,4,4,4,5,3,4,4,4,3,5,4,4,3,4,5] },
  { name:"Pawleys Plantation", city:"Pawleys Island", state:"SC", pars:[4,5,4,3,4,4,3,5,4,4,3,4,5,4,3,5,4,4] },
  { name:"Kiawah Island — Ocean Course", city:"Kiawah Island", state:"SC", pars:[4,5,4,3,4,4,5,3,4,4,3,4,5,4,3,5,4,4] },
  { name:"Kiawah Island — Osprey Point", city:"Kiawah Island", state:"SC", pars:[4,4,5,3,4,4,3,5,4,5,4,3,4,4,3,4,5,4] },
  { name:"Harbour Town Golf Links", city:"Hilton Head", state:"SC", pars:[4,5,4,4,5,4,3,4,3,4,4,4,4,3,5,4,3,4] },

  // --- GEORGIA ---
  { name:"Augusta National Golf Club", city:"Augusta", state:"GA", pars:[4,5,4,3,4,3,4,5,4,4,4,3,5,4,5,3,4,4] },
  { name:"East Lake Golf Club", city:"Atlanta", state:"GA", pars:[4,4,3,4,5,3,4,5,4,4,4,3,5,4,4,3,4,5] },
  { name:"TPC Sawgrass — Stadium Course", city:"Ponte Vedra Beach", state:"FL", pars:[4,5,3,4,4,4,4,3,5,4,5,4,3,4,4,5,3,4] },

  // --- FLORIDA ---
  { name:"Bay Hill Club & Lodge", city:"Orlando", state:"FL", pars:[4,5,4,3,4,5,3,4,4,4,4,5,3,4,4,5,3,4] },
  { name:"PGA National — Champion Course", city:"Palm Beach Gardens", state:"FL", pars:[4,4,5,4,3,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Streamsong Resort — Red Course", city:"Streamsong", state:"FL", pars:[4,4,5,3,4,4,3,5,4,5,4,3,4,4,5,3,4,4] },
  { name:"Streamsong Resort — Blue Course", city:"Streamsong", state:"FL", pars:[4,3,5,4,4,3,5,4,4,4,5,3,4,4,3,5,4,4] },
  { name:"Streamsong Resort — Black Course", city:"Streamsong", state:"FL", pars:[4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,5,4,4] },
  { name:"WGC — Blue Monster at Doral", city:"Miami", state:"FL", pars:[5,4,4,4,5,4,3,4,3,5,4,3,4,4,3,4,4,4] },

  // --- CALIFORNIA ---
  { name:"Pebble Beach Golf Links", city:"Pebble Beach", state:"CA", pars:[4,5,4,4,3,5,3,4,4,4,4,3,4,5,4,4,3,5] },
  { name:"Spyglass Hill Golf Course", city:"Pebble Beach", state:"CA", pars:[5,4,3,4,4,4,3,5,4,4,3,5,4,4,4,3,5,4] },
  { name:"Torrey Pines — South Course", city:"La Jolla", state:"CA", pars:[4,4,3,4,5,4,4,3,5,4,3,4,5,4,4,3,5,5] },
  { name:"Torrey Pines — North Course", city:"La Jolla", state:"CA", pars:[4,4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,5,4] },
  { name:"Riviera Country Club", city:"Pacific Palisades", state:"CA", pars:[5,4,4,3,4,3,4,4,4,4,5,4,4,3,4,3,5,4] },
  { name:"Pasatiempo Golf Club", city:"Santa Cruz", state:"CA", pars:[4,3,4,4,5,3,4,4,5,4,3,4,4,5,3,4,4,5] },

  // --- ARIZONA ---
  { name:"TPC Scottsdale — Stadium Course", city:"Scottsdale", state:"AZ", pars:[4,4,5,3,4,4,3,5,4,4,3,4,5,4,4,3,5,4] },
  { name:"We-Ko-Pa — Saguaro Course", city:"Fountain Hills", state:"AZ", pars:[4,4,5,3,4,4,3,5,4,4,3,4,5,4,4,3,5,4] },
  { name:"Troon North — Monument Course", city:"Scottsdale", state:"AZ", pars:[4,3,4,5,4,4,5,3,4,4,5,3,4,4,3,5,4,4] },

  // --- NORTH CAROLINA ---
  { name:"Pinehurst No. 2", city:"Pinehurst", state:"NC", pars:[4,4,4,4,5,3,4,4,3,5,4,4,4,3,4,4,3,5] },
  { name:"Pinehurst No. 4", city:"Pinehurst", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,3,4,5,4,4,3,5,4] },
  { name:"Pinehurst No. 8", city:"Pinehurst", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Quail Hollow Club", city:"Charlotte", state:"NC", pars:[4,5,4,3,4,4,5,3,4,4,5,3,4,4,4,3,4,5] },

  // --- NEW YORK / NEW JERSEY ---
  { name:"Bethpage Black", city:"Farmingdale", state:"NY", pars:[4,4,3,5,4,4,3,5,4,4,4,4,5,3,4,4,3,4] },
  { name:"Winged Foot — West Course", city:"Mamaroneck", state:"NY", pars:[4,4,3,4,5,3,3,4,5,3,4,4,5,4,4,4,4,4] },
  { name:"Shinnecock Hills Golf Club", city:"Southampton", state:"NY", pars:[4,3,4,4,5,4,3,4,4,4,3,4,4,5,4,4,3,4] },
  { name:"Baltusrol — Lower Course", city:"Springfield", state:"NJ", pars:[4,4,4,3,5,4,4,3,5,4,4,3,4,5,3,4,5,4] },
  { name:"Liberty National Golf Club", city:"Jersey City", state:"NJ", pars:[5,4,3,4,4,4,5,3,4,5,4,3,4,4,4,5,3,4] },

  // --- TEXAS ---
  { name:"Colonial Country Club", city:"Fort Worth", state:"TX", pars:[5,4,4,3,4,4,3,4,4,4,5,4,3,4,5,3,4,4] },
  { name:"TPC San Antonio — Oaks Course", city:"San Antonio", state:"TX", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Whispering Pines Golf Club", city:"Trinity", state:"TX", pars:[5,4,4,3,5,4,3,4,4,4,4,3,5,4,4,3,5,4] },

  // --- MICHIGAN ---
  { name:"Arcadia Bluffs Golf Club", city:"Arcadia", state:"MI", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Forest Dunes Golf Club", city:"Roscommon", state:"MI", pars:[4,3,4,5,4,4,3,5,4,5,4,3,4,4,4,3,5,4] },

  // --- PACIFIC NORTHWEST ---
  { name:"Bandon Dunes", city:"Bandon", state:"OR", pars:[4,4,4,4,5,3,5,4,4,4,3,3,4,4,5,4,3,5] },
  { name:"Pacific Dunes", city:"Bandon", state:"OR", pars:[4,4,5,3,5,3,4,4,4,4,3,4,5,3,5,4,4,4] },
  { name:"Old Macdonald", city:"Bandon", state:"OR", pars:[4,4,3,5,4,3,5,4,4,5,4,4,3,4,5,3,4,4] },
  { name:"Sheep Ranch", city:"Bandon", state:"OR", pars:[4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4] },
  { name:"Chambers Bay", city:"University Place", state:"WA", pars:[5,4,3,4,5,4,5,4,3,4,3,5,4,4,4,3,4,4] },

  // --- MIDWEST ---
  { name:"Whistling Straits — Straits Course", city:"Haven", state:"WI", pars:[4,5,3,4,5,4,3,4,4,4,5,3,4,4,3,5,4,4] },
  { name:"Erin Hills Golf Course", city:"Erin", state:"WI", pars:[4,4,5,4,5,3,4,4,3,5,4,3,5,4,4,3,4,5] },
  { name:"Medinah — Course No. 3", city:"Medinah", state:"IL", pars:[4,3,4,4,5,4,3,4,5,4,3,4,5,4,4,3,5,4] },
  { name:"Cog Hill — Dubsdread", city:"Lemont", state:"IL", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Valhalla Golf Club", city:"Louisville", state:"KY", pars:[4,4,3,4,5,4,5,3,4,4,3,4,5,4,4,3,5,5] },

  // --- HAWAII ---
  { name:"Kapalua — Plantation Course", city:"Lahaina", state:"HI", pars:[4,5,4,3,4,4,3,5,5,4,3,4,5,4,4,3,5,5] },
  { name:"Mauna Lani — South Course", city:"Kohala Coast", state:"HI", pars:[4,5,3,4,4,3,4,5,4,4,3,4,4,5,3,4,5,4] },

  // --- NORTHEAST ---
  { name:"TPC Boston", city:"Norton", state:"MA", pars:[4,4,5,3,4,3,4,5,4,5,3,4,4,4,3,4,5,4] },
  { name:"TPC River Highlands", city:"Cromwell", state:"CT", pars:[4,5,4,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Oakmont Country Club", city:"Oakmont", state:"PA", pars:[4,4,4,5,3,3,4,3,5,4,4,5,3,4,4,3,4,4] },
  { name:"Merion Golf Club — East Course", city:"Ardmore", state:"PA", pars:[4,5,3,5,4,4,4,4,3,4,4,4,3,4,4,4,3,4] },

  // --- VIRGINIA / DC AREA ---
  { name:"TPC Potomac at Avenel Farm", city:"Potomac", state:"MD", pars:[4,4,3,5,4,4,3,5,4,3,4,5,4,4,3,4,4,5] },

  // --- MORE MYRTLE BEACH ---
  { name:"True Blue Golf Club", city:"Pawleys Island", state:"SC", pars:[4,5,4,3,4,4,3,5,4,4,3,5,4,4,4,3,5,4] },
  { name:"Legends Resort — Heathland", city:"Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Legends Resort — Moorland", city:"Myrtle Beach", state:"SC", pars:[4,4,3,5,4,4,5,3,4,5,4,3,4,4,3,5,4,4] },
  { name:"Legends Resort — Parkland", city:"Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Prestwick Country Club", city:"Myrtle Beach", state:"SC", pars:[5,4,3,4,4,4,3,5,4,5,4,3,4,4,3,5,4,4] },
  { name:"Thistle Golf Club", city:"Sunset Beach", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Oyster Bay Golf Links", city:"Sunset Beach", state:"NC", pars:[5,4,3,4,4,5,3,4,4,4,4,3,5,4,3,5,4,4] },
  { name:"Rivers Edge Golf Club", city:"Shallotte", state:"NC", pars:[5,4,3,4,4,4,3,5,4,4,3,5,4,4,4,3,5,4] },
  { name:"Crow Creek Golf Club", city:"Calabash", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,5,3,4,4,4,3,5,4] },
  { name:"Arcadian Shores Golf Club", city:"Myrtle Beach", state:"SC", pars:[5,4,4,3,5,4,3,4,4,4,3,4,5,4,4,3,5,4] },
  { name:"Myrtlewood — Palmetto Course", city:"Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,5,4,3,4,4,4,3,5,4] },
  { name:"Myrtlewood — PineHills Course", city:"Myrtle Beach", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Wild Wing — Avocet Course", city:"Conway", state:"SC", pars:[5,4,3,4,4,4,3,5,4,5,4,3,4,4,4,3,5,4] },
  { name:"Farmstead Golf Links", city:"Calabash", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Sandpiper Bay Golf Club", city:"Sunset Beach", state:"NC", pars:[4,5,4,3,4,4,5,3,4,4,5,3,4,4,4,3,5,4] },
  { name:"Sea Trail — Jones Course", city:"Sunset Beach", state:"NC", pars:[4,4,5,3,4,4,3,5,4,4,5,3,4,4,4,3,5,4] },
  { name:"Litchfield Country Club", city:"Pawleys Island", state:"SC", pars:[4,5,4,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Willbrook Plantation", city:"Pawleys Island", state:"SC", pars:[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4] },
  { name:"Members Club at Grande Dunes", city:"Myrtle Beach", state:"SC", pars:[5,4,3,4,4,4,3,5,4,4,3,5,4,4,4,3,5,4] },
  { name:"Pine Lakes Country Club", city:"Myrtle Beach", state:"SC", pars:[4,3,5,4,4,5,4,3,4,4,3,5,4,4,4,3,5,4] },
  { name:"King's North at Myrtle Beach National", city:"Myrtle Beach", state:"SC", pars:[5,3,4,4,4,4,5,3,4,4,3,5,4,4,4,3,5,4] },

  // --- COLORADO ---
  { name:"The Broadmoor — East Course", city:"Colorado Springs", state:"CO", pars:[4,4,5,3,4,5,3,4,4,4,3,4,5,4,4,3,5,4] },
  { name:"Cherry Hills Country Club", city:"Englewood", state:"CO", pars:[4,4,4,4,5,3,4,4,3,4,5,3,4,5,4,4,3,5] },

  // --- TENNESSEE ---
  { name:"TPC Southwind", city:"Memphis", state:"TN", pars:[4,4,4,3,5,4,3,4,5,4,4,3,4,5,3,4,5,4] },

  // --- LOUISIANA ---
  { name:"TPC Louisiana", city:"Avondale", state:"LA", pars:[5,4,3,4,4,5,4,3,4,4,3,5,4,4,3,5,4,4] },

  // --- OKLAHOMA ---
  { name:"Southern Hills Country Club", city:"Tulsa", state:"OK", pars:[4,4,4,4,5,3,4,3,4,4,5,4,4,3,4,4,3,4] },

  // --- MINNESOTA ---
  { name:"Hazeltine National Golf Club", city:"Chaska", state:"MN", pars:[4,5,4,3,4,4,3,5,4,4,3,4,5,4,4,3,5,4] },

  // --- GENERIC PAR 3 COURSE (for Day 1 type events) ---
  { name:"Par 3 Course (All 3s)", city:"Custom", state:"—", pars:[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3] },
];

// Export for module use or just make global
if (typeof window !== 'undefined') window.GOLF_COURSES_DB = GOLF_COURSES_DB;
