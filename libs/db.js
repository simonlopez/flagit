var conf       = require("../conf/"+(process.env.NODE_ENV ? process.env.NODE_ENV : 'dev')),
    mongoose   = require("mongoose"),
    MongoStore = require('connect-mongodb'),
    crypto     = require("crypto"),
    request    = require("request"),
    Schema     = mongoose.Schema,
    ObjectId   = Schema.ObjectId;
var LoginToken, User, db, Place;
var validatePresenceOf = function(value) {
  return value && value.length;
};

var mongoPath = 'mongodb://';
if(conf.db.username) {
  mongoPath+=conf.db.username+(conf.db.password?':'+conf.db.password+'@':'@');
}
mongoPath+= conf.db.host + (conf.db.port?':'+conf.db.port:'') + '/' + conf.db.db;

/*
Model: User
*/
User = new Schema({
  email: {
    type: String,
    validate: [validatePresenceOf, "an email is required"],
    index: {
      unique: true
    }
  },
  hashed_password: String,
  salt: String
});
User.virtual("id").get(function() {
  return this._id.toHexString();
});
User.virtual("password").set(function(password) {
  this._password = password;
  this.salt = this.makeSalt();
  return this.hashed_password = this.encryptPassword(password);
}).get(function() {
  return this._password;
});
User.method("authenticate", function(plainText) {
  return this.encryptPassword(plainText) === this.hashed_password;
});
User.method("makeSalt", function() {
  return Math.round(new Date().valueOf() * Math.random()) + "";
});
User.method("encryptPassword", function(password) {
  return crypto.createHmac("sha1", this.salt).update(password).digest("hex");
});
User.pre("save", function(next) {
  if (!validatePresenceOf(this.password)) {
    return next(new Error("Invalid password"));
  } else {
    return next();
  }
});

/*
Model: LoginToken
Used for session persistence.
*/
LoginToken = new Schema({
  email: {
    type: String,
    index: true
  },
  series: {
    type: String,
    index: true
  },
  token: {
    type: String,
    index: true
  }
});
LoginToken.method("randomToken", function() {
  return Math.round(new Date().valueOf() * Math.random()) + "";
});
LoginToken.pre("save", function(next) {
  this.token = this.randomToken();
  if (this.isNew) {
    this.series = this.randomToken();
  }
  return next();
});
LoginToken.virtual("id").get(function() {
  return this._id.toHexString();
});
LoginToken.virtual("cookieValue").get(function() {
  return JSON.stringify({
    email: this.email,
    token: this.token,
    series: this.series
  });
});

/*
Model: Place
*/
Place = new Schema({
  user_id: {type: String, required: true },
  type: {type: String, required: true },
  lon: {type:Number, required: true},
  lat: {type:Number, required: true},
  name: {type:String, required: true},
  addr: {type:String, required: false},
  updated_at: { type: Date, required: true, default: Date.now}
});
Place.pre("save", function(next) {
  if(!this.lat || !this.lon) {
    if(!this.addr) {
      next(new Error("Can't geocode undefined address!"));
    }
    request('http://open.mapquestapi.com/nominatim/v1/search?format=json&q='+encodeURI(this.addr),
            function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var res;
        try {
          res = JSON.parse(body);
        } catch(e) {
          return next(e);
        }
        if(!res || !res.length) {
          error =  next(new Error("Can't geocode: "+this.addr));
        } else {
          this.lat = res[0].lat;
          this.lon = res[0].lon;
        }
      }
      next(error);
    });
  } else {
    next();
  }
});

mongoose.model("User", User);
mongoose.model("LoginToken", LoginToken);
mongoose.model("Place", Place);

db = mongoose.connect(mongoPath, function(err) {
  if (err) {
    throw err;
  }
  if(conf.debug) console.log('Successfully connected to MongoDB');
});

module.exports = {
  User: mongoose.model("User", User),
  LoginToken: mongoose.model("LoginToken", LoginToken),
  Place: mongoose.model("Place", Place),
  sessionStore: new MongoStore({db:conf.db})
}
