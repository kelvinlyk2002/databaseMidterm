import mysql.connector
import json
conn = mysql.connector.connect(
  host="localhost",
  user="root",
  password="",
  database="midterm"
)

cur = conn.cursor()

f = open('output2.json')
jsonRows = json.load(f)
for jsonRow in jsonRows:
  # check for borough id:
  cur.execute(f"SELECT id FROM borough WHERE name = \"{jsonRow['borough']}\";")
  boroughRes = cur.fetchone()
  if (boroughRes is None):
    # insert new borough
    cur.execute(f"INSERT INTO borough (name) VALUES (\"{jsonRow['borough']}\");")
    boroughRes = cur.lastrowid
  else:
    boroughRes = boroughRes[0]
  
  # check for ward id:
  cur.execute(f"SELECT id FROM ward WHERE name = \"{jsonRow['ward']}\" AND boroughID = {boroughRes} AND wardCode = \"{jsonRow['wardCode']}\";")
  wardRes = cur.fetchone()
  if (wardRes is None):
    # insert new borough
    cur.execute(f"INSERT INTO ward (name, boroughID, wardCode) VALUES (\"{jsonRow['ward']}\", {boroughRes}, \"{jsonRow['wardCode']}\");")
    wardRes = cur.lastrowid
  else:
    wardRes = wardRes[0]

      # check for major crime id:
  cur.execute(f"SELECT id FROM majorCrimeCategory WHERE name = \"{jsonRow['majorCrimeCategory']}\";")
  majorRes = cur.fetchone()
  if (majorRes is None):
    # insert new borough
    cur.execute(f"INSERT INTO majorCrimeCategory (name) VALUES (\"{jsonRow['majorCrimeCategory']}\");")
    majorRes = cur.lastrowid
  else:
    majorRes = majorRes[0]
  
  # check for minor crime id:
  cur.execute(f"SELECT id FROM minorCrimeCategory WHERE name = \"{jsonRow['minorCrimeCategory']}\" AND majorCrimeID = {majorRes};")
  minorRes = cur.fetchone()
  if (minorRes is None):
    # insert new borough
    cur.execute(f"INSERT INTO minorCrimeCategory (name, majorCrimeID) VALUES (\"{jsonRow['minorCrimeCategory']}\", {majorRes});")
    minorRes = cur.lastrowid
  else:
    minorRes = minorRes[0]
  
  if (jsonRow['crimeCount'] is None):
    print("error", jsonRow)
  else:
    cur.execute(f"SELECT id FROM crime WHERE wardID = {wardRes} AND minorCrimeID = {minorRes} AND month = {jsonRow['month']} AND year={jsonRow['year']} AND crimeCount={jsonRow['crimeCount']};")
    crimeRes = cur.fetchone()
    if (crimeRes is None):
      # only insert if not yet inputted
      cur.execute(f"INSERT INTO crime (wardID, minorCrimeID, month, year, crimeCount) VALUES ({wardRes}, {minorRes}, {jsonRow['month']}, {jsonRow['year']}, {jsonRow['crimeCount']});")
      print(f"last inserted crime id: {cur.lastrowid}")

  conn.commit()