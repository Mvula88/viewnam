// ===========================
// ViewNam — Checklist Data
// All inspection points organized by section
// ===========================

const CHECKLIST_SECTIONS = [
    {
        id: 'exterior',
        title: 'Exterior',
        shortTitle: 'Exterior',
        service: ['visual', 'full'],
        groups: [
            {
                title: 'Body Panels & Paintwork',
                items: [
                    { id: 'ext_front_bumper', name: 'Front bumper', desc: 'Cracks, scratches, alignment' },
                    { id: 'ext_bonnet', name: 'Bonnet / Hood', desc: 'Dents, paint condition, alignment with fenders' },
                    { id: 'ext_front_fenders', name: 'Front fenders (L & R)', desc: 'Dents, rust, colour match, panel gaps' },
                    { id: 'ext_front_doors', name: 'Front doors (L & R)', desc: 'Dents, hinges, panel gaps, seal condition' },
                    { id: 'ext_rear_doors', name: 'Rear doors (L & R)', desc: 'Dents, hinges, panel gaps, seal condition' },
                    { id: 'ext_rear_quarters', name: 'Rear fenders / quarters', desc: 'Dents, rust, accident repair signs' },
                    { id: 'ext_roof', name: 'Roof', desc: 'Hail damage, dents, rust, repaint signs' },
                    { id: 'ext_boot', name: 'Boot lid / Tailgate', desc: 'Alignment, dents, latch operation' },
                    { id: 'ext_rear_bumper', name: 'Rear bumper', desc: 'Cracks, scratches, alignment, tow bar damage' },
                    { id: 'ext_paint', name: 'Paint consistency', desc: 'Colour match between panels, overspray, orange peel' },
                    { id: 'ext_rust', name: 'Rust / Corrosion', desc: 'Wheel arches, sills, underbody, door bottoms' },
                ]
            },
            {
                title: 'Glass & Lights',
                items: [
                    { id: 'ext_windscreen', name: 'Windscreen', desc: 'Chips, cracks, visibility, wiper scratches' },
                    { id: 'ext_side_windows', name: 'Side windows', desc: 'Scratches, tint condition, operation' },
                    { id: 'ext_rear_window', name: 'Rear windscreen', desc: 'Cracks, defroster lines intact' },
                    { id: 'ext_headlights', name: 'Headlights (L & R)', desc: 'Clarity, cracks, moisture, low/high beam' },
                    { id: 'ext_taillights', name: 'Tail lights (L & R)', desc: 'Cracks, moisture, brake/reverse/indicator' },
                    { id: 'ext_foglights', name: 'Fog lights & indicators', desc: 'Operation, condition' },
                    { id: 'ext_mirrors', name: 'Side mirrors', desc: 'Condition, electric adjustment, folding' },
                ]
            },
            {
                title: 'Wheels & Tyres',
                items: [
                    { id: 'ext_tyre_fl', name: 'Front left tyre', desc: 'Brand, tread depth (mm), sidewall, age' },
                    { id: 'ext_tyre_fr', name: 'Front right tyre', desc: 'Brand, tread depth (mm), sidewall, age' },
                    { id: 'ext_tyre_rl', name: 'Rear left tyre', desc: 'Brand, tread depth (mm), sidewall, age' },
                    { id: 'ext_tyre_rr', name: 'Rear right tyre', desc: 'Brand, tread depth (mm), sidewall, age' },
                    { id: 'ext_spare', name: 'Spare tyre', desc: 'Present, condition, tools (jack, spanner)' },
                    { id: 'ext_rims', name: 'Rims / Mag wheels', desc: 'Kerb damage, cracks, matching set' },
                    { id: 'ext_tyre_wear', name: 'Uneven tyre wear', desc: 'Indicates alignment / suspension issues' },
                ]
            }
        ]
    },
    {
        id: 'interior',
        title: 'Interior',
        shortTitle: 'Interior',
        service: ['visual', 'full'],
        groups: [
            {
                title: 'Seats & Upholstery',
                items: [
                    { id: 'int_driver_seat', name: 'Driver seat', desc: 'Wear, tears, stains, bolster, adjustment' },
                    { id: 'int_pass_seat', name: 'Passenger seat', desc: 'Wear, tears, stains, adjustment' },
                    { id: 'int_rear_seats', name: 'Rear seats', desc: 'Condition, folding, child seat anchors' },
                    { id: 'int_seatbelts', name: 'Seat belts (all)', desc: 'Retraction, buckle operation, fraying' },
                    { id: 'int_carpet', name: 'Carpet & floor mats', desc: 'Wear, stains, dampness (water leak sign)' },
                    { id: 'int_headliner', name: 'Headliner (roof lining)', desc: 'Sagging, stains, tears' },
                ]
            },
            {
                title: 'Dashboard & Controls',
                items: [
                    { id: 'int_dashboard', name: 'Dashboard condition', desc: 'Cracks, warping, sun damage' },
                    { id: 'int_steering', name: 'Steering wheel', desc: 'Wear, controls, play/looseness' },
                    { id: 'int_instruments', name: 'Instrument cluster', desc: 'All gauges working, warning lights at ignition' },
                    { id: 'int_infotainment', name: 'Infotainment / Radio', desc: 'Operation, Bluetooth, USB, speakers' },
                    { id: 'int_ac', name: 'Air conditioning', desc: 'Blows cold, all fan speeds, no unusual smells' },
                    { id: 'int_heater', name: 'Heater', desc: 'Blows warm, demister works' },
                    { id: 'int_windows', name: 'Electric windows', desc: 'All four operate smoothly, auto up/down' },
                    { id: 'int_locks', name: 'Central locking & key fob', desc: 'All doors, boot, remote operation' },
                    { id: 'int_wipers', name: 'Wipers & washers', desc: 'Front and rear operation, washer fluid' },
                    { id: 'int_horn', name: 'Horn', desc: 'Operational' },
                    { id: 'int_lights', name: 'Interior lights', desc: 'Map lights, dome light, boot light' },
                ]
            },
            {
                title: 'Boot & Documents',
                items: [
                    { id: 'int_boot', name: 'Boot condition', desc: 'Carpet, lining, dampness, smell' },
                    { id: 'int_boot_floor', name: 'Boot floor / spare well', desc: 'Rust, water damage, structural' },
                    { id: 'int_odometer', name: 'Odometer vs wear', desc: 'Pedal wear, seat wear consistent with km?' },
                    { id: 'int_keys', name: 'Number of keys', desc: 'Record how many keys seller has' },
                    { id: 'int_service_book', name: 'Service book present', desc: 'Photograph all stamped pages if available' },
                ]
            }
        ]
    },
    {
        id: 'mechanical',
        title: 'Mechanical',
        shortTitle: 'Mech.',
        service: ['mechanical', 'full'],
        groups: [
            {
                title: 'Engine Bay (Cold Start)',
                items: [
                    { id: 'mech_oil', name: 'Engine oil level & condition', desc: 'Colour, consistency — milky = head gasket' },
                    { id: 'mech_coolant', name: 'Coolant level & condition', desc: 'Reservoir level, colour, oil contamination' },
                    { id: 'mech_brake_fluid', name: 'Brake fluid level', desc: 'Reservoir level, colour (dark = old)' },
                    { id: 'mech_ps_fluid', name: 'Power steering fluid', desc: 'Level, leaks (if hydraulic)' },
                    { id: 'mech_trans_fluid', name: 'Transmission fluid', desc: 'Level, colour, smell (burnt = problem)' },
                    { id: 'mech_battery', name: 'Battery', desc: 'Age, terminal corrosion, secure mount, voltage' },
                    { id: 'mech_belts', name: 'Belts & hoses', desc: 'Cracking, fraying, tension, leaking hoses' },
                    { id: 'mech_air_filter', name: 'Air filter', desc: 'Clean, dirty, or needs replacement' },
                    { id: 'mech_oil_leaks', name: 'Visible oil leaks', desc: 'Engine block, sump, rocker cover, turbo' },
                    { id: 'mech_coolant_leaks', name: 'Coolant leaks', desc: 'Radiator, hoses, water pump, heater core' },
                    { id: 'mech_engine_worked_on', name: 'Signs engine has been worked on', desc: 'Mismatched bolts, fresh gasket sealant, tool marks, non-OEM parts, recently cleaned areas' },
                ]
            },
            {
                title: 'Engine Running',
                items: [
                    { id: 'mech_cold_start', name: 'Cold start behaviour', desc: 'Starts easily, cranking time, smoke on start' },
                    { id: 'mech_idle', name: 'Idle quality', desc: 'Smooth, rough, hunting/surging RPM' },
                    { id: 'mech_exhaust_smoke', name: 'Exhaust smoke', desc: 'Blue=oil, White=coolant, Black=fuel' },
                    { id: 'mech_engine_noise', name: 'Unusual engine noises', desc: 'Knocking, ticking, whining, rattling' },
                    { id: 'mech_temp', name: 'Temperature gauge', desc: 'Reaches normal, holds steady, no overheating' },
                    { id: 'mech_fans', name: 'Radiator fans', desc: 'Engage when engine reaches temperature' },
                ]
            },
            {
                title: 'Undercarriage',
                items: [
                    { id: 'mech_exhaust', name: 'Exhaust system', desc: 'Rust, holes, leaks, loose mounts, cat converter' },
                    { id: 'mech_sump', name: 'Sump / oil pan', desc: 'Leaks, damage, drain plug condition' },
                    { id: 'mech_cv_boots', name: 'CV boots / drive shafts', desc: 'Torn boots, grease leaks' },
                    { id: 'mech_chassis', name: 'Chassis / subframe', desc: 'Rust, cracks, accident damage, welding' },
                ]
            },
            {
                title: 'Brakes & Suspension',
                items: [
                    { id: 'mech_pads_f', name: 'Brake pads (front)', desc: 'Thickness estimate, wear indicator' },
                    { id: 'mech_discs_f', name: 'Brake discs (front)', desc: 'Scoring, lip, warping' },
                    { id: 'mech_brakes_r', name: 'Brake pads & discs (rear)', desc: 'Condition assessment' },
                    { id: 'mech_handbrake', name: 'Handbrake', desc: 'Holds on incline, travel, adjustment' },
                    { id: 'mech_shocks', name: 'Shock absorbers', desc: 'Bounce test, visible leaks, worn bushings' },
                    { id: 'mech_springs', name: 'Springs', desc: 'Sagging, broken coils, vehicle sitting level' },
                    { id: 'mech_bushings', name: 'Bushings & ball joints', desc: 'Play, cracking, clunking' },
                ]
            }
        ]
    },
    {
        id: 'diagnostics',
        title: 'OBD-II Diagnostics',
        shortTitle: 'OBD',
        service: ['mechanical', 'full'],
        groups: [
            {
                title: 'Diagnostic Scan',
                items: [
                    { id: 'obd_cel', name: 'Check Engine Light (CEL)', desc: 'On, off, or recently cleared' },
                    { id: 'obd_active', name: 'Active fault codes', desc: 'List all current DTCs in notes' },
                    { id: 'obd_pending', name: 'Pending fault codes', desc: 'Codes not yet triggering CEL' },
                    { id: 'obd_abs', name: 'ABS system', desc: 'Fault codes, warning light status' },
                    { id: 'obd_airbag', name: 'Airbag (SRS) system', desc: 'Fault codes, warning light status' },
                    { id: 'obd_trans', name: 'Transmission codes', desc: 'Any gearbox or TCU faults' },
                    { id: 'obd_readiness', name: 'Readiness monitors', desc: 'All complete? Recently cleared = red flag' },
                ]
            }
        ]
    },
    {
        id: 'testdrive',
        title: 'Test Drive',
        shortTitle: 'Drive',
        service: ['testdrive', 'full'],
        groups: [
            {
                title: 'Engine & Power',
                items: [
                    { id: 'td_accel', name: 'Acceleration', desc: 'Smooth power delivery, no hesitation' },
                    { id: 'td_turbo', name: 'Turbo (if applicable)', desc: 'Boost response, lag, wastegate sounds' },
                    { id: 'td_engine_noise', name: 'Engine noise under load', desc: 'Knocking, tapping, whining at higher RPM' },
                    { id: 'td_exhaust_smoke', name: 'Exhaust smoke under accel', desc: 'Smoke colour and amount when pushing throttle' },
                ]
            },
            {
                title: 'Transmission',
                items: [
                    { id: 'td_auto_shifts', name: 'Gear changes (auto)', desc: 'Smooth shifts, no jerking/slipping/delay' },
                    { id: 'td_clutch', name: 'Clutch (manual)', desc: 'Bite point, slipping under load, judder' },
                    { id: 'td_gear_select', name: 'Gear selection (manual)', desc: 'All gears engage smoothly, no crunching' },
                    { id: 'td_reverse', name: 'Reverse gear', desc: 'Engages cleanly, no grinding' },
                    { id: 'td_4x4', name: '4x4 system (if applicable)', desc: 'Engages/disengages, diff lock, low range' },
                ]
            },
            {
                title: 'Steering, Suspension & Brakes',
                items: [
                    { id: 'td_steering', name: 'Steering response', desc: 'Sharp, not vague, no excessive play' },
                    { id: 'td_pull', name: 'Vehicle pulls left/right', desc: 'Hands-off straight-line test' },
                    { id: 'td_vibration', name: 'Steering wheel vibration', desc: 'At speed = balance. Under braking = warped discs' },
                    { id: 'td_suspension', name: 'Suspension over bumps', desc: 'Clunking, excessive bouncing, bottoming out' },
                    { id: 'td_braking', name: 'Braking performance', desc: 'Stops straight, no grinding, pedal feel firm' },
                    { id: 'td_abs', name: 'ABS activation', desc: 'Pedal pulsation on hard braking (normal)' },
                ]
            },
            {
                title: 'General Driving Impressions',
                items: [
                    { id: 'td_road_noise', name: 'Road noise', desc: 'Excessive wind/tyre noise, wheel bearing hum' },
                    { id: 'td_rattles', name: 'Unusual rattles or squeaks', desc: 'Dashboard, doors, undercarriage' },
                    { id: 'td_cruise', name: 'Cruise control', desc: 'Engages, holds speed, disengages properly' },
                    { id: 'td_warnings', name: 'Warning lights during drive', desc: 'Any dashboard warnings while driving' },
                ]
            }
        ]
    }
];
