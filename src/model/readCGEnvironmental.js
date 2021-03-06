const tableDefiner = require("./define-table");
const dateFormater = require("./format-date");
const AWSConfig = require("../config/config");
const daysInMonthDefiner = require("../utils/daysInMonthDefiner");
const windDirectionConverter = require("./wind-direction-converter");
const CampoGrandeProductionServices = require("./readCGProduction")
	.CampoGrandeProductionServices;

const docClient = AWSConfig.docClient;

// TODO: dia 04/12 em diante a irradiação deve sair da rota de produção

const requireAWSData = async params => {
	return new Promise((resolve, reject) => {
		let items = [];
		let types = [];
		let interval = [];
		let humidities = [];
		let PM1Numbers = [];
		let PM2Numbers = [];
		let PM4Numbers = [];
		let windSpeeds = [];
		let PM10Numbers = [];
		let averageSizes = [];
		let temperatures = [];
		let windDirections = [];
		let PM1Particulates = [];
		let PM2Particulates = [];
		let PM4Particulates = [];
		let PM10Particulates = [];
		let irradiations = [];
		let irradiationInterval = [];

		docClient.query(params, (err, data) => {
			if (err) {
				reject(
					"Unable to scan table. Error JSON: " + JSON.stringify(err, null, 2)
				);
			} else {
				let qtd = 0;

				data.Items.forEach(function (item) {
					if (typeof data.Items != "undefined") {
						let formatedDate = dateFormater.formatDate(
							item.dia_mes_ano,
							item.hora_minuto
						);

						let type = item.tipo;
						let numPM1 = item.numPM1;
						let numPM2 = item.numPM2;
						let numPM4 = item.numPM4;
						let numPM10 = item.numPM10;
						let temperature = (item.temp > 0) ? item.temp : 0;
						let windDir = windDirectionConverter.convert(item.vento_dir);
						let massaPM1 = item.massaPM1;
						let massaPM2 = item.massaPM2;
						let massaPM4 = item.massaPM4;
						let massaPM10 = item.massaPM10;
						let windSpeed = item.ventor_vel;
						let averageSize = item.tamanho_medio;
						let humidity = item.hum;
						let irradiation = item.irr;

						items.push({
							date: formatedDate.hourMin,
							massaPM1: massaPM1 || 0,
							massaPM2: massaPM2 || 0,
							massaPM4: massaPM4 || 0,
							massaPM10: massaPM10 || 0,
							numPM1: numPM1 || 0,
							numPM2: numPM2 || 0,
							numPM4: numPM4 || 0,
							numPM10: numPM10 || 0,
							averageSize: averageSize || 0,
							temperature: temperature || 0,
							type: type || "null",
							windDir: windDir || 0,
							windSpeed: windSpeed || 0,
							humidity: humidity || 0,
							irradiation: irradiation || "null"
						});

						interval.push(formatedDate.hourMin);
						qtd++;

						if (item.hora_minuto >= 60000 && item.hora_minuto <= 190000) {
							irradiationInterval.push(formatedDate.hourMin);
						}
					}
				});

				interval.sort();
				irradiationInterval.sort();

				for (let hour of interval) {
					for (let item of items) {
						if (hour == item.date) {
							PM1Particulates.push(item.massaPM1);
							PM2Particulates.push(item.massaPM2);
							PM4Particulates.push(item.massaPM4);
							PM10Particulates.push(item.massaPM10);
							PM1Numbers.push(item.numPM1);
							PM2Numbers.push(item.numPM2);
							PM4Numbers.push(item.numPM4);
							PM10Numbers.push(item.numPM10);
							averageSizes.push(item.averageSize);
							temperatures.push(item.temperature);
							types.push(item.type);
							windDirections.push(item.windDir);
							windSpeeds.push(item.windSpeed);
							humidities.push(item.humidity);
							irradiations.push(item.irradiation);
						}
					}
				}
			}

			let datesToGetQuarter = {
				PM1Particulates,
				PM2Particulates,
				PM4Particulates,
				PM10Particulates,
				PM1Numbers,
				PM2Numbers,
				PM4Numbers,
				PM10Numbers,
				averageSizes,
				irradiations,
				irradiationInterval
			};

			let quarters = getQuarterValues(datesToGetQuarter, interval);
			let irradiationQuartersInterval = quarters.irradiationInterval.filter(
				hour => typeof hour === "string"
			);

			resolve([
				interval,
				PM1Particulates,
				PM2Particulates,
				PM4Particulates,
				PM10Particulates,
				PM1Numbers,
				PM2Numbers,
				PM4Numbers,
				PM10Numbers,
				averageSizes,
				temperatures,
				types,
				windDirections,
				windSpeeds,
				quarters.PM1Numbers,
				quarters.PM2Numbers,
				quarters.PM4Numbers,
				quarters.PM10Numbers,
				quarters.PM1Particulates,
				quarters.PM2Particulates,
				quarters.PM4Particulates,
				quarters.PM10Particulates,
				quarters.averageSizes,
				quarters.interval,
				humidities,
				quarters.irradiationAverages,
				irradiationQuartersInterval
			]);
		});
	});
};

