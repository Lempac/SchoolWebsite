/*
TODO
[ ]:add data compatibilty
[ ]:Optimize storage
[ ]:
*/
import sqlite from "sqlite3";
import express from "express";
import ViteExpress from "vite-express";
import fs from"node:fs";

const hostname = '127.0.0.1';
const port = 8080;
const defaultIndex = "/index.html";
const urlPossibleTables = 'https://pikcrvt.edupage.org/timetable/server/ttviewer.js?__func=getTTViewerData';
const urlDataOftt_num = 'https://pikcrvt.edupage.org/timetable/server/regulartt.js?__func=regularttGetData';
const urlGetSubstViewerDayDataHtml = "https://pikcrvt.edupage.org/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml";

let searchQueries: { [id: string]: string[] } = {
  "TimeTables": [],
  "Subjects": [],
  "Classes": [],
  "Teachers": [],
  "Buildings": [],
  "Rooms": [],
  "Lessions": [],
  "Periods": [],
  "Days": []
}

console.log("Creating database and adding tables...");
const db = new sqlite.Database("scheldule.sqlite");
db.run("CREATE TABLE IF NOT EXISTS TimeTables(ID INTEGER, Title TEXT, Year INTEGER, Dateform TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Subjects(ID TEXT, Name TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Classes(ID TEXT, Name TEXT, TeacherId TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Groups(ID TEXT, Name TEXT, Classid TEXT, EntireClass INTEGER, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Days(ID TEXT, TimeTableId TEXT, LessonId TEXT, Period TEXT, Day INTEGER, ClassRoomIds TEXT, PRIMARY KEY (ID, TimeTableId));");
db.run("CREATE TABLE IF NOT EXISTS Teachers(ID TEXT, Name TEXT, Gender TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Buildings(ID, Name TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Rooms(ID TEXT, Name TEXT, BuildingID TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Lessions(ID TEXT, SubjectId TEXT, TeacherId TEXT, ClassIds TEXT, GroupIds TEXT, RoomIds TEXT, PRIMARY KEY (ID));");
db.run("CREATE TABLE IF NOT EXISTS Periods(ID TEXT, Period TEXT, StartTime TEXT, EndTime TEXT, PRIMARY KEY (ID));");

function ReturnRequstPossibleTables(Year: Number = new Date().getFullYear()) {
  return `{"__args":[null, ${Year}],"__gsh":"00000000"}`;
}

function ReturnRequstOftt_num(Id: number) {
  return `{"__args": [null, "${Id}"], "__gsh": "00000000"}`;
}

function ReturnRequstSubstViewerDayDataHtml(date : Date, mode : "teachers" | "classes"){
  return `{"__args":[null,{"date":"${date.toISOString().split('T')[0]}","mode":"${mode}"}],"__gsh":"00000000"}`
}

const app = express();

const server = app.listen(port, hostname, () => console.log("Server is listening..."));

app.get("/message", (_, res) => res.send("Hello from express!"));
app.get("/", (_, res) => {
  res.sendFile(__dirname + defaultIndex)
});
app.post("/", (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (Object.keys(url.searchParams).length != 0) {

  }
  else {
    res.send(searchQueries);
  }
})

ViteExpress.bind(app, server);

function search(obj: object, fn: Function, results: object[] = [], k: any = undefined) {
  if (fn(obj, k)) results.push(obj);
  if (typeof obj !== "object" || obj === null) return results;
  for (const [k, v] of Object.entries(obj)) {
    search(v, fn, results, k);
  }
  return results;
}

function daysToNumber(days: string): number {
  switch (days) {
    case "10000":
      return 1;
    case "01000":
      return 2;
    case "00100":
      return 3;
    case "00010":
      return 4;
    case "00001":
      return 5;
    default:
      return 0;
  }
}

