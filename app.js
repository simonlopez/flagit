var express = require('express'),
    mailer = require('mailer'),
    path = require('path'),
    engine = require('ejs-locals'),
    Session = require('connect-mongodb'),
    connect = require('connect'),
    MemStore = connect.session.MemoryStore,
    conf = require("./conf/"+(process.env.NODE_ENV ? process.env.NODE_ENV : 'dev')),
    db = require("./libs/db");

var app = express();
var emails = {
  send: function(dst, subject, body) {
    var mailOptions = JSON.parse(JSON.stringify(conf.mail));
    mailOptions.to = dst;
    mailOptions.subject = subject;
    mailOptions.body = body;
    return mailer.send(mailOptions, function(err, result) {
      if (err) {
        return console.log(err);
      }
    });
  },
  sendWelcome: function(user) {
    return this.send(user.email,"Welcome to flagIt","Welcome to flagIt.");
  }
};

app.configure(function() {
  app.engine("ejs", engine);
  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");
  app.use(express.favicon());
  app.use(express["static"](__dirname + "/public"));
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(app.router);
  app.set('port', conf.server.port);
  app.set('host', conf.server.host);
  /*app.use(express.logger({
    format: "\u001b[1m:method\u001b[0m \u001b[33m:         url\u001b[0m :response-time ms"
  }));*/
  app.use(express.session({
    store: new MemStore({reapInterval: 60000 * 10}),//new Session({db: db.db, reapInterval: 3000, maxAge: 300000}),
    secret: conf.secret
  }));
});

var authenticateFromLoginToken = function(req, res, next) {
  var cookie;
  cookie = JSON.parse(req.cookies.logintoken);
  return db.LoginToken.findOne({
    email: cookie.email,
    series: cookie.series,
    token: cookie.token
  }, (function(err, token) {
    if (!token) {
      res.redirect("/sessions/new");
      return;
    }
    return db.User.findOne({
      email: token.email
    }, function(err, user) {
      if (user) {
        req.currentUser = user;
        token.token = token.randomToken();
        return token.save(function() {
          res.cookie("logintoken", token.cookieValue, {
            expires: new Date(Date.now() + 2 * 604800000),
            path: "/"
          });
          return next();
        });
      } else {
        return res.redirect("/sessions/new");
      }
    });
  }));
};

var loadUser = function(req, res, next) {
  if (req.cookies.logintoken) {
    return authenticateFromLoginToken(req, res, next);
  } else {
    return res.redirect("/sessions/new");
  }
};

var filterPlace = function(place) {
  return {
    id        : place.id,
    name      : place.name,
    type      : place.type,
    lat       : place.lat,
    lon       : place.lon,
    addr      : place.addr?place.addr:undefined,
    updated_at: place.updated_at
  };
}

app.get("/", loadUser, function(req, res, next) {
  return res.render("index.ejs", {
    title: conf.name
  });
});

app.get("/places", loadUser, function(req, res, next) {
  var user_id = req.currentUser.id;
  db.Place.find({user_id: user_id}, function (err,places){
    if (err) {
      return res.send(500, 'Something broke!');
    }
    var result = [];
    for(var i= 0; i < places.length; i++) {
      result.push(filterPlace(places[i]));
    }
    res.send(200, result);
  });
});

app.post("/places", loadUser, function(req, res, next) {
  var user_id = req.currentUser.id;
  new db.Place({
    user_id: user_id,
    name   : req.body.name,
    type   : req.body.type,
    addr   : req.body.addr,
    lat    : req.body.lat,
    lon    : req.body.lon
  }).save(function(err, place){
    if (err) {
      return next(err);
    }
    //res.send(200, filterPlace(place));
    return res.redirect("/");
  });
});

app.get("/users/new", function(req, res, next) {
  var cookie;
  if (req.cookies.logintoken) {
    cookie = JSON.parse(req.cookies.logintoken);
    return db.LoginToken.findOne({
      email: cookie.email,
      series: cookie.series,
      token: cookie.token
    }, (function(err, token) {
      if (!token) {
        return res.render("create.ejs", {
          title: conf.name
        });
      }
      return db.User.findOne({
        email: token.email
      }, function(err, user) {
        if (user) {
          req.currentUser = user;
          token.token = token.randomToken();
          return token.save(function() {
            res.cookie("logintoken", token.cookieValue, {
              expires: new Date(Date.now() + 2 * 604800000),
              path: "/"
            });
            return res.redirect("/");
          });
        } else {
          return res.render("create.ejs", {
            title: conf.name
          });
        }
      });
    }));
  } else {
    res.render("create.ejs", {
      title: conf.name
    });
    console.log('rendered');
  }
});

app.post("/users.:format?", function(req, res, next) {
  var user;
  user = new db.User(req.body.user);
  return user.save(function(err) {
    if (err) {
      return res.redirect("/users/new");
    }
    emails.sendWelcome(user);
    switch (req.params.format) {
      case "json":
        return res.send(user.toObject());
      default:
        return res.redirect("/");
    }
  });
});

app.get("/sessions/new", function(req, res, next) {
  var cookie;
  if (req.cookies.logintoken) {
    cookie = JSON.parse(req.cookies.logintoken);
    return db.LoginToken.findOne({
      email: cookie.email,
      series: cookie.series,
      token: cookie.token
    }, (function(err, token) {
      if (!token) {
        return res.render("login.ejs", {
          title: conf.name
        });
      }
      return db.User.findOne({
        email: token.email
      }, function(err, user) {
        if (user) {
          req.currentUser = user;
          token.token = token.randomToken();
          return token.save(function() {
            res.cookie("logintoken", token.cookieValue, {
              expires: new Date(Date.now() + 2 * 604800000),
              path: "/"
            });
            return res.redirect("/");
          });
        } else {
          return res.render("login.ejs", {
            title: conf.name
          });
        }
      });
    }));
  } else {
    return res.render("login.ejs", {
      title: conf.name
    });
  }
});

app.post("/sessions", function(req, res, next) {
  return db.User.findOne({
    email: req.body.user.email
  }, function(err, user) {
    var expire, loginToken;
    if (user && user.authenticate(req.body.user.password)) {
      expire = new Date(Date.now() + 2 * 604800000);
      loginToken = new db.LoginToken();
      loginToken.email = user.email;
      return loginToken.save(function() {
        res.cookie("logintoken", loginToken.cookieValue, {
          expires: expire,
          path: "/"
        });
        console.info("cookie: ", loginToken.cookieValue);
        return res.redirect("/");
      });
    } else {
      return res.redirect("/sessions/new");
    }
  });
});

app.get("/sessions", loadUser, function(req, res, next) {
  db.LoginToken.remove({
    email: req.cookie.email,
    series: req.cookie.series,
    token: req.cookie.token
  }, function() {});
  res.clearCookie("logintoken");
  return res.redirect("/sessions/new");
});

app.del("/sessions", loadUser, function(req, res, next) {
  db.LoginToken.remove({
    email: req.currentUser.email
  }, function() {});
  res.clearCookie("logintoken");
  return res.redirect("/sessions/new");
});

app.listen(conf.server.port, conf.server.host, function(err) {
  if (err) {
    console.error('failed to start server on %s:%s with error: %s', conf.server.host, conf.server.port, err);
    process.exit(-1);
  }
  console.info('started server on %s:%s', conf.server.host, conf.server.port);
  return console.info('environment: %s', app.settings.env);
});
