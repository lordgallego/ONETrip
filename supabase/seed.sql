-- One Trip seed: a starter fleet for DOST Western Visayas.
insert into public.vehicles (name, plate_number, capacity, active) values
  ('Toyota Hiace 01',  'SAA-001', 14, true),
  ('Toyota Hiace 02',  'SAA-002', 14, true),
  ('Mitsubishi L300',  'SAB-101', 10, true),
  ('Toyota Innova',    'SAC-203',  7, true),
  ('Isuzu Crosswind',  'SAD-310',  8, true)
on conflict do nothing;
