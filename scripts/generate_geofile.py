import argparse, json, random
import pandas as pd

def decode(point_str):
	'''Decodes a polyline that has been encoded using Google's algorithm
	http://code.google.com/apis/maps/documentation/polylinealgorithm.html
	
	This is a generic method that returns a list of (latitude, longitude) 
	tuples.
	
	:param point_str: Encoded polyline string.
	:type point_str: string
	:returns: List of 2-tuples where each tuple is (latitude, longitude)
	:rtype: list
	
	'''
			
	# sone coordinate offset is represented by 4 to 5 binary chunks
	coord_chunks = [[]]
	for char in point_str:
		
		# convert each character to decimal from ascii
		value = ord(char) - 63
		
		# values that have a chunk following have an extra 1 on the left
		split_after = not (value & 0x20)         
		value &= 0x1F
		
		coord_chunks[-1].append(value)
		
		if split_after:
				coord_chunks.append([])
		
	del coord_chunks[-1]
	
	coords = []
	
	for coord_chunk in coord_chunks:
		coord = 0
		
		for i, chunk in enumerate(coord_chunk):                    
			coord |= chunk << (i * 5) 
		
		#there is a 1 on the right if the coord is negative
		if coord & 0x1:
			coord = ~coord #invert
		coord >>= 1
		coord /= 100000.0
					
		coords.append(coord)
	
	# convert the 1 dimensional list to a 2 dimensional list and offsets to 
	# actual values
	points = []
	prev_x = 0
	prev_y = 0
	for i in range(0, len(coords) - 1, 2):
		if coords[i] == 0 and coords[i + 1] == 0:
			continue
		
		prev_x += coords[i + 1]
		prev_y += coords[i]
		# a round to 6 digits ensures that the floats are the same as when 
		# they were encoded
		points.append([round(prev_x, 6), round(prev_y, 6)])
	
	return points  

def generate_geofile(polyline_input_file, data_input_file, data_output_file):
	polyline_input_data = json.load(open(polyline_input_file, 'r'))
	data_input_file = pd.read_csv(data_input_file)
	data_input_file["Time"] = pd.to_datetime(data_input_file["Time"])
	output_data = []
	id_counter = 0
	for trip_id, route in enumerate(polyline_input_data):
		times = data_input_file[data_input_file["O-D Pair"] == route]["Time"].tolist()
		for base_time in times:
			time = base_time + pd.Timedelta(seconds=random.randint(0, 50) * 60)
			duration = polyline_input_data[route]["segment_times"]
			polyline = [decode(polyline) for polyline in polyline_input_data[route]["polylines"]]
			for i, segment in enumerate(polyline):
				time_increment = duration[i] * 1.0 / len(segment)
				for coordinate in segment:
					output_data.append({'trip': id_counter, 'timestamp' : time, 
								 'lat' : coordinate[1], 'lng' : coordinate[0]})
					time = time + pd.Timedelta(seconds=time_increment)
			id_counter += 1
			print(id_counter)
	df = pd.DataFrame(output_data)
	df.to_csv(data_output_file, index = False)

def generate_geojson(polyline_input_file, data_input_file, polyline_output_file, data_output_file):
	polyline_input_data = json.load(open(polyline_input_file, 'r'))
	polyline_indexes = {}
	output_data = []
	for i, route in enumerate(polyline_input_data):
		polyline_indexes[route] = i
		polyline_item = polyline_input_data[route]
		coordinates = [coordinate for polyline in polyline_item["polylines"] for coordinate in decode(polyline)]
		data = {"type":"Feature", "geometry":{"type": "LineString","coordinates":coordinates}, "properties":{"route":route, "time":sum(polyline_item["segment_times"])}}
		output_data.append(data)
	json.dump(output_data, open(polyline_output_file, "w"))

	data_input_file = pd.read_csv(data_input_file)
	data_input_file["route_id"] = data_input_file["O-D Pair"].apply(lambda x: polyline_indexes[x])

	output_data = []
	data_input_file["timestamp"] = pd.to_datetime(data_input_file["Time"])
	for index, row in data_input_file.iterrows():
		num_trips = int(row["O-D Traffic (Trip Counts)"])
		for trip in range(num_trips):
			timestamp = row["timestamp"] + pd.Timedelta(seconds=random.randint(0, 50) * 60)
			route_id = row["route_id"]
			output_data.append({"route_id":route_id, "timestamp":timestamp})

	output_df = pd.DataFrame(output_data)
	output_df["timestamp"] = output_df["timestamp"].dt.time
	output_df.sort_values(by="timestamp", inplace = True)
	output_df.to_csv(data_output_file, index = False)


if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument('-j', '--geojson', nargs='?', default = False, type = bool)
	parser.add_argument('-pi', '--polyline_input_file', nargs = 1, type = str)
	parser.add_argument('-di', '--data_input_file', nargs = 1, type = str)
	parser.add_argument('-po', '--polyline_output_file', nargs = 1, type = str)
	parser.add_argument('-do', '--data_output_file', nargs = 1, type = str)

	params = {}
	args = parser.parse_args()
	params['polyline_input_file'] = args.polyline_input_file[0]
	params['data_input_file'] = args.data_input_file[0]
	params['data_output_file'] = args.data_output_file[0]
	if args.geojson:
		params['polyline_output_file'] = args.polyline_output_file[0]
		generate_geojson(**params)
	else:
		generate_geofile(**params)