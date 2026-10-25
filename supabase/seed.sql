-- GauDhara Seed Data for Initial Herd Testing
-- Provides realistic dairy cow and buffalo baseline profiles

INSERT INTO public.animals (
    id, tag_id, name, breed, date_of_birth, lactation_stage, parity, 
    avg_daily_yield_liters, status, barn_location, rfid_code, last_screened_at, notes
) VALUES
(
    'a1b2c3d4-0001-4000-8000-000000000001',
    'GIR-104',
    'Ganga',
    'Gir (Indigenous Zebu)',
    '2021-03-14',
    'Early',
    2,
    16.5,
    'healthy',
    'Shed 1 - Bay A',
    'RFID-9820-00104',
    NOW() - INTERVAL '4 hours',
    'High genetic merit dam. Teat sphincter morphology optimal.'
),
(
    'a1b2c3d4-0002-4000-8000-000000000002',
    'SAH-208',
    'Kamdhenu',
    'Sahiwal',
    '2020-07-22',
    'Mid',
    3,
    18.2,
    'subclinical_suspect',
    'Shed 1 - Bay B',
    'RFID-9820-00208',
    NOW() - INTERVAL '6 hours',
    'Front-Left (FL) quarter exhibiting slight firmness during post-milking palpation.'
),
(
    'a1b2c3d4-0003-4000-8000-000000000003',
    'MUR-312',
    'Yamuna',
    'Murrah Buffalo',
    '2019-11-05',
    'Mid',
    4,
    14.0,
    'healthy',
    'Shed 2 - Buffalo Stanchion',
    'RFID-9820-00312',
    NOW() - INTERVAL '12 hours',
    'High milk fat (7.8%). Baseline electrical conductivity consistently 4.4 mS/cm.'
),
(
    'a1b2c3d4-0004-4000-8000-000000000004',
    'HFX-405',
    'Lakshmi',
    'HF Cross (Frieswal)',
    '2022-01-18',
    'Early',
    1,
    24.5,
    'clinical_alert',
    'Isolation Pen 1',
    'RFID-9820-00405',
    NOW() - INTERVAL '2 hours',
    'Acute swelling in Rear-Left quarter. Clots observed on foremilk filter.'
),
(
    'a1b2c3d4-0005-4000-8000-000000000005',
    'RDS-519',
    'Nandini',
    'Red Sindhi',
    '2021-09-30',
    'Late',
    2,
    11.8,
    'healthy',
    'Shed 1 - Bay C',
    'RFID-9820-00519',
    NOW() - INTERVAL '24 hours',
    'Approaching dry period in 45 days. Dry cow therapy protocol pending.'
)
ON CONFLICT (id) DO NOTHING;
