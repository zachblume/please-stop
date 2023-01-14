console.time();
/* Needs refactoring for web version
// // get google API
// const { google } = require("googleapis");

// require("dotenv").config();

// // import env config
// const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } =
//   process.env;

// // setup an oauth client
// const oauth2Client = new google.auth.OAuth2(
//   GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET,
//   GOOGLE_REDIRECT_URL
// );

// // generate a url that asks permissions for Blogger and Google Calendar scopes
// const scopes = [
//   "https://mail.google.com/",
//   "https://www.googleapis.com/auth/gmail.labels",
// ];

// const url = oauth2Client.generateAuthUrl({
//   // 'online' (default) or 'offline' (gets refresh_token)
//   // for later: more about refresh_token...
//   // https://developers.google.com/identity/protocols/oauth2
//   access_type: "offline",

//   // If you only need one scope you can pass it as a string
//   scope: scopes.length == 1 ? scopes.toString() : scopes,
// });

// console.log(url);
*/

// Node version

const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://mail.google.com/"];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/** Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/** Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/** Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/** Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.labels.list({
    userId: "me",
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log("No labels found.");
    return;
  }
  console.log("Labels:");
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}

/** Totals the read and unread messages by each sender domain
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function countDomains(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  const messageIDList = [];

  const msgsToGet = 3000;
  const maxPerPage = 500;
  let res,
    data,
    messageIDs,
    newMsgIDs,
    nextPageToken = true;
  for (let i = 0; i < msgsToGet / maxPerPage && nextPageToken; i++) {
    res = await gmail.users.messages.list({
      maxResults: maxPerPage,
      userId: "me",
      pageToken: nextPageToken.length > 1 ? nextPageToken : null,
    });
    console.log(nextPageToken);
    data = res?.data;
    messageIDs = res.data?.messages;

    // If there are no messages returned by the email account, stop.
    if (!messageIDs?.length)
      throw Error("no messages returned by email account");

    newMsgIDs = messageIDs.map((a) => a.id);

    if (messageIDList.filter((value) => newMsgIDs.includes(value)).length)
      throw Error("Duplicate message snuck through somehow");

    nextPageToken = data?.nextPageToken;
    messageIDList.push(...newMsgIDs);
  }

  // return console.log(messageIDList);

  // OK great, now we have an array of message IDs (messageList)
  let messages = [];
  for ([index, msgID] of messageIDList.entries()) {
    res = gmail.users.messages.get({
      userId: "me",
      id: msgID,
    });

    messages[index] = res;

    // Rate limit to 200/second
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  messages = (await Promise.all(messages)).map((e) => e.data);

  console.log(messages);
  // fs.writeFile("logs/messages.json", JSON.stringify(messages), "utf8");
  console.log(messageIDList.length, messages.length);

  // dontrun.)
  messages = messages.map((msg) => ({
    // id: msg.id,
    unread: msg?.labelIds?.includes("UNREAD"),
    from: msg.payload.headers
      .filter((header) => header.name == "From")[0]
      .value.replace(/.*?</, "")
      .replace(/>$/, ""),
  }));

  let senders = [];
  messages.forEach((msg) => {
    if (!senders[msg.from]) senders[msg.from] = { read: 0, unread: 0 };
    senders[msg.from][msg?.unread ? "unread" : "read"]++;
  });

  senders = senders.sort((a, b) => (a.unread > b.unread ? 1 : -1));

  // fs.writeFile(
  //   "logs/senders.json",
  //   JSON.stringify({ senders }, null, 2),
  //   "utf8"
  // );
  console.log(Array(senders).length);
}

// Run the domain count function
authorize().then(countDomains).catch(console.error).finally(console.timeEnd);
