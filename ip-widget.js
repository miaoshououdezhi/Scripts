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

  const exitResult = await getProxyExitIP(ctx, env);
  const exitIP = clean(exitResult.ip);

  let ipInfo = null;
  try {
    if (exitIP) {
      ipInfo = ctx.lookupIP(exitIP);
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

    exitIP: exitIP || '获取失败',
    exitStatus: exitResult.note,
    policy: exitResult.policy || '默认策略',

    country: ipInfo?.country || '—',
    asn: ipInfo?.asn ? `AS${ipInfo.asn}` : '—',
    organization: ipInfo?.organization || '—',

    networkName,
    ssid: clean(wifi.ssid) || '—',
    bssid: clean(wifi.bssid) || '—',

    localIPv4: clean(ipv4.address) || '—',
    localIPv6: clean(ipv6.address) || '—',
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

async function getProxyExitIP(ctx, env) {
  const apiUrl = clean(env.IP_API_URL);

  if (!apiUrl) {
    return {
      ip: '',
      note: '未配置 IP_API_URL',
      policy: clean(env.POLICY || env.POLICY_DESCRIPTOR) || '默认策略',
    };
  }

  const policy = clean(env.POLICY);
  const policyDescriptor = clean(env.POLICY_DESCRIPTOR);

  const options = {
    timeout: Number(env.TIMEOUT || 8000),
    credentials: 'omit',
  };

  if (policy) options.policy = policy;
  if (policyDescriptor) options.policyDescriptor = policyDescriptor;

  try {
    const resp = await ctx.http.get(apiUrl, options);
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
      note: ip ? '代理出口' : '接口未返回 IP',
      policy: policy || policyDescriptor || '默认策略',
    };
  } catch (_) {
    return {
      ip: '',
      note: '请求失败',
      policy: policy || policyDescriptor || '默认策略',
    };
  }
}

function renderSmall(d) {
  return root(d, [
    header('我的IP', 'sf-symbol:globe'),

    { type: 'spacer', length: 4 },

    {
      type: 'text',
      text: 'Exit IP',
      font: { size: 'caption1', weight: 'semibold' },
      textColor: '#FFFFFFB8',
      maxLines: 1,
    },

    {
      type: 'text',
      text: d.exitIP,
      font: { size: 18, weight: 'bold', family: 'Menlo' },
      textColor: '#FFFFFF',
      maxLines: 1,
      minScale: 0.45,
    },

    pill(`${d.country} · ${d.asn}`, 'sf-symbol:location.fill'),

    { type: 'spacer' },

    updated(d.nowISO),
  ], 14, 8);
}

function renderMedium(d) {
  return root(d, [
    header('我的IP', 'sf-symbol:globe'),

    {
      type: 'stack',
      direction: 'row',
      gap: 10,
      children: [
        glassCard([
          label('代理出口', 'sf-symbol:paperplane.fill'),
          bigMono(d.exitIP),
          subText(`${d.exitStatus} · ${d.policy}`),
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
    header('我的IP', 'sf-symbol:globe.asia.australia.fill'),

    glassCard([
      label('代理出口 IP', 'sf-symbol:paperplane.fill'),
      bigMono(d.exitIP),
      {
        type: 'stack',
        direction: 'row',
        gap: 8,
        children: [
          pill(d.country, 'sf-symbol:flag.fill'),
          pill(d.asn, 'sf-symbol:number'),
          pill(d.policy, 'sf-symbol:bolt.fill'),
        ],
      },
      miniLine('状态', d.exitStatus),
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

function header(title, icon) {
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
        color: '#FFFFFF',
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
