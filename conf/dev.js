module.exports = {
  debug : true,
  secret: '076ee61d63aa10a123489ea87411e433b9',
  name  : 'FlagIt',
  server: {
    port           : 8080,
    host           : "0.0.0.0"
  },
  db    : {
    db             : 'flagit-dev',
    host           : '10.0.0.1',
    port           : 27017,        // optional, default: 27017
    username       : 'flagit-dev', // optional
    password       : 'flagit-dev', // optional
    collection     : 'sessions'    // optional, default: sessions
  },
  mail  : {
    ssl            : true,
    host           : "mail.slopez.org",   // smtp server hostname
    port           : 465,                 // smtp server port
    domain         : "[slopez.org]",      // domain used by client to identify itself to server
    from           : "flagit@slopez.org",
    reply_to       : "noreply@slopez.org",
    authentication : "login",             // auth login is supported; anything else is no auth
    username       : "flagit@slopez.org", // username
    password       : "Rtbxdlk75",         // password
    debug          : true                 // log level per message
  }
}