const getQuarterValues = (data, dates) => {
	try {
		let PM1Numbers = [];
		let PM2Numbers = [];
		let PM4Numbers = [];
		let PM10Numbers = [];
		let averageSizes = [];
		let PM1Particulates = [];
		let PM2Particulates = [];
		let PM4Particulates = [];
		let PM10Particulates = [];
		let interval = [];
		let irradiationAverages = [];
		let irradiationSumPerMinute = 0;
		let irradiationQuantity = 0;
		let irradiationInterval = [];

		for (let i = 0; i < dates.length; i++) {
			let minute = dates[i][3] + dates[i][4];
			irradiationSumPerMinute += parseFloat(data.irradiations[i]);
			irradiationQuantity++;

			if (minute % 15 == 0) {
				interval.push(dates[i]);
				PM1Numbers.push(data.PM1Numbers[i]);
				PM2Numbers.push(data.PM2Numbers[i]);
				PM4Numbers.push(data.PM4Numbers[i]);
				PM10Numbers.push(data.PM10Numbers[i]);
				averageSizes.push(data.averageSizes[i]);
				PM1Particulates.push(data.PM1Particulates[i]);
				PM2Particulates.push(data.PM2Particulates[i]);
				PM4Particulates.push(data.PM4Particulates[i]);
				PM10Particulates.push(data.PM10Particulates[i]);
				irradiationAverages.push(
					parseFloat((irradiationSumPerMinute / irradiationQuantity).toFixed(2))
				);
				irradiationInterval.push(data.irradiationInterval[i]);

				irradiationQuantity = irradiationSumPerMinute = 0;
			}
		}

		return {
			PM1Numbers,
			PM2Numbers,
			PM4Numbers,
			PM10Numbers,
			averageSizes,
			PM1Particulates,
			PM2Particulates,
			PM4Particulates,
			PM10Particulates,
			irradiationAverages,
			interval,
			irradiationInterval
		};
	} catch (error) {
		return error;
	}
};

