const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose
  .connect(
    process.env.MONGO_URI,
    { useNewUrlParser: true } || "mongodb://localhost/exercise-track"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

//mongoose deprecation fixes
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//SCHEMAS
let Schema = mongoose.Schema;
let userSchema = new Schema({
  username: String,
  count: Number,
  log: [{ description: String, duration: Number, date: { type: Date } }]
});
let userData = mongoose.model("userData", userSchema);

//app code starts
//add new user and gve back username and userId
app.post("/api/exercise/new-user", (req, res, next) => {
  userData.find({ username: req.body.username }, (err, data) => {
    if (err) throw err;
    if (data.length != 0) {
      return res.send("username already exists");
    } else {
      let user = new userData({ username: req.body.username, count: 0 });
      user.save((err, data) => {
        if (err) throw err;
        else res.json({ username: data.username, userId: data._id });
      });
    }
  });
});
//add exercise to a given userId with details and return json details of current exercise added
app.post("/api/exercise/add", (req, res, next) => {
  let d;
  if (req.body.date == "") {
    d = new Date();
    d = d.toDateString();
  } else {
    d = new Date(req.body.date);
    d = d.toDateString();
  }
  userData.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $inc: { count: 1 },
      $push: {
        log: [
          {
            description: req.body.description,
            duration: req.body.duration,
            date: d
          }
        ]
      }
    },
    (err, data) => {
      if (err) return res.send("Invalid userId");
      if (data) {
        res.json({
          username: data.username,
          userId: data._id,
          description: req.body.description,
          duration: req.body.duration,
          date: d
        });
      }
    }
  );
});

//GET /api/exercise/log?{userId}[&from][&to][&limit]
app.get("/api/exercise/log", (req, res, next) => {
  let userId = req.query.userId,
    from = req.query.from,
    to = req.query.to,
    limit = req.query.limit;

  if (!userId) {
    res.send("Please pass userId");
  } else {
    userData
      .find(mongoose.Types.ObjectId(userId))
      .select("-log._id")
      .exec((err, data) => {
        if (err) throw err;
        if (data.length == 0) return res.send("Invalid userId");

        //sort log array of data in asc order of dates
        let sortedArray = data[0].log.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        //return log array data starting from a date,ending upto a date or between from && to range of dates
        let logArray = sortedArray.filter(a => {
          if (from && to)
            return (
              new Date(a.date) >= new Date(from) &&
              new Date(a.date) <= new Date(to)
            );
          if (from) return new Date(a.date) >= new Date(from);
          if (to) return new Date(a.date) <= new Date(to);
        });
        //changing dates to simple string
        sortedArray = sortedArray.map(a => {
          return {
            description: a.description,
            duration: a.duration,
            date: a.date.toDateString()
          };
        });
        logArray = logArray.map(a => {
          return {
            description: a.description,
            duration: a.duration,
            date: a.date.toDateString()
          };
        });
        if (limit) {
          //limit the output
          sortedArray = sortedArray.slice(0, limit);
          logArray = logArray.slice(0, limit);
        }

        if (from || to) {
          res.send({
            username: data[0].username,
            userId: data[0]._id,
            count: logArray.length,
            from: from,
            to: to,
            log: logArray
          });
        } else
          res.send({
            username: data[0].username,
            userId: data[0]._id,
            count: sortedArray.length,
            log: sortedArray
          });
      }); //exec ending
  } //else ending
});

//Show all usernames and their id
app.get("/api/exercise/users", (req, res, next) => {
  userData.find({}, function(err, users) {
    var userMap = [];
    users.map((item, i, arr) => {
      userMap.push({ username: item.username, userId: item._id });
    });
    res.send(userMap);
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
