import pandas as pd
import requests, os, argparse, json


def get_response(start_lat, start_lng, end_lat, end_lng):
	url = 'https://maps.googleapis.com/maps/api/directions/json?'
	api_key = os.environ["GOOGLE_API_KEY"]
	data = {'origin' : f'{start_lat},{start_lng}',
	'destination':f'{end_lat},{end_lng}','key':api_key}
	response = requests.get(url, params = data)
	response_code = int(response.status_code)
	data = json.loads(response.text)
	print(response_code)
	if data["status"] != "ZERO_RESULTS":
		steps = data['routes'][0]['legs'][0]['steps']
		polylines = [polyline['polyline']['points'] for polyline in steps]
		segment_times = [segment['duration']['value'] for segment in steps]
		values = [response_code, polylines, segment_times]
	else:
		values = [response_code, None, None]
	return values

def get_polylines(tracker_file, data_file):
	df = pd.read_csv(tracker_file)
	json_data = json.load(open(data_file, 'r'))
	df["Response Code"] = df["O-D Pair"].apply(lambda x: 200 if x in json_data and json_data[x]["polylines"] != None else None)
	for index, row in df.iterrows():
		if index % 50 == 0:
			print(f"Processing record {index} out of {df.shape[0]}...")
		if row["Response Code"] != 200:
			response_code, polylines, segment_times = get_response(row["Start Latitude"], row["Start Longitude"], row["End Latitude"], row["End Longitude"]) 
			row["Response Code"] = response_code
			if response_code == 200:
				json_data[row["O-D Pair"]] = {"polylines":polylines, "segment_times":segment_times}
				json.dump(json_data, open(data_file, 'w'))

if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument('-t', '--tracker_file', nargs = 1, type = str)
	parser.add_argument('-d', '--data_file', nargs = 1, type = str)

	params = {}
	args = parser.parse_args()
	params['tracker_file'] = args.tracker_file[0]
	params['data_file'] = args.data_file[0]

	get_polylines(**params)

