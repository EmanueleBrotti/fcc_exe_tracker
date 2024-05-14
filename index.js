const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const MDB_URI = process.env.MDB;

mongoose
  .connect(MDB_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => console.log(err));

const userSchema = new mongoose.Schema({
  username: String,
  exercises: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static("public"));
app.use(require("body-parser").urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

async function saveUser(req, res, next) {
  const { username } = req.body;
  if (!username) {
    res.status(500).json({ error: "username is missing" });
  } else {
    //checks if user already exists
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      res.json({ username: existingUser.username, _id: existingUser._id });
    } else {
      const newUser = new User({
        username: username,
        exercises: [],
      });
      await newUser
        .save()
        .then(() => {
          res.json({ username: newUser.username, _id: newUser._id });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
}

app.post("/api/users", saveUser, (req, res) => {});

app.get("/api/users", (req, res) => {
  User.find()
    .then((users) =>
      res.json(
        users.map((user) => ({ username: user.username, _id: user._id }))
      )
    )
    .catch((err) => {
      console.log(err);
    });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;

  const { description, duration } = req.body;

  var date = new Date(req.body.date).toDateString();
  if (!date || date === "Invalid Date") {
    date = new Date().toDateString();
  }

  if (!description || !duration) {
    res.status(500).json({ error: "description or duration is missing" });
  } else {
    User.findById(userId)
      .then((user) => {
        if (!user) {
          //doesnt exist
          res.status(500).json({ error: "user not found" });
        } else {
          const exercise = {
            description: description,
            duration: parseInt(duration),
            date: date,
          };

          user.exercises.push(exercise);
          user
            .save()
            .then(() => {
              res.json({
                username: user.username,
                ...exercise,
                _id: user._id,
              });
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

//add log get req
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId)
    .then((user) => {
      if (!user) {
        res.status(500).json({ error: "user not found" });
      } else {
        var exercisesArray = user.exercises;

        const fromDate = new Date(from);
        if (
          from &&
          !isNaN(fromDate) &&
          fromDate.toString() !== "Invalid Date"
        ) {
          exercisesArray = exercisesArray.filter((exercise) => {
            return new Date(exercise.date) >= new Date(from);
          });
        }

        const toDate = new Date(to);
        if (to && !isNaN(toDate) && toDate.toString() !== "Invalid Date") {
          exercisesArray = exercisesArray.filter((exercise) => {
            return new Date(exercise.date) <= new Date(to);
          });
        }

        if (
          limit &&
          limit > 0 &&
          limit < exercisesArray.length &&
          !isNaN(limit)
        ) {
          exercisesArray.length = limit;
        }

        res.json({
          _id: user._id,
          username: user.username,
          count: user.exercises.length,
          log: exercisesArray,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
