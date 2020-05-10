require("dotenv").config({ path: "./environment/development.env" })
const Twitter = require('twitter')
const moment = require("moment")
const { filter, zip } = require('rxjs')
const { map } = require('rxjs/operators')
const fs = require('fs')

//https://www.npmjs.com/package/sentiment
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const twitter = new Twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
const params = {
  q: 'coca-cola',
  lang: 'en',
  include_entities: false,
  count: 10,
  until: moment().subtract(6, "days").format("yyyy-MM-DD"),
  tweet_mode: 'extended',
  result_type: 'recent'
}

fetchTweetsWhile({ tweets: [], max_id: null }, x => x.length < 100, fetchFilteredTweets, params)
  .then(tweets => polishTweets(tweets))
  .then(polishedTweets => getTweetSentiment(polishedTweets))
  .then(sentimentTweets => {
    writeFile(sentimentTweets, 'sentimentTweets')
    printSentiment(sentimentTweets)
  }).catch(err => console.log(err))

function fetchTweetsWhile(data, condition, action, params) {
  var whilst = data => {
    if (condition(data.tweets)) {
      params.max_id = data.max_id ? data.max_id : null
      return action(data.tweets, params).then(whilst)
    } else {
      return Promise.resolve(data.tweets)
    }
  }

  return whilst(data)
}

function fetchFilteredTweets(oldList, params) {
  return new Promise((resolve, reject) => {
    getTweets(params)
      .then(tweets => removeRetweets(tweets.statuses.map(t => t.full_text))
        .then(nonRetweets => removeDuplicates(oldList.concat(nonRetweets)))
        .then(uniqueTweets => {
          resolve({
            tweets: uniqueTweets,
            max_id: tweets.statuses[tweets.statuses.length - 1].id
          })
        }).catch(err => console.log(err))
      )
  })
}

function removeDuplicates(tweets) {
  return new Promise((resolve, reject) => {
    resolve(Array.from(new Set(tweets)))
  })
}

function getTweets(params) {
  return twitter.get('search/tweets', params)
}

function removeRetweets(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.filter(x => !(/^RT @.*/.test(x))))
  })
}

function polishTweets(tweetsList) {
  return new Promise((resolve, reject) => {
    removeURLs(tweetsList)
      .then(filteredURLs => removeMentions(filteredURLs))
      .then(filteredMentions => resolve(filteredMentions))
      .catch(err => console.log(err))
  })
}

function removeURLs(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').trim()))
  })
}

function removeMentions(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.replace(/\B([@#][\w_-]+)/g, '').trim()))
  })
}

function printSentiment(tweets) {
  console.log(`Amount of positive tweets: ${tweets.filter(t => t.score > 0).length}`)
  console.log(`Amount of negative tweets: ${tweets.filter(t => t.score < 0).length}`)
  console.log(`Amount of neutral tweets: ${tweets.filter(t => t.score == 0).length}`)

  console.log(`\nTop 3 most positive tweets:`)
  tweets.sort(sortTweets("score", "desc")).slice(0, 3).forEach(x => console.log(x.tokens.join(' ')))
  console.log(`\nTop 3 most negative tweets:`)
  tweets.sort(sortTweets("score", "asc")).slice(0, 3).forEach(x => console.log(x.tokens.join(' ')))
}

function sortTweets(score,order) {
  let sort_order = 1;
  if(order === "desc") sort_order = -1;

  return function (a, b){
      // a should come before b in the sorted order
      if(a[score] < b[score]){
              return -1 * sort_order;
      // a should come after b in the sorted order
      }else if(a[score] > b[score]){
              return 1 * sort_order;
      // a and b are the same
      }else{
              return 0 * sort_order;
      }
  }
}

function getTweetSentiment(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => sentiment.analyze(x)))
  })
}

function writeFile(json, path) {
  const filename = `./file/${path}.json`

  checkForFile(filename, () => {
    fs.writeFileSync(filename, JSON.stringify(json, null, 2), 'utf-8', { flag: 'wx' }, err => {
      if (err) console.log(err)
      return
    })
  })
}

function checkForFile(filename, callback) {
  fs.exists(filename, exists => {
    if (exists) callback()
    else {
      fs.writeFile(filename, { flag: 'wx' }, function (err, data) {
        callback()
      })
    }
  })
}