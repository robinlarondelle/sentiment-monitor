require("dotenv").config({ path: "./environment/development.env" })

console.log(process.env.API_KEY);
console.log(process.env.API_KEY_SECRET);
console.log(process.env.ACCESS_TOKEN);
console.log(process.env.ACCESS_TOKEN_SECRET);


const twitter = require('twitter')
const client = new twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const params ={screen_name: 'feyenoord'}

client.get('statuses/user_timeline', params, (err, tweets, response) => {
  if (!err) {
    console.log(tweets);
    
  } else {
    console.log(err);
    
  }
})
