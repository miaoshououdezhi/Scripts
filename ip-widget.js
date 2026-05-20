export default async function(ctx) {
  const env = ctx.env || {};
  const family = ctx.widgetFamily || 'systemMedium';

  const device = ctx.device || {};
  const ipv4 = device.ipv4 || {};
  const ipv6 = device.ipv6 || {};
  const wifi = device.wifi || {};
  const cellular = device.cellular || {};

  const nowISO = new Date().toISOString();
  const refreshAfter = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const publicResult = await getPublicIP(ctx, env);

  const localIPv4 = clean(ipv4.address);
  const localIPv6 = clean(ipv6.address);

  const publicIP = clean(publicResult.ip);
  const primaryIP = publicIP || localIPv4 || localIPv6 || '未获取';
  const primaryTitle = publicIP ? '公网 IP' : '本机 IP';

  let ipInfo = null;
  try {
    if (primaryIP && primaryIP !== '未获取') {
      ipInfo = ctx.lookupIP(primaryIP);
    }
  } catch (_) {
    ipInfo = null;
  }

  const networkName =
    clean(wifi.ssid) ||
    [clean(cellular.carrier), clean(cellular.radio)].filter(Boolean).join(' ') ||
    '未知网络';

  const data = {
    family,
    nowISO,
    refreshAfter,

    primaryTitle,
    primaryIP,
    publicIP,
    publicNote: publicResult.note,

    country: ipInfo?.country || '—',
    asn: ipInfo?.asn ? `AS${ipInfo.asn}` : '—',
    organization: ipInfo?.organization || '—',

    networkName,
    ssid: clean(wifi.ssid) || '—',
    bssid: clean(wifi.bssid) || '—',

    localIPv4: localIPv4 || '—',
    localIPv6: localIPv6 || '—',
    gateway: clean(ipv4.gateway) || '—',
    iface4: clean(ipv4.interface) || '—',
    iface6: clean(ipv6.interface) || '—',

    carrier: clean(cellular.carrier) || '—',
    radio: clean(cellular.radio) || '—',

    dns: Array.isArray(device.dnsServers) && device.dnsServers.length
      ? device.dnsServers.join(' · ')
      : '—',
  };

  if (family === 'systemSmall') return renderSmall(data);
  if (family === 'systemLarge') return renderLarge(data);
  return renderMedium(data);
};

async function getPublicIP(ctx, env) {
  const manualIP = clean(env.IP || env.TARGET_IP);
  if (manualIP) {
    return { ip: manualIP, note: '手动指定' };
  }

  const apiUrl = clean(env.IP_API_URL);
  if (!apiUrl) {
    return { ip: '', note: '未配置公网接口' };
  }

  try {
    const resp = await ctx.http.get(apiUrl, {
      timeout: Number(env.TIMEOUT || 8000),
      credentials: 'omit',
    });

    const text = await resp.text();
    let ip = '';

    try {
      const json = JSON.parse(text);
      ip = extractIP(
        json.ip ||
        json.query ||
        json.origin ||
        json.address ||
        json.data?.ip ||
        text
      );
    } catch (_) {
      ip = extractIP(text);
    }

    return {
      ip,
      note: ip ? '接口读取' : '接口未返回 IP',
    };
  } catch (_) {
    return { ip: '', note: '公网读取失败' };
  }
}

function renderSmall(d) {
  return root(d, [
    header('IP 卡片', 'sf-symbol:globe', '#FFFFFF'),

    { type: 'spacer', length: 4 },

    {
      type: 'text',
      text: d.primaryTitle,
      font: { size: 'caption1', weight: 'semibold' },
      textColor: '#FFFFFFB8',
      maxLines: 1,
    },

    {
      type: 'text',
      text: d.primaryIP,
      font: { size: 18, weight: 'bold', family: 'Menlo' },
      textColor: '#FFFFFF',
      maxLines: 1,
      minScale: 0.45,
    },

    pill(
      d.publicIP ? `${d.country} · ${d.asn}` : d.networkName,
      'sf-symbol:location.fill'
    ),

    { type: 'spacer' },

    updated(d.nowISO),
  ], 14, 8);
}

function renderMedium(d) {
  return root(d, [
    header('网络 IP 状态', 'sf-symbol:network', '#FFFFFF'),

    {
      type: 'stack',
      direction: 'row',
      gap: 10,
      children: [
        glassCard([
          label('主地址', 'sf-symbol:globe'),
          bigMono(d.primaryIP),
          subText(`${d.primaryTitle} · ${d.publicNote}`),
          miniLine('归属', `${d.country} · ${d.asn}`),
          miniLine('组织', d.organization),
        ], 1),

        glassCard([
          label('本机网络', 'sf-symbol:wifi'),
          miniLine('网络', d.networkName),
          miniLine('IPv4', d.localIPv4),
          miniLine('IPv6', d.localIPv6),
          miniLine('网关', d.gateway),
        ], 1),
      ],
    },

    { type: 'spacer' },

    updated(d.nowISO),
  ], 16, 10);
}

