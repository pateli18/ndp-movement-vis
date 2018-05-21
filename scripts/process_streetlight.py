import pandas as pd
import argparse

def process_od(input_file, coordinates_file, output_file):
	df = pd.read_csv(input_file)
	df = df[(df["Origin Zone ID"].notnull()) & (df["Destination Zone ID"].notnull())]
	df = df[df["Day Type"] == "1: Average Weekday (M-F)"]
	df = df[df["Day Part"] != "00: All Day (12am-12am)"]
	df["Time"] = pd.to_datetime(df["Day Part"].apply(lambda x: "2017-07-05 " + x.split(":")[1].split("(")[0].strip()))
	df["Origin Zone ID"] = df["Origin Zone ID"].astype(int)
	df["Destination Zone ID"] = df["Destination Zone ID"].astype(int)
	
	df_coordinates = pd.read_csv(coordinates_file)
	df = df.merge(df_coordinates, how = "left", left_on = "Origin Zone ID", right_on = "Id")
	df.rename(columns = {"Latitude":"Start Latitude", "Longitude":"Start Longitude"}, inplace = True)

	df = df.merge(df_coordinates, how = "left", left_on = "Destination Zone ID", right_on = "Id")
	df.rename(columns = {"Latitude":"End Latitude", "Longitude":"End Longitude"}, inplace = True)

	df.sort_values(["Origin Zone ID", "Destination Zone ID"], ascending=[True,True], inplace=True)
	df["O-D Pair"] = df.apply(lambda row: f"{row['Origin Zone ID']}-{row['Destination Zone ID']}", axis = 1)
	columns_to_keep = ["O-D Pair", "Time", 'O-D Traffic (Trip Counts)',"Start Latitude", "Start Longitude", "End Latitude", "End Longitude"]
	df = df[columns_to_keep]
	df.fillna(0, inplace = True)
	df.to_csv(output_file, index = False)

	df_polylines = df.drop_duplicates("O-D Pair")
	df_polylines = df_polylines[["O-D Pair", "Start Latitude", "Start Longitude", "End Latitude", "End Longitude"]]
	df_polylines.to_csv(output_file.replace(".csv", "_polylines_tracker.csv"), index = False)

if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument('-i', '--input_file', nargs = 1, type = str)
	parser.add_argument('-c', '--coordinates_file', nargs = 1, type = str)
	parser.add_argument('-o', '--output_file', nargs = 1, type = str)

	params = {}
	args = parser.parse_args()
	params['input_file'] = args.input_file[0]
	params['coordinates_file'] = args.coordinates_file[0]
	params['output_file'] = args.output_file[0]

	process_od(**params)