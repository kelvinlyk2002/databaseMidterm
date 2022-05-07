import json
f = open('output2.json')
jsonRows = json.load(f)
knownWardCode = []
for jsonRow in jsonRows:
    if(jsonRow['wardCode'] not in knownWardCode):
        knownWardCode.append(jsonRow['wardCode'])
    
f = open('uk.geojson')
jsonRows = json.load(f)

londonWards = []
for featureRow in jsonRows['features']:
    if(featureRow['properties']['WD21CD'] in knownWardCode):
        londonWards.append(featureRow)

londonGEOJSON = {
    "type": "FeatureCollection",
    "name": "londonWards",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": londonWards
}
with open("london.geojson", "w") as outfile:
    json.dump(londonGEOJSON, outfile)

print("done")