const getEnvironmentalDataByDateInterval = async (date, method) => {
	
	if (method === "stationOnly") {
		return new Promise((resolve, reject) => {
			let params = tableDefiner.defineTable(
				"campo-grande",
				"environmental",
				null,
				date.day,
				date.month,
				date.year,
				null
			);

			requireAWSData(params)
				.then(response => {
					// Irradiação
					let irradiations = response[25].length ? response[25] : [0];
					let irradiationInterval = response[26].length ? response[26] : [0];
					let effectiveIrradiations = irradiations.filter(
						irradiation => irradiation > 0
					);
					let accumulateIrradiation = effectiveIrradiations.length
						? effectiveIrradiations.reduce(
							(acc, cur) => acc + parseFloat(cur)
						)
						: 0;
					let higherIrradiation = 0;

					effectiveIrradiations.map(irradiation => {
						if (irradiation > higherIrradiation)
							higherIrradiation = parseInt(irradiation);
					});

					if (higherIrradiation === 0) higherIrradiation = "null";

					let irradiationAverage =
						accumulateIrradiation / effectiveIrradiations.length;

					//Temperatura

					let temperature = response[10];
					let temperatureExists = !isNaN(temperature.length);

					let totalTemperature = 0;
					let higherTemperature = 0;
					let lowerTemperature = 100;

					temperature.map(item => {
						totalTemperature += parseFloat(item);
						if (item < lowerTemperature && item != 0) lowerTemperature = item;
						if (item > higherTemperature) higherTemperature = item;
					});

					if (lowerTemperature === 100) lowerTemperature = undefined;

					if (higherTemperature === 0) higherTemperature = undefined;

					let averageTemperature =
						totalTemperature / (temperatureExists ? temperature.length : 1);

					//Umidade

					let humidity = response[24];
					let totalHumidity = 0;

					for (let i = 0; i < humidity.length; i++) {
						if (humidity[i] != humidity[i + 1]) {
							totalHumidity += parseFloat(humidity[i] / 1000);
						}
					}

					//Velocidade do vento

					let windSpeed = response[13];
					let windSpeedExists = !isNaN(windSpeed);

					let totalWindspeed = 0;

					windSpeed.map(item => {
						totalWindspeed = parseFloat(item);
					});

					let averageWindSpeed =
						totalWindspeed / (windSpeedExists ? windSpeed.length : 1);

					//Particulados PM1

					let pm1 = response[1];
					let pm1Exists = !isNaN(pm1.length);
					let totalPM1 = 0;

					pm1.map(item => {
						totalPM1 += parseFloat(item);
					});

					let averagePM1 = totalPM1 / (pm1Exists ? pm1.length : 1);

					//Particulados PM2

					let pm2 = response[2];
					let pm2Exists = !isNaN(pm2.length);
					let totalPM2 = 0;

					pm2.map(item => {
						totalPM2 += parseFloat(item);
					});

					let averagePM2 = totalPM2 / (pm2Exists ? pm2.length : 1);

					// Direção do vento

					let windDirections = response[12].length ? response[12] : [0];

					let north = 0;
					let south = 0;
					let east = 0;
					let west = 0;
					let northWest = 0;
					let northEast = 0;
					let southWest = 0;
					let southEast = 0;

					windDirections.map(direction => {
						if (direction === "N") north++;
						else if (direction === "NE") northEast++;
						else if (direction === "E") east++;
						else if (direction === "SE") southEast++;
						else if (direction === "S") south++;
						else if (direction === "SW") southWest++;
						else if (direction === "W") west++;
						else if (direction === "NW") northWest++;
					});

					let eachWindDirectionPercentage = {
						north: parseFloat(
							((north / windDirections.length) * 100).toFixed(2)
						),
						northEast: parseFloat(
							((northEast / windDirections.length) * 100).toFixed(2)
						),
						east: parseFloat(
							((east / windDirections.length) * 100).toFixed(2)
						),
						southEast: parseFloat(
							((southEast / windDirections.length) * 100).toFixed(2)
						),
						south: parseFloat(
							((south / windDirections.length) * 100).toFixed(2)
						),
						southWest: parseFloat(
							((southWest / windDirections.length) * 100).toFixed(2)
						),
						west: parseFloat(
							((west / windDirections.length) * 100).toFixed(2)
						),
						northWest: parseFloat(
							((northWest / windDirections.length) * 100).toFixed(2)
						)
					};

					let items = {
						period: "day",
						interval: response[0].length ? response[0] : [0],
						irradiation: effectiveIrradiations,
						higherIrradiation: parseFloat(higherIrradiation),
						irradiationAverage: parseFloat(irradiationAverage.toFixed(2)),
						irradiationInterval,
						PM1Particulates: response[1].length ? response[1] : [0],
						averagePM1: parseFloat(averagePM1.toFixed(2)),
						totalPM1: parseFloat(totalPM1.toFixed(2)),
						PM2Particulates: response[2].length ? response[2] : [0],
						averagePM2: parseFloat(averagePM2.toFixed(2)),
						totalPM2: parseFloat(totalPM2.toFixed(2)),
						PM4Particulates: response[3].length ? response[3] : [0],
						PM10Particulates: response[4].length ? response[4] : [0],
						PM1Numbers: response[5].length ? response[5] : [0],
						PM2Numbers: response[6].length ? response[6] : [0],
						PM4Numbers: response[7].length ? response[7] : [0],
						PM10Numbers: response[8].length ? response[8] : [0],
						averageSizes: response[9].length ? response[9] : [0],
						temperatures: response[10].length ? response[10] : [0],
						averageTemperature: parseFloat(averageTemperature.toFixed(2)),
						lowerTemperature,
						higherTemperature,
						windDirections,
						eachWindDirectionPercentage,
						windSpeeds: response[13].length ? response[13] : [0],
						averageWindSpeed,
						PM1NumbersQuarters: response[14].length ? response[14] : [0],
						PM2NumbersQuarters: response[15].length ? response[15] : [0],
						PM4NumbersQuarters: response[16].length ? response[16] : [0],
						PM10NumbersQuarters: response[17].length ? response[17] : [0],
						PM1ParticulatesQuarters: response[18].length ? response[18] : [0],
						PM2ParticulatesQuarters: response[19].length ? response[19] : [0],
						PM4ParticulatesQuarters: response[20].length ? response[20] : [0],
						PM10ParticulatesQuarters: response[21].length
							? response[21]
							: [0],
						averageSizesQuarters: response[22].length ? response[22] : [0],
						quartersInterval: response[23].length ? response[23] : [0],
						humidity: response[24].length ? response[24] : [0],
						accumulateHumidity: parseFloat(totalHumidity.toFixed(2)),
						day: date.day,
						month: date.month,
						year: date.year,
						monthDay:
							date.day +
							"/" +
							date.month +
							"/" +
							date.year
					};

					resolve(items);
				})
				.catch(err => {
					console.log(err);

					let items = {
						err,
						period: "day",
						interval: [0],
						irradiation: [0],
						higherIrradiation: 0,
						irradiationAverage: 0,
						PM1Particulates: [0],
						averagePM1: 0,
						PM2Particulates: [0],
						averagePM2: 0,
						PM4Particulates: [0],
						PM10Particulates: [0],
						PM1Numbers: [0],
						PM2Numbers: [0],
						PM4Numbers: [0],
						PM10Numbers: [0],
						averageSizes: [0],
						temperatures: [0],
						averageTemperature: 0,
						lowerTemperature: 0,
						higherTemperature: 0,
						types: [0],
						windDirections: [0],
						eachWindDirectionPercentage: [0],
						windSpeeds: [0],
						averageWindSpeed: 0,
						PM1NumbersQuarters: [0],
						PM2NumbersQuarters: [0],
						PM4NumbersQuarters: [0],
						PM10NumbersQuarters: [0],
						PM1ParticulatesQuarters: [0],
						PM2ParticulatesQuarters: [0],
						PM4ParticulatesQuarters: [0],
						PM10ParticulatesQuarters: [0],
						averageSizesQuarters: [0],
						quartersInterval: [0],
						humidity: [0],
						accumulateHumidity: 0,
						day: dateToRequest.day,
						month: dateToRequest.month,
						year: dateToRequest.year,
						monthDay:
							dateToRequest.day +
							"/" +
							dateToRequest.month +
							"/" +
							dateToRequest.year
					};

					resolve(items);
				});
		});

	} else if (method === "stationAndPanel") {

		return new Promise(async (resolve, reject) => {
		
			const solarStationData = new Promise((resolve, reject) => {
				let params = tableDefiner.defineTable(
					"campo-grande",
					"environmental",
					null,
					date.day,
					date.month,
					date.year,
					null
				);

				if(isNaN(params.ExpressionAttributeValues[':inicio_data'])) {
					let newExpressionAttributeValues = parseInt(date.year + date.month + date.day);
					params = {
						...params,
						ExpressionAttributeValues : newExpressionAttributeValues
					};
				}

				requireAWSData(params)
					.then(response => {
						
						//Temperatura

						let temperature = response[10];
						let temperatureExists = !isNaN(temperature.length);

						let totalTemperature = 0;
						let higherTemperature = 0;
						let lowerTemperature = 100;

						temperature.map(item => {
							totalTemperature += parseFloat(item);
							if (item < lowerTemperature && item != 0) lowerTemperature = item;
							if (item > higherTemperature) higherTemperature = item;
						});

						if (lowerTemperature === 100) lowerTemperature = undefined;

						if (higherTemperature === 0) higherTemperature = undefined;

						let averageTemperature =
							totalTemperature / (temperatureExists ? temperature.length : 1);

						//Umidade

						let humidity = response[24];
						let totalHumidity = 0;

						for (let i = 0; i < humidity.length; i++) {
							if (humidity[i] != humidity[i + 1]) {
								totalHumidity += parseFloat(humidity[i] / 1000);
							}
						}

						//Velocidade do vento

						let windSpeed = response[13];
						let windSpeedExists = !isNaN(windSpeed);

						let totalWindspeed = 0;

						windSpeed.map(item => {
							totalWindspeed = parseFloat(item);
						});

						let averageWindSpeed =
							totalWindspeed / (windSpeedExists ? windSpeed.length : 1);

						//Particulados PM1

						let pm1 = response[1];
						let pm1Exists = !isNaN(pm1.length);
						let totalPM1 = 0;

						pm1.map(item => {
							totalPM1 += parseFloat(item);
						});

						let averagePM1 = totalPM1 / (pm1Exists ? pm1.length : 1);

						//Particulados PM2

						let pm2 = response[2];
						let pm2Exists = !isNaN(pm2.length);
						let totalPM2 = 0;

						pm2.map(item => {
							totalPM2 += parseFloat(item);
						});

						let averagePM2 = totalPM2 / (pm2Exists ? pm2.length : 1);

						// Direção do vento

						let windDirections = response[12].length ? response[12] : [0];

						let north = 0;
						let south = 0;
						let east = 0;
						let west = 0;
						let northWest = 0;
						let northEast = 0;
						let southWest = 0;
						let southEast = 0;

						windDirections.map(direction => {
							if (direction === "N") north++;
							else if (direction === "NE") northEast++;
							else if (direction === "E") east++;
							else if (direction === "SE") southEast++;
							else if (direction === "S") south++;
							else if (direction === "SW") southWest++;
							else if (direction === "W") west++;
							else if (direction === "NW") northWest++;
						});

						let eachWindDirectionPercentage = {
							north: parseFloat(
								((north / windDirections.length) * 100).toFixed(2)
							),
							northEast: parseFloat(
								((northEast / windDirections.length) * 100).toFixed(2)
							),
							east: parseFloat(
								((east / windDirections.length) * 100).toFixed(2)
							),
							southEast: parseFloat(
								((southEast / windDirections.length) * 100).toFixed(2)
							),
							south: parseFloat(
								((south / windDirections.length) * 100).toFixed(2)
							),
							southWest: parseFloat(
								((southWest / windDirections.length) * 100).toFixed(2)
							),
							west: parseFloat(
								((west / windDirections.length) * 100).toFixed(2)
							),
							northWest: parseFloat(
								((northWest / windDirections.length) * 100).toFixed(2)
							)
						};

						let items = {
							period: "day",
							interval: response[0].length ? response[0] : [0],
							PM1Particulates: response[1].length ? response[1] : [0],
							averagePM1: parseFloat(averagePM1.toFixed(2)),
							totalPM1: parseFloat(totalPM1.toFixed(2)),
							PM2Particulates: response[2].length ? response[2] : [0],
							averagePM2: parseFloat(averagePM2.toFixed(2)),
							totalPM2: parseFloat(totalPM2.toFixed(2)),
							PM4Particulates: response[3].length ? response[3] : [0],
							PM10Particulates: response[4].length ? response[4] : [0],
							PM1Numbers: response[5].length ? response[5] : [0],
							PM2Numbers: response[6].length ? response[6] : [0],
							PM4Numbers: response[7].length ? response[7] : [0],
							PM10Numbers: response[8].length ? response[8] : [0],
							averageSizes: response[9].length ? response[9] : [0],
							temperatures: response[10].length ? response[10] : [0],
							averageTemperature: parseFloat(averageTemperature.toFixed(2)),
							lowerTemperature,
							higherTemperature,
							windDirections,
							eachWindDirectionPercentage,
							windSpeeds: response[13].length ? response[13] : [0],
							averageWindSpeed,
							PM1NumbersQuarters: response[14].length ? response[14] : [0],
							PM2NumbersQuarters: response[15].length ? response[15] : [0],
							PM4NumbersQuarters: response[16].length ? response[16] : [0],
							PM10NumbersQuarters: response[17].length ? response[17] : [0],
							PM1ParticulatesQuarters: response[18].length ? response[18] : [0],
							PM2ParticulatesQuarters: response[19].length ? response[19] : [0],
							PM4ParticulatesQuarters: response[20].length ? response[20] : [0],
							PM10ParticulatesQuarters: response[21].length
								? response[21]
								: [0],
							averageSizesQuarters: response[22].length ? response[22] : [0],
							quartersInterval: response[23].length ? response[23] : [0],
							humidity: response[24].length ? response[24] : [0],
							accumulateHumidity: parseFloat(totalHumidity.toFixed(2)),
							day: date.day,
							month: date.month,
							year: date.year,
							monthDay:
								date.day +
								"/" +
								date.month +
								"/" +
								date.year
						};

						resolve(items);
					})
					.catch(err => {
						console.log(err);

						let items = {
							err,
							period: "day",
							interval: [0],
							PM1Particulates: [0],
							averagePM1: 0,
							PM2Particulates: [0],
							averagePM2: 0,
							PM4Particulates: [0],
							PM10Particulates: [0],
							PM1Numbers: [0],
							PM2Numbers: [0],
							PM4Numbers: [0],
							PM10Numbers: [0],
							averageSizes: [0],
							temperatures: [0],
							averageTemperature: 0,
							lowerTemperature: 0,
							higherTemperature: 0,
							types: [0],
							windDirections: [0],
							eachWindDirectionPercentage: [0],
							windSpeeds: [0],
							averageWindSpeed: 0,
							PM1NumbersQuarters: [0],
							PM2NumbersQuarters: [0],
							PM4NumbersQuarters: [0],
							PM10NumbersQuarters: [0],
							PM1ParticulatesQuarters: [0],
							PM2ParticulatesQuarters: [0],
							PM4ParticulatesQuarters: [0],
							PM10ParticulatesQuarters: [0],
							averageSizesQuarters: [0],
							quartersInterval: [0],
							humidity: [0],
							accumulateHumidity: 0,
							day: date.day,
							month: date.month,
							year: date.year,
							monthDay:
								date.day +
								"/" +
								date.month +
								"/" +
								date.year
						};

						resolve(items);
					});
			});

			const solarPanelData = new Promise((resolve, reject) => {
			
				CampoGrandeProductionServices.readForOneDay(date.year + date.month + date.day)
					.then(response => {
						const { irradiation, irradiationAverages, higherIrradiation, interval } = response;
						const multipliedAverageIrradiationValues =  irradiationAverages.map(item => item * 1000)
						resolve({ 
							irradiation: multipliedAverageIrradiationValues,
							irradiationAverage: multipliedAverageIrradiationValues,
							irradiationInterval: interval,
							higherIrradiation
						});
					})
					.catch(err => {
						console.info("From CampoGrandeProductionServices.readForOneDay(), error -> " + err)
					})

			});

			const solarStationDataResponse = await solarStationData;
			const solarPanelDataResponse = await solarPanelData;

			const promises = {
				...solarPanelDataResponse,
				...solarStationDataResponse
			};

			resolve(promises);
		});
	}
};