function renderLarge(d) {
  return root(d, [
    header('IP 与网络信息', 'sf-symbol:globe.asia.australia.fill', '#FFFFFF'),

    glassCard([
      label(d.primaryTitle, 'sf-symbol:location.fill'),
      bigMono(d.primaryIP),
      {
        type: 'stack',
        direction: 'row',
        gap: 8,
        children: [
          pill(d.country, 'sf-symbol:flag.fill'),
          pill(d.asn, 'sf-symbol:number'),
          pill(d.publicNote, 'sf-symbol:bolt.fill'),
        ],
      },
      miniLine('组织', d.organization),
    ]),

    {
      type: 'stack',
      direction: 'row',
      gap: 10,
      children: [
        glassCard([
          label('本机地址', 'sf-symbol:desktopcomputer'),
          miniLine('IPv4', d.localIPv4),
          miniLine('接口', d.iface4),
          miniLine('IPv6', d.localIPv6),
          miniLine('接口', d.iface6),
        ], 1),

        glassCard([
          label('连接信息', 'sf-symbol:wifi'),
          miniLine('Wi-Fi', d.ssid),
          miniLine('BSSID', d.bssid),
          miniLine('蜂窝', d.carrier),
          miniLine('制式', d.radio),
        ], 1),
      ],
    },

    glassCard([
      label('DNS 与网关', 'sf-symbol:server.rack'),
      miniLine('网关', d.gateway),
      miniLine('DNS', d.dns),
    ]),

    { type: 'spacer' },

    updated(d.nowISO),
  ], 16, 10);
}

function root(d, children, padding, gap) {
  return {
    type: 'widget',
    refreshAfter: d.refreshAfter,
    padding,
    gap,
    backgroundGradient: {
      type: 'linear',
      colors: ['#0F172A', '#1D4ED8', '#06B6D4'],
      stops: [0, 0.58, 1],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    children,
  };
}

function header(title, icon, color) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 8,
    children: [
      {
        type: 'image',
        src: icon,
        width: 18,
        height: 18,
        color,
      },
      {
        type: 'text',
        text: title,
        font: { size: 'headline', weight: 'bold' },
        textColor: '#FFFFFF',
        maxLines: 1,
        minScale: 0.7,
      },
      { type: 'spacer' },
    ],
  };
}

function glassCard(children, flex) {
  const card = {
    type: 'stack',
    direction: 'column',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: 'rgba(0,0,0,0.28)',
    shadowRadius: 12,
    shadowOffset: { x: 0, y: 6 },
    children,
  };

  if (flex) card.flex = flex;
  return card;
}

function label(text, icon) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    children: [
      {
        type: 'image',
        src: icon,
        width: 14,
        height: 14,
        color: '#FFFFFFD9',
      },
      {
        type: 'text',
        text,
        font: { size: 'caption1', weight: 'semibold' },
        textColor: '#FFFFFFD9',
        maxLines: 1,
      },
      { type: 'spacer' },
    ],
  };
}

function bigMono(text) {
  return {
    type: 'text',
    text,
    font: { size: 20, weight: 'bold', family: 'Menlo' },
    textColor: '#FFFFFF',
    maxLines: 1,
    minScale: 0.45,
  };
}

function subText(text) {
  return {
    type: 'text',
    text,
    font: { size: 'caption1', weight: 'medium' },
    textColor: '#FFFFFFA8',
    maxLines: 1,
    minScale: 0.6,
  };
}

function miniLine(name, value) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    children: [
      {
        type: 'text',
        text: name,
        font: { size: 'caption1', weight: 'medium' },
        textColor: '#FFFFFF99',
        maxLines: 1,
      },
      { type: 'spacer' },
      {
        type: 'text',
        text: clean(value) || '—',
        font: { size: 'caption1', weight: 'semibold' },
        textColor: '#FFFFFF',
        textAlign: 'right',
        maxLines: 1,
        minScale: 0.45,
      },
    ],
  };
}

function pill(text, icon) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 5,
    padding: [5, 8],
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    children: [
      {
        type: 'image',
        src: icon,
        width: 11,
        height: 11,
        color: '#FFFFFFD9',
      },
      {
        type: 'text',
        text: clean(text) || '—',
        font: { size: 'caption2', weight: 'semibold' },
        textColor: '#FFFFFF',
        maxLines: 1,
        minScale: 0.6,
      },
    ],
  };
}

function updated(dateISO) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    children: [
      {
        type: 'image',
        src: 'sf-symbol:clock',
        width: 12,
        height: 12,
        color: '#FFFFFFB8',
      },
      {
        type: 'text',
        text: '更新于',
        font: { size: 'caption2', weight: 'medium' },
        textColor: '#FFFFFFA8',
      },
      {
        type: 'date',
        date: dateISO,
        format: 'relative',
        font: { size: 'caption2', weight: 'medium' },
        textColor: '#FFFFFFD0',
      },
      { type: 'spacer' },
    ],
  };
}

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function extractIP(value) {
  const text = clean(value);

  const ipv4 = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (ipv4) return ipv4[0];

  const ipv6 = text.match(/\b[0-9a-fA-F:]{2,}:[0-9a-fA-F:]+\b/);
  if (ipv6) return ipv6[0];

  return '';
}
