const AWS = require("aws-sdk");
const axios = require("axios").default;
const Twitter = require("twitter");
require("dotenv").config();
require("date-utils");

AWS.config.update({ region: "ap-northeast-1" });

const ssm = new AWS.SSM();

const getOptions = async () => {
	return {
		method: "GET",
		url: "https://community-open-weather-map.p.rapidapi.com/forecast",
		params: {
			q: "Osaka,jp",
			units: "metric",
			mode: "json",
			lat: 34.68639,
			lon: 135.52,
			lang: "ja",
		},
		headers: {
			"x-rapidapi-key": (
				await ssm.getParameter({ Name: "X_RAPIDAPI_KEY" }).promise()
			).Parameter.Value,
			"x-rapidapi-host": (
				await ssm.getParameter({ Name: "X_RAPIDAPI_HOST" }).promise()
			).Parameter.Value,
		},
	};
};

const tweetPost = async (content) => {
	new Twitter({
		consumer_key: (await ssm.getParameter({ Name: "CONSUMER_KEY" }).promise())
			.Parameter.Value,
		consumer_secret: (
			await ssm.getParameter({ Name: "CONSUMER_SECRET" }).promise()
		).Parameter.Value,
		access_token_key: (
			await ssm.getParameter({ Name: "ACCESS_TOKEN_KEY" }).promise()
		).Parameter.Value,
		access_token_secret: (
			await ssm.getParameter({ Name: "ACCESS_TOKEN_SECRET" }).promise()
		).Parameter.Value,
	}).post("statuses/update", { status: content }, (error, tweet, response) => {
		if (!error) {
			console.info("tweet success");
		} else {
			console.error(error);
		}
	});
};

/**
 * A Lambda function that logs the payload received from a CloudWatch scheduled event.
 */
exports.scheduledEventLoggerHandler = async (event, context) => {
	await axios
		.request(await getOptions())
		.then((response) => {
			return response.data.list.filter((e) => {
				return (
					new Date(new Date().toFormat("YYYY-MM-DD 06:00:00")).getTime() <=
						new Date(e.dt_txt).getTime() &&
					new Date(new Date().toFormat("YYYY-MM-DD 23:59:59")).getTime() >
						new Date(e.dt_txt).getTime()
				);
			});
		})
		.then(async (datas) => {
			//if (datas.some(e => e.weather[0].main === 'Rain')) {
			if (true) {
				let content =
					"今日、傘いるで\n\n" +
					new Date().getMonth() +
					"/" +
					new Date().getDate() +
					"\n";
				datas.forEach((e) => {
					// 「適度な雨」だとよくわからないので「雨」に変換
					content += `${("  " + new Date(e.dt_txt).getHours()).slice(-2)} 時 ${
						e.weather[0].description === "適度な雨"
							? "雨"
							: e.weather[0].description
					}\n`;
				});
				tweetPost(content);
			} else {
				console.info("no rain");
			}
		})
		.catch((error) => {
			console.error(error);
		});

	console.info(JSON.stringify(event));
};