CampoGrandeEnvironmentalServices = {};

CampoGrandeEnvironmentalServices.readForOneDay = async date => {

	let dateToRequest = {
		day: date[6] + date[7],
		month: date[4] + date[5],
		year: date[0] + date[1] + date[2] + date[3]
	};

	const { year, month, day } = dateToRequest;

	return new Promise((resolve, reject) => {
		if (
			year < 2019 ||
			(year == 2019 && month < 12) ||
			(year == 2019 && month == 12 && day <= 3)
		) {
			getEnvironmentalDataByDateInterval(dateToRequest, "stationOnly")
				.then(response => {
					resolve(response)
				});
		} else {
			
			getEnvironmentalDataByDateInterval(dateToRequest, "stationAndPanel")
				.then(response => {
					let dailyAverageIrradiation = 0
					let hasdailyAverageIrradiation= (response.irradiationAverage.length != undefined && response.irradiationAverage.length > 1)
					
					if (hasdailyAverageIrradiation) {
						let dailySumIrradiation = response.irradiationAverage.reduce((acc, cur) => acc + cur)
						dailyAverageIrradiation = parseFloat((dailySumIrradiation / response.irradiationAverage.length).toFixed(3))
					}
					resolve({
						...response,
						irradiationAverage: dailyAverageIrradiation
					})
				});
		}
	})

};

