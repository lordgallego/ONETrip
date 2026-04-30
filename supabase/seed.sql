-- 1TRIP seed: DOST Western Visayas fleet (drivers + plates).
-- The same insert lives at the end of schema.sql so this file is mostly
-- for reference. Re-running it is safe.
delete from public.vehicles;
insert into public.vehicles (name, plate_number, capacity, driver_name, driver_contact, active) values
  ('Hi Ace Van (White)',     'SAA 7104', 14, 'RONIE P. GABORNO',       '0967-983-6360', true),
  ('Hi Ace Van (Gray)',      'SLG 793',  14, 'VICENTE C. PALINGCOD',   '0951-991-8128', true),
  ('Toyota Land Cruiser',    'SGJ 244',   7, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Ford Ranger Pick Up',    'SJS 685',   5, 'ISIDRO P. GABORNO JR.',  '0975-373-9587', true),
  ('Toyota Innova',          'SFA 3748',  7, 'CORNELIO T. MABERA',     '0949-750-7858', true);
