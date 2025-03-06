const ipSalt = "$rviE85fK@yJk*^@#$8n!AQ&qAWw%!!ZPVRiLi7&v#7uEUjoyrxA&QYwo^bjUEqWDUnh6eFbwKnnwjottpuDiB#3at#g^HM9nbG^Dc8!&5Xv#NgJEECdTt4wtJ84M!P4";
const encryptKey1 = "RTjjDmLfYnaDTZ6@N!uHsQ*rnGq@Ze*&$*HuVTMYiPcnScU^^MFNg5nyeLT7PWFGoH35hczBA33B!9#3W7#dfHWvy7gex86Cbpwy8zvouatmJyV#Y&xECEV3FKGFxKd@";
const encryptKey2 = "P$$E7oXSTt$!ga&hkz83A4%BfA#%DgTyc8X3mFZh7y7qaA%dg&&!kFGC4x$5jc!3Q48s%q@9Q%j4A*LLsX%9CrK^jJH852VVQSKanWynct!wJ7EcLGMb7dTeRqsQvmdzBm5VdqJy#D5Rima^hhLyryXLZhuxE5#uC%pwfCcn3mY#yGptJ^wrqrhavgcPC3Jru2zYqr!U5*gwwQ84RGz%VHVb6pKBvzzi#5wPHAYsL&wSBN!$&kkCHGC3iWEr5iHzCDR^B7aW!ENpC&!FKyjueD5##HBqzLShc3d@Xz#%zzPRRsBHX*oDwqri!djzeDYUiusM9Hhsw3v5$s#j47YbiLbG^yh3j&pp759!GT^9Qm9Lw3MK8woLL3H$@KnhF5Kd";

const origin = window.location.origin;

async function sha256(data) {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function getIp() {
    const response = await fetch(`${origin}/.nexus/ip`);
    return response.text();
}

async function getChallenge(key) {
    const response = await fetch(`${origin}/.nexus/interact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
    });
    return response.json();
}

async function validateSolution(path, body, payload) {
    const response = await fetch(`${origin}/.nexus/interact/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Payload': payload,
            'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify(body),
    });
    return response.text();
}

async function getPass(token) {
    const response = await fetch(`${origin}/.nexus/request_connector`, {
        method: 'POST',
        headers: { token },
    });
    return response;
}

async function solveJsChallenge(hashedChallenge, difficulty) {
    const goal = "0".repeat(difficulty);
    let counter = 0;
    while (true) {
        const challengeAttempt = await sha256(hashedChallenge + counter);
        if (challengeAttempt.startsWith(goal)) {
            return counter;
        }
        counter++;
    }
}

function encodeStrings(string1, string2) {
    const toCharCodes = str => Array.from(str).map(char => char.charCodeAt(0));
    const toPaddedHex = num => num.toString(16).padStart(2, '0');
    const xorCharCodes = dataCharCodes => toCharCodes(string1).reduce((acc, curr) => acc ^ curr, dataCharCodes);
    return Array.from(string2).map(toCharCodes).map(xorCharCodes).map(toPaddedHex).join('');
}

async function jsc() {
    try {
        const ip = await getIp();
        const key = await sha256(ip + ipSalt);
        const challenge = await getChallenge(key);
        const hashedChallenge = await sha256(challenge.secret);
        const nonce = await solveJsChallenge(hashedChallenge, challenge.difficulty);

        const payloadData = {
            solution: nonce,
            isBot: false,
            jsfp: 'https://discord.gg/bypass-vip',
            secret: challenge.secret,
        };
        const payload = encodeStrings(encryptKey1, JSON.stringify(payloadData));

        const bodyData = {
            key,
            snitch: encodeStrings(encryptKey1, encryptKey2),
            ramp: encodeStrings(hashedChallenge, encryptKey2),
            tod: new Date().toISOString(),
            [encodeStrings(nonce.toString(), encryptKey2)]: encodeStrings(encryptKey2, nonce.toString()),
        };

        const res = await validateSolution(hashedChallenge, bodyData, payload);
        if (res === "OK") {
            await getPass(hashedChallenge);
            const destination = new URL(window.location.href).searchParams.get("destination");
            window.location.assign(decodeURIComponent(destination));
        }
    } catch (error) {
        console.error('Error during JS challenge:', error);
    }
}

jsc();
