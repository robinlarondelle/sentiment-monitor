require("dotenv").config({ path: "./environment/development.env" })
const twitter = require('twitter')
const moment = require("moment")
const { filter } = require('rxjs')
const natural = require("natural")
const tokenizer = new natural.WordTokenizer();
const fs = require('fs')
natural.PorterStemmer.attach();
const client = new twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
const until = moment().subtract(6, "days").format("yyyy-MM-DD")
const params ={
  q: 'trump', 
  lang: 'en', 
  include_entities: false,
  count: 100,
  until
}

client.get('search/tweets', params)
  .then(tweets => {
    filterTweets(tweets.statuses.map(x => x.text)).then(filteredTweets => {
      tokenizeTweets(filteredTweets).then(tokenizedTweets => {
        writeFile(tokenizedTweets, 'filtered_tweets')
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

function stemTweets(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.tokenizeAndStem()))
  })
}

function checkForFile(filename, callback) {
  fs.exists(filename, exists => {
    if (exists) callback()
    else {
      fs.writeFile(filename, {flag: 'wx'}, function (err, data) 
      { 
          callback();
      })
    }
  })
}

function writeFile(json, path) {
  const filename = `./file/${path}.json`

  checkForFile(filename, () => {
    fs.writeFileSync(filename, JSON.stringify(json, null, 2),'utf-8', { flag: 'wx' }, err => {
      if (err) console.log(err); return;
    })
  })
}