import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel
} from 'discord.js';
import {join} from 'path';
import {BASE_DIRNAME, client, DEV, DMDATA_API_KEY} from '../..';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {createCanvas} from 'canvas';
import {GetLatestEarthquake} from './dmdata';
import {Logger} from 'okayulogger';
import {DMDataWebSocket} from 'lily-dmdata/socket';
import {Classification, EarthquakeInformationSchemaBody, EEWInformationSchemaBody, ShindoValue, WebSocketEvent} from 'lily-dmdata';
import {EMOJI, GetEmoji} from '../../util/emoji';
import {gzipSync} from 'zlib';

const URL = 'https://www.jma.go.jp/bosai/quake/data/list.json';
const INDV_URL = 'https://www.jma.go.jp/bosai/quake/data/';
const L = new Logger('earthquakes');

const locations_english: {[key: string]: string} = {};


export async function GetMostRecent(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

    const OriginTime = new Date(earthquake.originTime);
    const Magnitude = earthquake.magnitude.value;
    const MaxInt = earthquake.maxInt;
    const HypocenterName = earthquake.hypocenter.name;
    const HypocenterDepth = earthquake.hypocenter.depth.value;

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName);
    interaction.editReply({embeds:[embed]});
}

const SHINDO_IMG: { [key: string]: string } = {
    '1':'1.png',
    '2':'2.png',
    '3':'3.png',
    '4':'4.png',
    '5-':'5-.png',
    '5+':'5+.png',
    '6-':'6-.png',
    '6+':'6+.png',
    '7':'7.png'
}

const SHINDO_EMOJI: { [key: string]: EMOJI } = {
    '1': EMOJI.SHINDO_1,
    '2': EMOJI.SHINDO_2,
    '3': EMOJI.SHINDO_3,
    '4': EMOJI.SHINDO_4,
    '5-':EMOJI.SHINDO_5_LOWER,
    '5+':EMOJI.SHINDO_5_UPPER,
    '6-':EMOJI.SHINDO_6_LOWER,
    '6+':EMOJI.SHINDO_6_UPPER,
    '7': EMOJI.SHINDO_7
}

