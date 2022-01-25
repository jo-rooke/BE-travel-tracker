CREATE TABLE users (
	id serial PRIMARY KEY ,
	name varchar(50),
	email varchar(50),
	phone varchar(20)
  );

CREATE TABLE contacts (
	id serial PRIMARY KEY,
	contact_of int REFERENCES users (id),
	name varchar(50),
	email varchar(50),
	activated boolean
);

CREATE TABLE trips (
	id serial PRIMARY KEY, 
	user_id int REFERENCES users (id),
	name varchar(100)
);

CREATE TABLE stops (
	id serial PRIMARY KEY,
	trip int REFERENCES trips (id),
  	name varchar(50),
	location_link varchar(255),
	exp_arrival timestamp,
	exp_departure timestamp,
	actual_arrival timestamp, 	
	actual_departure timestamp, 
	best_email varchar(50),
	best_phone varchar(20),
	details text
);

CREATE TABLE trip_companions (
	id serial PRIMARY KEY,
	stop int REFERENCES stops (id),
	name varchar(50),
	contact_type varchar(10),
	contact varchar(50)
);

CREATE TABLE trip_contacts (
	id serial PRIMARY KEY,
	trip int REFERENCES trips (id),
	contact int REFERENCES contacts (id)
);