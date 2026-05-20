export default async function(ctx) {
  const env = ctx.env || {};
  const family = ctx.widgetFamily || 'systemSmall';

  const nowISO = new Date().toISOString();
  const refreshMinutes = Number(env.REFRESH_MINUTES || 10);
  const refreshAfter = new Date(Date.now() + refreshMinutes * 60 * 1000).toISOString();

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

  const country = ipInfo?.country || '—';
  const asn = ipInfo?.asn ? `AS${ipInfo.asn}` : '—';
  const organization = ipInfo?.organization || '—';
  const flag = countryFlag(country);

  const data = {
    family,
    nowISO,
    refreshAfter,
    exitIP: exitIP || '获取失败',
    country,
    flag,
    asn,
    organization,
    status: exitResult.note,
    policy: exitResult.policy || '默认策略',
  };

  if (family === 'systemMedium') return renderMedium(data);
  if (family === 'systemLarge') return renderLarge(data);
  return renderSmall(data);
}

async function getProxyExitIP(ctx, env) {
  const apiUrl = clean(env.IP_API_URL);

  if (!apiUrl) {
    return {
      ip: '',
      note: '未配置接口',
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
      note: ip ? '代理出口' : '接口无 IP',
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
  return cardRoot(d, [
    topBar(),

    {
      type: 'spacer',
      length: 14,
    },

    {
      type: 'text',
      text: d.exitIP,
      font: {
        size: 38,
        weight: 'regular',
        family: 'Avenir Next',
      },
      textColor: '#FFFFFF',
      maxLines: 1,
      minScale: 0.38,
    },

    {
      type: 'spacer',
      length: 18,
    },

    {
      type: 'text',
      text: `${d.country} ${d.flag}`,
      font: {
        size: 32,
        weight: 'medium',
      },
      textColor: '#D8DAE8',
      maxLines: 1,
      minScale: 0.6,
    },

    {
      type: 'spacer',
      length: 18,
    },

    {
      type: 'text',
      text: `${d.asn} ${d.organization}`,
      font: {
        size: 25,
        weight: 'regular',
        family: 'Avenir Next',
      },
      textColor: '#B5B7C7',
      maxLines: 2,
      minScale: 0.45,
    },
  ]);
}

function renderMedium(d) {
  return cardRoot(d, [
    topBar(),

    {
      type: 'spacer',
      length: 10,
    },

    {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 14,
      children: [
        {
          type: 'stack',
          direction: 'column',
          gap: 12,
          flex: 1,
          children: [
            {
              type: 'text',
              text: d.exitIP,
              font: {
                size: 36,
                weight: 'regular',
                family: 'Avenir Next',
              },
              textColor: '#FFFFFF',
              maxLines: 1,
              minScale: 0.38,
            },
            {
              type: 'text',
              text: `${d.country} ${d.flag}`,
              font: {
                size: 30,
                weight: 'medium',
              },
              textColor: '#D8DAE8',
              maxLines: 1,
            },
          ],
        },
        {
          type: 'stack',
          direction: 'column',
          gap: 8,
          flex: 1,
          children: [
            infoLine('ASN', d.asn),
            infoLine('组织', d.organization),
            infoLine('策略', d.policy),
          ],
        },
      ],
    },
  ]);
}

function renderLarge(d) {
  return cardRoot(d, [
    topBar(),

    {
      type: 'spacer',
      length: 16,
    },

    {
      type: 'text',
      text: d.exitIP,
      font: {
        size: 44,
        weight: 'regular',
        family: 'Avenir Next',
      },
      textColor: '#FFFFFF',
      maxLines: 1,
      minScale: 0.38,
    },

    {
      type: 'spacer',
      length: 18,
    },

    {
      type: 'text',
      text: `${d.country} ${d.flag}`,
      font: {
        size: 34,
        weight: 'medium',
      },
      textColor: '#D8DAE8',
      maxLines: 1,
    },

    {
      type: 'spacer',
      length: 18,
    },

    {
      type: 'text',
      text: `${d.asn} ${d.organization}`,
      font: {
        size: 28,
        weight: 'regular',
        family: 'Avenir Next',
      },
      textColor: '#B5B7C7',
      maxLines: 2,
      minScale: 0.5,
    },

    {
      type: 'spacer',
      length: 16,
    },

    {
      type: 'stack',
      direction: 'column',
      gap: 10,
      padding: 16,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 24,
      children: [
        infoLine('状态', d.status),
        infoLine('策略', d.policy),
        infoLine('刷新', '自动'),
      ],
    },
  ]);
}

function cardRoot(d, children) {
  return {
    type: 'widget',
    refreshAfter: d.refreshAfter,
    padding: 24,
    gap: 0,
    backgroundGradient: {
      type: 'linear',
      colors: [
        '#12131A',
        '#1B1D2A',
        '#23263A',
        '#6D5DFB',
        '#00D4FF',
      ],
      stops: [0, 0.42, 0.72, 0.9, 1],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    borderRadius: 42,
    children,
  };
}

function topBar() {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 14,
    children: [
      {
        type: 'image',
        src: 'sf-symbol:globe',
        width: 38,
        height: 38,
        color: '#2F8CFF',
      },
      {
        type: 'text',
        text: '我的 IP',
        font: {
          size: 32,
          weight: 'medium',
          family: 'Avenir Next',
        },
        textColor: '#B7B9C8',
        maxLines: 1,
        minScale: 0.7,
      },
      {
        type: 'spacer',
      },
    ],
  };
}

function infoLine(name, value) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 8,
    children: [
      {
        type: 'text',
        text: name,
        font: {
          size: 15,
          weight: 'medium',
          family: 'Avenir Next',
        },
        textColor: '#9EA1B5',
        maxLines: 1,
      },
      {
        type: 'spacer',
      },
      {
        type: 'text',
        text: clean(value) || '—',
        font: {
          size: 15,
          weight: 'semibold',
          family: 'Avenir Next',
        },
        textColor: '#FFFFFF',
        textAlign: 'right',
        maxLines: 1,
        minScale: 0.5,
      },
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

function countryFlag(countryCode) {
  const code = clean(countryCode).toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return '🏳️';
  }

  return String.fromCodePoint(
    127397 + code.charCodeAt(0),
    127397 + code.charCodeAt(1)
  );
}