export async function BuildEarthquakeEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, automatic = false) {
    return new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(automatic ? `A Shindo ${max_intensity} earthquake occurred.` : 'Most recent earthquake in Japan')
        .setTimestamp(origin_time)
        .setAuthor({name: 'Project DM-D.S.S', url: `https://www.jma.go.jp/bosai/map.html`})
        .setThumbnail(`https://bot.lilycatgirl.dev/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name: "Maximum Measured Intensity", value: `**${max_intensity}**`, inline: true},
            {name: 'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name: 'Depth', value: `**${depth} km**`, inline: true},
            {name: 'Location', value: locations_english[hypocenter_name]},
        );
}

function BuildEEWEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, event: {message: any, report_count: number, is_warning: boolean}) {
    return new EmbedBuilder()
        .setColor(event.is_warning ? 0xd61111 : 0xff8519)
        .setTitle((event.is_warning ? 'Earthquake Early Warning' : 'Earthquake Early Warning (Forecast)') + (event.report_count == 999 ? ' (Final Report)' : ` (Report ${event.report_count})`))
        .setTimestamp(origin_time)
        .setAuthor({name: 'Project DM-D.S.S', url: `https://www.jma.go.jp/bosai/map.html`})
        .setThumbnail(`https://bot.lilycatgirl.dev/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name: "Maximum Expected Intensity", value: `**${max_intensity}**`, inline: true},
            {name: 'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name: 'Depth', value: `**${depth} km**`, inline: true},
            {name: 'Location', value: locations_english[hypocenter_name]},
        );
}


let MONITORING_CHANNEL = !DEV?"1313343448354525214":"858904835222667315"; // #earthquakes (CC)
// const MONITORING_CHANNEL = "858904835222667315" // # bots (obp)
let last_known_quake = {};
export let SOCKET: DMDataWebSocket;

function open_socket(SOCKET: DMDataWebSocket) {
    SOCKET.OpenSocket({
        classifications: [
            Classification.EEW_FORECAST,
            Classification.EEW_WARNING,
            Classification.TELEGRAM_EARTHQUAKE
        ]
    });
}

const EXISTING_EARTHQUAKES = new Map<string, {message: Message, report_count: number, is_warning: boolean}>();
let is_reconnecting = false;
let reconnect_tries = 0;

export async function StartEarthquakeMonitoring(client: Client, disable_fetching: boolean = false) {
    L.info('Loading all locations...');

    const data = readFileSync(join(BASE_DIRNAME, 'assets', 'earthquakes', 'Epicenters.txt'), 'utf-8');
    const lines = data.split('\n');
    lines.forEach(line => {
        const key = line.split(',')[1];
        locations_english[key] = line.split(',')[2];
    });

    L.info('Loaded all locations!');

    if (disable_fetching) return L.warn('Earthquake monitoring is disabled. lily-dmdata won\'t run!');

    L.info('Starting Earthquake Monitoring...');

    // new
    SOCKET = new DMDataWebSocket(DMDATA_API_KEY, 'okabot', false);
    MONITORING_CHANNEL = !DEV?"1313343448354525214":"858904835222667315"; // reassign because discordjs is stupid
    const channel = client.channels.cache.get(MONITORING_CHANNEL);
    
    // this will need massive changes!! lily-dmdata is broken!
    SOCKET.on(WebSocketEvent.EARTHQUAKE_REPORT, async (data: EarthquakeInformationSchemaBody) => {
        // make embed
        console.log(data);

        if (!data.intensity) {
            return (channel as TextChannel)!.send({
                content:'`WebSocketEvent.EARTHQUAKE_REPORT` was fired, but there was no `data.intensity`, so i\'m just gonna skip it! the real one should come soon!\n\nthis message is purely for debugging purposes -lily',
                flags: [MessageFlags.SuppressNotifications]
            })
        }

        const embed = await BuildEarthquakeEmbed(
            new Date(data.earthquake.originTime || 0), 
            data.earthquake.magnitude.value,
            (data.intensity || {maxInt:ShindoValue.ZERO}).maxInt,
            data.earthquake.hypocenter.depth.value, //this is actually depth <-- no shit sherlock??
            data.earthquake.hypocenter.name, 
            true
        );

        EXISTING_EARTHQUAKES.delete(data.eventId);

        // send embed
        (channel as TextChannel)!.send({embeds:[embed]});
    });

    SOCKET.on(WebSocketEvent.PING, () => {
        L.debug('dmdata ping');
    });

    SOCKET.on(WebSocketEvent.OPENED, () => {
        L.debug('dmdata connection opened ok!');
        if (is_reconnecting) (channel as TextChannel)!.send({
            content:`okaaay, i reconnected successfully after ${reconnect_tries>1?reconnect_tries+' tries':reconnect_tries+' try'}.`,
            flags:[MessageFlags.SuppressNotifications]
        });
        is_reconnecting = false;
    });

    SOCKET.on(WebSocketEvent.CLOSED, () => {
        L.debug('dmdata connection closed!');
        (channel as TextChannel)!.send({
            content:'i was disconnected from dmdata, i will try to reconnect in 3 seconds...',
            flags:[MessageFlags.SuppressNotifications]
        });

        is_reconnecting = true;
        reconnect_tries = 0;

        setTimeout(() => {
            open_socket(SOCKET);
            reconnect_tries++;
        }, 3000);
    });

    SOCKET.on(WebSocketEvent.EEW_FORECAST, async (data: EEWInformationSchemaBody) => {
        console.log(data);

        let embed = BuildEEWEmbed(
            new Date((data.earthquake || {originTime:'0'}).originTime),
            data.earthquake.magnitude.value,
            (data.intensity || {forecastMaxInt: {to: 'unknown'}}).forecastMaxInt.to,
            data.earthquake.hypocenter.depth.value,
            data.earthquake.hypocenter.name,
            {message: undefined, report_count: parseInt(data.serialNo), is_warning: data.isWarning}
        );

        if (EXISTING_EARTHQUAKES.has(data.eventId)) {
            const event = EXISTING_EARTHQUAKES.get(data.eventId)!;
            event.report_count += 1;
            EXISTING_EARTHQUAKES.set(data.eventId, {message:event.message, report_count:data.isLastInfo?999:parseInt(data.serialNo), is_warning:data.isWarning});

            event.report_count = data.isLastInfo?999:parseInt(data.serialNo);

            embed = BuildEEWEmbed(
                new Date((data.earthquake || {originTime:'0'}).originTime),
                data.earthquake.magnitude.value,
                (data.intensity || {forecastMaxInt: {to: 'unknown'}}).forecastMaxInt.to,
                data.earthquake.hypocenter.depth.value,
                data.earthquake.hypocenter.name,
                event
            );

            return await event.message.edit({
                embeds: [embed]
            });
        }

        try {
            const sent = await (channel as TextChannel)!.send({
                content:'',
                embeds: [embed]
            });
            EXISTING_EARTHQUAKES.set(data.eventId, {message:sent, is_warning: false, report_count: 1});
        } catch (err: any) {
            L.error(err);
        }
    });

    SOCKET.on(WebSocketEvent.EEW_WARNING, async (data: EEWInformationSchemaBody) => {
        console.log(data.serialNo);

        let embed = BuildEEWEmbed(
            new Date((data.earthquake || {originTime:'0'}).originTime),
            data.earthquake.magnitude.value,
            data.intensity.forecastMaxInt.to,
            data.earthquake.hypocenter.depth.value,
            data.earthquake.hypocenter.name,
            {message: undefined, report_count: parseInt(data.serialNo), is_warning: data.isWarning}
        );

        if (EXISTING_EARTHQUAKES.has(data.eventId)) {
            const event = EXISTING_EARTHQUAKES.get(data.eventId)!;
            if (!event.is_warning) event.message.reply({content:`${GetEmoji(EMOJI.EPICENTER)} EEW Forecast was upgraded to EEW Warning!`})
            event.report_count = data.isLastInfo?999:parseInt(data.serialNo);
            event.is_warning = true;

            EXISTING_EARTHQUAKES.set(data.eventId, event);

            embed = BuildEEWEmbed(
                new Date((data.earthquake || {originTime:'0'}).originTime),
                data.earthquake.magnitude.value,
                data.intensity.forecastMaxInt.to,
                data.earthquake.hypocenter.depth.value,
                data.earthquake.hypocenter.name,
                event
            );

            return event.message.edit({
                embeds: [embed]
            });
        }

        try {
            const sent = await (channel as TextChannel)!.send({
                content:'',
                embeds: [embed]
            });
            EXISTING_EARTHQUAKES.set(data.eventId, {message:sent, is_warning: true, report_count: 1});
        } catch (err: any) {
            L.error(err);
        }
    });

    open_socket(SOCKET);
}

// lat_min 	    lat_max 	lon_min 	    lon_max
// 20.2145811 	45.7112046 	122.7141754 	154.205541

export function RenderNewEarthquakeImage() {
    const SAVE_LOCATION = join(BASE_DIRNAME, 'temp', 'earthquake.png');
    const canvas = createCanvas(500, 500);


    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock.png'), buffer);
}


export async function SendNewReportNow(data: any) {
    // const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

    const eq = data.Report.Body.Earthquake;
    const obs = data.Report.Body.Intensity.Observation;

    const OriginTime = new Date(eq.OriginTime._text);
    const MaxInt = obs.MaxInt._text;
    const Magnitude = eq['jmx_eb:Magnitude']._text;
    const HypocenterName = obs.Pref.Area.Name._text;
    const HypocenterDepth = 'unknown';

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName, true);

    // send embed
    const channel = client.channels.cache.get(MONITORING_CHANNEL);
    (channel as TextChannel)!.send({embeds:[embed]});
}


export function DoEarthquakeTest(data: any) {
    // const d = {"_originalId":"a5ae7db672a013e06e594be8cf60dba87cbcfe64d4b4fbf1dba3253bd87272dd0d27b481c76e48bc3267369b548fc000","_schema":{"type":"eew-information","version":"1.0.0"},"type":"緊急地震速報（予報）","title":"緊急地震速報（予報）","status":"通常","infoType":"発表","editorialOffice":"気象庁本庁","publishingOffice":["気象庁"],"pressDateTime":"2025-02-02T08:13:26Z","reportDateTime":"2025-02-02T17:13:26+09:00","targetDateTime":"2025-02-02T17:13:26+09:00","eventId":"20250202171318","serialNo":"1","infoKind":"緊急地震速報","infoKindVersion":"1.0_0","headline":null,"body":{"isLastInfo":false,"isCanceled":false,"isWarning":false,"earthquake":{"originTime":"2025-02-02T17:13:09+09:00","arrivalTime":"2025-02-02T17:13:18+09:00","hypocenter":{"code":"289","name":"福島県沖","coordinate":{"latitude":{"text":"37.1˚N","value":"37.1000"},"longitude":{"text":"141.2˚E","value":"141.2000"},"height":{"type":"高さ","unit":"m","value":"-50000"},"geodeticSystem":"日本測地系"},"depth":{"type":"深さ","unit":"km","value":"50"},"reduce":{"code":"9739","name":"福島沖"},"landOrSea":"海域","accuracy":{"epicenters":["4","4"],"depth":"4","magnitudeCalculation":"5","numberOfMagnitudeCalculation":"1"}},"magnitude":{"type":"マグニチュード","value":"4.2","unit":"Mj"}},"intensity":{"forecastMaxInt":{"from":"3","to":"3"},"regions":[]}}};
    
    const compressed = gzipSync(JSON.stringify(data));
    SOCKET.EmulateMessageInternally(JSON.stringify(
        { "type": "data", "version": "2.0", "id": "44a7b424f0512f53edd94b66c4f5bedee8a490dae1d8cbdf154bc3d14609062b4c69f3d833dde73c7a95c752399e6d5d", "originalId": "7bae091f882328dd8064f29e62d444402f779a46e4dc06c8f964a52da61e4d04bc53f1317a777256b9ba1a02fe6e46ac", "classification": "eew.forecast", "passing": [{ "name": "socket-03", "time": "2025-01-25T23:12:12.976Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.978Z" }, { "name": "json-03", "time": "2025-01-25T23:12:12.982Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.984Z" }, { "name": "websocket-02", "time": "2025-01-25T23:12:13.002Z" }], "head": { "type": "VXSE44", "author": "JPOS", "time": "2025-01-25T23:12:00.000Z", "designation": null, "test": false }, "xmlReport": { "control": { "title": "緊急地震速報（予報）", "dateTime": "2025-01-25T23:12:12Z", "status": "通常", "editorialOffice": "大阪管区気象台", "publishingOffice": "気象庁" }, "head": { "title": "緊急地震速報（予報）", "reportDateTime": "2025-01-26T08:12:12+09:00", "targetDateTime": "2025-01-26T08:12:12+09:00", "eventId": "20250126081132", "serial": "4", "infoType": "発表", "infoKind": "緊急地震速報", "infoKindVersion": "1.0_0", "headline": null } }, "format": "json", "schema": { "type": "eew-information", "version": "1.0.0" }, "compression": "gzip", "encoding": "base64", "body": compressed.toString('base64') }
    ))
}






export const RecentEarthquakeSlashCommand = new SlashCommandBuilder()
    .setName('recent-eq').setNameLocalization('ja', '地震')
    .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る')