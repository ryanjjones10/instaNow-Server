var express = require('express');
var path = require('path')
var bodyParser = require('body-parser');
var morgan = require('morgan');
var api = require('instagram-node').instagram();
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var keys = require('./config');
 
//using this module https://www.npmjs.com/package/instagram-node

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

api.use({
  client_id: keys.InstaClientID,
  client_secret: keys.InstaClientSecret
});
 
var redirect_uri = 'https://insta-now.herokuapp.com/handleauth';
var callbackURL = 'https://insta-now.herokuapp.com/newImages';
var token;
var subscriptionID;
var recentImages;
var newImages = [];

var authorize_user = function(req, res) {
  res.redirect(api.get_authorization_url(redirect_uri, { scope: ['likes'], state: 'a state' }));
};
 
var handleauth = function(req, res) {
  api.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
      console.log(err.body);
      res.send("Did not obtain token");
    } else {
      console.log('token is ' + result.access_token);
      token = result.access_token;
      setSubscription(37.773038, -122.422785);
    }
  });
};

app.route('/newImages')
  .get(function(req, res){
    console.log('trying to get')
    res.send(
      req.query['hub.challenge']
    )
  })
  .post(function(req, res){
    console.log('this is the incoming data', res.body)
    newImages.push(res.body)
  });

// This is where you would initially send users to authorize 
app.get('/authorize_user', authorize_user);
// This is your redirect URI 
app.get('/handleauth', handleauth);

// geography subscription
var setSubscription = function(lat, lng){
  api.add_geography_subscription(lat, lng, 20, callbackURL, token, function(err, result, remaining, limit){
    console.log('subscription result ', result);
    subscriptionID = result.object_id;
    console.log('this is the error from subscription ', err);
    getImages(lat, lng)
  });
}

var getImages = function(lat, lng){
  api.media_search(lat, lng, 20, function(err, result, remaining, limit) {
    console.log('these are the results from geography ', result);
    recentImages = result;
    console.log('this is the error from geography', err);
  });
}

io.on('connection', function(socket){
  socket.emit('recent', recentImages)
  socket.emit('current images', newImages);
});

module.exports = app;