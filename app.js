var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var router = express.Router();

var app = express();

var logger = function(req,res,next){
    console.log("IAS Index Page loading.....");
    next();
}
app.use(logger);

// define view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

// set static path
app.use(express.static(path.join(__dirname, 'public')));

// enable CORS
var cors = require('cors');
app.use(cors());

app.get('/', function(req, res){
    res.render('image_capture');
});

app.post('/video-upload',function(req,res,callback){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(req.body.data);
});

app.get('/face-recognition',function(req,res,callback){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(req.body.data);
});

app.listen(3000,function(){
    console.log("..IAS Server started on port 3000");
});
