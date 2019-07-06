const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true } || 'mongodb://localhost/exercise-track' )
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.log(err));

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//SCHEMAS
let Schema = mongoose.Schema;
let userSchema =  new Schema({ username: String,count:Number,log:[{"description":String,"duration":Number,"date":{ type: Date, default: Date.now() }}] });
let userData =mongoose.model('userData',userSchema);

//app code starts
app.post('/api/exercise/new-user',(req,res,next)=>{
  let user = new userData({username:req.body.username,count:0});
  user.save((err,data)=>{
    if (err) throw err;
    else res.json({username:data.username, userId:data._id});
  })
})

app.post('/api/exercise/add',(req,res,next)=>{
  console.log(req.body) //count also
  userData.findOneAndUpdate({_id:req.body.userId},{$inc:{count:1},$set:{log:[{description:req.body.description,duration:req.body.duration,date:req.body.date}]}},(err,data)=>{
    if(err) throw err;
   if(data){
   res.json({username:data.username,userId:data._id,count:data.count+1,log:[{"description":req.body.description,"duration":req.body.duration,"date":req.body.date||Date()}]})
   }
   });
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
