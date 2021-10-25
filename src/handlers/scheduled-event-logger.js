const axios = require("axios").default;
const Twitter = require("twitter");
require("dotenv").config();
require("date-utils");

const options = {
  method: "GET",
  url: "https://community-open-weather-map.p.rapidapi.com/forecast",
  params: {
    q: process.env.PARAMS_Q,
    units: "metric",
    mode: "json",
    lat: process.env.PARAMS_LAT,
    lon: process.env.PARAMS_LON,
    lang: "ja"
  },
  headers: {
    "x-rapidapi-key": process.env.X_RAPIDAPI_KEY,
    "x-rapidapi-host": process.env.X_RAPIDAPI_HOST
  }
};

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const tweetPost = async content => {
  await client.post(
    "statuses/update",
    { status: content },
    (error, tweet, response) => {
      if (!error) {
        console.info("tweet success");
      } else {
        console.error(error);
      }
    }
  );
};

/**
 * A Lambda function that logs the payload received from a CloudWatch scheduled event.
 */
exports.scheduledEventLoggerHandler = async (event, context) => {
  await axios
    .request(options)
    .then(response => {
      return response.data.list
        .map(e => {
          return {
            weather: e.weather[0].main,
            // 「適度な雨」だと意味がわからないので「雨」に変換。表現的には正しいはず
            detail:
              e.weather[0].description === "適度な雨"
                ? "雨"
                : e.weather[0].description,
            date: e.dt_txt
          };
        })
        .filter(
          e =>
            e.weather === "Rain" &&
            e.date.startsWith(new Date().toFormat("YYYY-MM-DD"))
        );
    })
    .then(async datas => {
      if (datas.length !== 0) {
        let content = "今日、傘いるで\n\n";
        datas.forEach(e => {
          content += `${new Date(e.date).getHours()}時 ${e.detail}\n`;
        });
        tweetPost(content);
      } else {
        console.info("hare");
      }
    })
    .catch(error => {
      console.error(error);
    });

  console.info(JSON.stringify(event));
};