async function DataUpdate() {
  const response = await fetch(urlPossibleTables, {
    method: "POST",
    body: ReturnRequstPossibleTables(),
    headers: { "Content-Type": "application/json" },
  }).catch(e => console.warn(e));
  if (response == undefined) return;
  const body = await response.json() as object;

  db.run(`INSERT INTO TimeTables (ID, Title, Year, Dateform)
  VALUES ${(() => {
      var str = "";
      (search(body, (_: any, k: string) => { return k == "timetables"; })[0] as [{ tt_num: string; year: number; text: string; datefrom: string; hidden: boolean }]).forEach((TimeTable) => {
        str += `(${Number(TimeTable.tt_num)}, "${TimeTable.text}", ${Number(TimeTable.year)}, "${TimeTable.datefrom}"),`;
      })
      str = str.replace(/.$/, "");
      return str;
    })()}
  ON CONFLICT (ID) DO NOTHING;`);

  db.all("SELECT ID FROM TimeTables ORDER BY ID DESC", (err, rows : [{ID : number}]) => {
    rows.forEach(async (obj) => {
      const response = await fetch(urlDataOftt_num, {
        method: "POST",
        body: ReturnRequstOftt_num(obj.ID),
        headers: { "Content-Type": "application/json" },
      }).catch(e => console.warn(e));
      if (response == undefined) return;
      var rawData = (await response.json() as any)["r"]["dbiAccessorRes"];
      if (rawData == null) return;
      else rawData = rawData["tables"];
      var data = search(rawData, (_: any, k: string) => { return k == "data_rows"; });
      fs.writeFile(`./data-${obj.ID}.json`, JSON.stringify(data), err => {});
      var periods = data[1] as [{ id: string, period: string, starttime: string, endtime: string }];
      var buildings = data[10] as [{ id: string, name: string }];
      var rooms = data[11] as [{ id: string, name: string, buildingid: string }];
      var classDatas = data[12] as [{ id: string, name: string, teacherid: string }];
      var subjects = data[13] as [{ id: string, name: string }];
      var teachers = data[14] as [{ id: string, short: string, gender: string }];
      var groupids = data[15] as [{ id: string, name: string, classid: string, entireclass: boolean }];
      var lessions = data[18] as [{ id: string, subjectid: string, teacherids: string, groupids: string, classids: string, classroomidss: string }];
      var days = data[20] as [{ id: string, lessonid: string, period: string, days: string, classroomids: string }];
  
      db.run(`INSERT INTO Periods (ID, Period, StartTime, EndTime)
      VALUES ${(() => {
          var str = "";
          periods.forEach(async (period) => {
            str += `("${period.id}", "${period.period}", "${period.starttime}", "${period.endtime}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Buildings (ID, Name)
      VALUES ${(() => {
          var str = "";
          buildings.forEach(async (building) => {
            str += `("${building.id}", "${building.name}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Rooms (ID , Name, BuildingID)
      VALUES ${(() => {
          var str = "";
          rooms.forEach(async (room) => {
            str += `("${room.id}", "${room.name}", "${room.buildingid}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Classes (ID, Name, TeacherId)
      VALUES ${(() => {
          var str = "";
          classDatas.forEach(async (classData) => {
            str += `("${classData.id}", "${classData.name}", "${classData.teacherid}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Subjects (ID, Name)
      VALUES ${(() => {
          var str = "";
          subjects.forEach(async (subject) => {
            str += `("${subject.id}", "${subject.name}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Teachers (ID, Name, Gender)
      VALUES ${(() => {
          var str = "";
          teachers.forEach(async (teacher) => {
            str += `("${teacher.id}", "${teacher.short}", "${teacher.gender}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Groups (ID, Name, ClassId, EntireClass)
      VALUES ${(() => {
          var str = "";
          groupids.forEach(async (groupid) => {
            str += `("${groupid.id}", "${groupid.name}", "${groupid.classid}", ${groupid.entireclass}),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Lessions (ID, SubjectId, TeacherId, ClassIds, GroupIds, RoomIds)
      VALUES ${(() => {
          var str = "";
          lessions.forEach(async (lession) => {
            str += `("${lession.id}", "${lession.subjectid}", "${lession.teacherids}", "${lession.classids}", "${lession.groupids}", "${lession.classroomidss}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID) DO NOTHING;`);
  
      db.run(`INSERT INTO Days (ID, TimeTableId, LessonId, Period, Day, ClassRoomIds)
      VALUES ${(() => {
          var str = "";
          days.forEach(async (day) => {
            str += `("${day.id}", "${obj.ID}", "${day.lessonid}", "${day.period}", ${daysToNumber(day.days)}, "${day.classroomids}"),`;
          })
          str = str.replace(/.$/, "");
          return str;
        })()}
      ON CONFLICT (ID, TimeTableId) DO NOTHING;`);
  
      // console.log(periods);
      // console.log(buildings);
      // console.log(rooms);
      // console.log(classData);
      // console.log(subjects);
      // console.log(teachers);
      // console.log(groupids);
      // console.log(lessions);
      console.log(`Done parsing ${obj.ID}.`);
    })
  })
}

async function UpdateSearchQueries() {
  for (const key of Object.keys(searchQueries)) {
    switch (key) {
      case "TimeTables":
        db.all(`SELECT Title FROM TimeTables ORDER BY ID DESC`, (error, rows : [{ key: string }]) => searchQueries[key] = rows.map(val => Object.values(val)[0]));
        break;
      case "Classes":
        db.all(`SELECT Name FROM Classes`, (error, rows : [{ key: string }]) => searchQueries[key] = rows.map(val => Object.values(val)[0]).sort());
        break;
      case "Rooms":
        db.all(`SELECT Name FROM Rooms`, (error, rows : [{ key: string }]) => searchQueries[key] = rows.map(val => Object.values(val)[0]).sort());
        break;
    }
  }
}

UpdateSearchQueries()
DataUpdate()
setInterval(() => {
  DataUpdate()
  UpdateSearchQueries()
}, 86400000)