CampoGrandeEnvironmentalServices.readForOneMonth = async date => {
	let items = {};
	let monthInterval = [];
	let averageIrradiations = [];
	let higherIrradiations = [];
	let averageTemperatures = [];
	let higherTemperatures = [];
	let lowerTemperatures = [];
	let accumulateHumidities = [];
	let averageWindSpeeds = [];
	let accumulatePM1 = [];
	let averagesPM1 = [];
	let accumulatePM2 = [];
	let averagesPM2 = [];

	let dateToRequest = {
		month: date[4] + date[5],
		year: date[0] + date[1] + date[2] + date[3]
	};

	let daysThisMonth = daysInMonthDefiner.howManyDaysThisMonth(
		dateToRequest.month
	);
	let days = [];

	for (let i = 1; i <= daysThisMonth; i++) {
		days.push(i < 10 ? "0" + i : i);
	}

	return new Promise((resolve, reject) => {
		days.map(day => {
			CampoGrandeEnvironmentalServices.readForOneDay(
				dateToRequest.year + dateToRequest.month + day
			)
				.then(response => {
					monthInterval.push(day);
					monthInterval.sort();

					averageIrradiations[day - 1] = response.irradiationAverage;
					higherIrradiations[day - 1] = response.higherIrradiation;
					averageTemperatures[day - 1] = response.averageTemperature;
					higherTemperatures[day - 1] = response.higherTemperature;
					lowerTemperatures[day - 1] = response.lowerTemperature;
					accumulateHumidities[day - 1] = response.accumulateHumidity;
					averageWindSpeeds[day - 1] = response.averageWindSpeed;
					accumulatePM1[day - 1] = response.totalPM1;
					averagesPM1[day - 1] = response.averagePM1;
					accumulatePM2[day - 1] = response.totalPM2;
					averagesPM2[day - 1] = response.averagePM2;

					if (monthInterval.length === days.length) {
																	
						items = {
							monthInterval,
							averageIrradiations,
							higherIrradiations,
							averageTemperatures,
							higherTemperatures,
							lowerTemperatures,
							accumulateHumidities,
							averageWindSpeeds,
							accumulatePM1,
							averagesPM1,
							accumulatePM2,
							averagesPM2,
							month: dateToRequest.month,
							year: dateToRequest.year,
							monthDay: dateToRequest.month + "/" + dateToRequest.year,
							period: "month"
						};

						resolve(items);
					}
				})
				.catch(err => {
					console.log(err);

					items = {
						err,
						monthInterval: [0],
						averageIrradiations: [0],
						higherIrradiations: [0],
						averageTemperatures: [0],
						higherTemperatures: [0],
						lowerTemperatures: [0],
						accumulateHumidities: [0],
						averageWindSpeeds: [0],
						accumulatePM1: [0],
						averagesPM1: [0],
						accumulatePM2: [0],
						averagesPM2: [0],
						month: dateToRequest.month,
						year: dateToRequest.year,
						monthDay: dateToRequest.month + "/" + dateToRequest.year,
						period: "month"
					};

					resolve(items);
				});
		});
	});
};

