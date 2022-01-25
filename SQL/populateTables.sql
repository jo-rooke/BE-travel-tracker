INSERT INTO users (name, email, phone) values 
('Jo', 'joely.rooke@gmail.com', '+447443915741'), 
('Veta', 'veta@gmail.com', '+4412345678901'), 
('Linus', 'linus@gmail.com', '+4486735019466'),
('Nico', 'nico@gmail.com', '+447444555666');

INSERT INTO trips (user_id, name) values 
(1, 'Cabo Verde'), 
(1, 'South Korea'), 
(3, 'Paris'),
(2, 'Japan');

INSERT INTO contacts (contact_of, name, email, activated) values 
(1, 'Mandy Rooke', 'joely.rooke.17@ucl.ac.uk', true), 
(1, 'Will Mundy', 'will.mundy@hotmail.com', false), 
(2, 'Jo Rooke', 'joely.rooke@gmail.com', true);

INSERT INTO stops (trip, 
    name, 
    location_link,
	exp_arrival,
	exp_departure,
	actual_arrival, 	
	actual_departure, 
	best_email,
	best_phone,
	details) values 
    (1, 'Stansted', 'https://goo.gl/maps/ZFHJpg6ZAZu6veF17', '2022-01-21T10:32:14.307Z', '2022-01-21T12:32:14.307Z', null, null, 'joely.rooke@gmail.com', '+447443915741', 'Gonna get a panini at starbucks'),
    (1, 'Amílcar Cabral International Airport', 'https://goo.gl/maps/3Zbxhysy7NCJ9NsC8', '2022-01-21T16:32:14.307Z', '2022-01-21T15:32:14.307Z', null, null, 'joely.rooke@gmail.com', '+447443915741', 'hope my visa works'),
    (1, 'Susie Apartment', 'https://goo.gl/maps/bDbnAzQ7ABGvVBqz8', '2022-01-21T16:32:14.307Z', '2022-01-21T15:32:14.307Z', null, null, 'joely.rooke@gmail.com', '+447443915741', 'Cannot wait to see the sea from her balcony');

INSERT INTO trip_contacts (stop, contact) values (1, 1), (4,3);

INSERT INTO trip_companions (stop, name, contact_type, contact) values 
(1, 'Will', 'will.mundy@hotmail.com'), 
(2, 'Will', 'will.mundy@hotmail.com'), 
(3, 'Susie', 'susie@gmail.com')


