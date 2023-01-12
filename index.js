// get google API
const { google } = require("googleapis");

// import env config
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } =
  process.env;

// setup an oauth client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URL
);

// generate a url that asks permissions for Blogger and Google Calendar scopes
const scopes = ["https://www.googleapis.com/auth/gmail"];

const url = oauth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  // for later: more about refresh_token...
  // https://developers.google.com/identity/protocols/oauth2
  access_type: "offline",

  // If you only need one scope you can pass it as a string
  scope: scopes.length == 1 ? scopes.toString() : scopes,
});

