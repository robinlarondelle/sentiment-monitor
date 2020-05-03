require("dotenv").config({ path: "./environment/development.env" })
const twitter = require('twitter')
const moment = require("moment")
const { filter } = require('rxjs')
const natural = require("natural")
const tokenizer = new natural.WordTokenizer();
const client = new twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
const until = moment().subtract(6, "days").format("yyyy-MM-DD")
const params ={
  q: 'coca cola', 
  lang: 'en', 
  include_entities: false,
  count: 100,
  until
}

client.get('search/tweets', params)
  .then(tweets => {
    filterTweets(tweets.statuses.map(x => x.text)).then(filteredTweets => {
      tokenizeTweets(filteredTweets).then(tokenizedTweets => {
        console.log(tokenizedTweets);
      }).catch(error => console.log(error))
    }).catch(error => console.log(error))
  }).catch(err => console.log(err))


function filterTweets(tweetsList) {
  return new Promise((resolve, reject) => {
    resolve(tweetsList.filter(x => !(/^RT @.*/.test(x))))
  })
}


function tokenizeTweets(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => tokenizer.tokenize(x)))
  })
}