CampoGrandeEnvironmentalServices.readForOneYear = async date => {
	let irradiations = [];
	let PM1Array = [];
	let PM2Array = [];
	let rainfalls = [];
	let temperatures = [];
	let windSpeeds = [];
	let yearInterval = [];

	let dateToRequest = {
		year: date[0] + date[1] + date[2] + date[3],
		month: date[4] + date[5],
		day: date[6] + date[7]
	};

	return new Promise((resolve, reject) => {
		let params = tableDefiner.defineTable(
			"campo-grande",
			"environmental-year",
			null,
			dateToRequest.day,
			dateToRequest.month,
			dateToRequest.year,
			null
		);

		docClient.query(params, (err, data) => {
			if (err) {
				console.log(err);
				resolve({ err });
			} else {
				data.Items.forEach(item => {
					if (typeof data.Items != "undefined") {
						let {
							ano,
							mes,
							irradiation,
							temperature,
							windSpeed,
							rainfall,
							PM1,
							PM2
						} = item;

						yearInterval.push(mes);
						irradiations.push(irradiation);
						temperatures.push(temperature);
						windSpeeds.push(windSpeed);
						rainfalls.push(rainfall);
						PM1Array.push(PM1);
						PM2Array.push(PM2);
					}
				});

				let items = {
					yearInterval,
					irradiations,
					temperatures,
					windSpeeds,
					rainfalls,
					PM1Array,
					PM2Array,
					year: dateToRequest.year,
					period: "year"
				};

				resolve(items);
			}
		});
	});
};

module.exports = { CampoGrandeEnvironmentalServices };
