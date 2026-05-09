export default async function(ctx) {
  const env = ctx.env || {};
  const now = new Date();

  const title = env.TITLE || "Egern";
  const openUrl = env.OPEN_URL || "https://egernapp.com";
  const lookupIP = env.LOOKUP_IP || "8.8.8.8";
  const family = ctx.widgetFamily || "unknown";

  const device = ctx.device || {};
  const app = ctx.app || {};

  // 持久化渲染次数
  const key = "egern_widget_counter";
  const data = ctx.storage.getJSON(key) || { count: 0 };
  data.count += 1;
  data.last = now.toISOString();
  ctx.storage.setJSON(key, data);

  let ipText = "未查询";
  try {
    const info = ctx.lookupIP(lookupIP);
    if (info) {
      ipText = `${lookupIP} · ${info.country || "?"} · AS${info.asn || "?"}`;
    } else {
      ipText = `${lookupIP} · 无结果`;
    }
  } catch (e) {
    ipText = `${lookupIP} · 查询失败`;
  }

  function icon(name, color, size) {
    return {
      type: "image",
      src: "sf-symbol:" + name,
      width: size || 18,
      height: size || 18,
      color: color || "#FFFFFF",
      resizeMode: "contain"
    };
  }

  function text(value, color, size, weight, maxLines) {
    return {
      type: "text",
      text: String(value || ""),
      textColor: color || "#FFFFFF",
      font: {
        size: size || "subheadline",
        weight: weight || "medium"
      },
      maxLines: maxLines || 1,
      minScale: 0.6
    };
  }

  function row(label, value, symbol, color) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 6,
      children: [
        icon(symbol, color, 15),
        text(label, "#FFFFFF99", "caption1", "medium", 1),
        { type: "spacer" },
        {
          type: "text",
          text: String(value || "无"),
          textColor: "#FFFFFF",
          font: { size: "caption1", weight: "semibold" },
          textAlign: "right",
          maxLines: 1,
          minScale: 0.5
        }
      ]
    };
  }

  function card(children, color) {
    return {
      type: "stack",
      direction: "column",
      gap: 6,
      padding: 10,
      backgroundColor: "#FFFFFF14",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#FFFFFF24",
      shadowColor: "#00000055",
      shadowRadius: 8,
      shadowOffset: { x: 0, y: 3 },
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 6,
          children: [
            {
              type: "stack",
              width: 7,
              height: 7,
              backgroundColor: color || "#34C759",
              borderRadius: "auto",
              children: []
            },
            ...children
          ]
        }
      ]
    };
  }

  // 锁屏小组件：小尺寸单独适配
  if (family === "accessoryInline") {
    return {
      type: "widget",
      url: openUrl,
      children: [
        {
          type: "text",
          text: `${title} · ${device.wifi?.ssid || device.ipv4?.address || "Ready"}`,
          font: { size: "caption1", weight: "semibold" },
          maxLines: 1
        }
      ]
    };
  }

  if (family === "accessoryCircular") {
    return {
      type: "widget",
      url: openUrl,
      padding: 4,
      gap: 2,
      children: [
        icon("bolt.circle.fill", "#34C759", 24),
        {
          type: "text",
          text: "OK",
          font: { size: "caption2", weight: "bold" },
          textAlign: "center",
          maxLines: 1
        }
      ]
    };
  }

  if (family === "accessoryRectangular") {
    return {
      type: "widget",
      url: openUrl,
      padding: 6,
      gap: 3,
      children: [
        text(title, "#FFFFFF", "caption1", "bold", 1),
        text(device.wifi?.ssid || device.ipv4?.address || "网络信息未提供", "#FFFFFFBB", "caption2", "medium", 1),
        {
          type: "date",
          date: now.toISOString(),
          format: "time",
          font: { size: "caption2", weight: "regular" },
          textColor: "#FFFFFF88",
          maxLines: 1
        }
      ]
    };
  }

  const compact = family === "systemSmall";

  const children = [
    {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 8,
      children: [
        icon("bolt.horizontal.circle.fill", "#34C759", 24),
        {
          type: "stack",
          direction: "column",
          gap: 2,
          flex: 1,
          children: [
            text(title, "#FFFFFF", "title3", "bold", 1),
            text(`Widget · ${family}`, "#FFFFFF99", "caption1", "medium", 1)
          ]
        },
        {
          type: "date",
          date: now.toISOString(),
          format: "time",
          font: { size: "caption1", weight: "semibold" },
          textColor: "#FFFFFFCC",
          textAlign: "right",
          maxLines: 1
        }
      ]
    },

    {
      type: "stack",
      direction: "row",
      gap: 8,
      children: [
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          padding: 10,
          backgroundColor: "#0A84FF26",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#0A84FF66",
          children: [
            icon("app.connected.to.app.below.fill", "#0A84FF", 20),
            text("App", "#FFFFFF88", "caption2", "medium", 1),
            text(app.version || "未知", "#FFFFFF", "caption1", "bold", 1)
          ]
        },
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          padding: 10,
          backgroundColor: "#34C75926",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#34C75966",
          children: [
            icon("arrow.clockwise.circle.fill", "#34C759", 20),
            text("渲染", "#FFFFFF88", "caption2", "medium", 1),
            text(`${data.count} 次`, "#FFFFFF", "caption1", "bold", 1)
          ]
        }
      ]
    },

    row("Wi-Fi", device.wifi?.ssid || "无", "wifi", "#0A84FF"),
    row("IPv4", device.ipv4?.address || "无", "globe", "#34C759"),
    row("网关", device.ipv4?.gateway || "无", "point.3.connected.trianglepath.dotted", "#FF9F0A")
  ];

  if (!compact) {
    children.push(
      row("IPv6", device.ipv6?.address || "无", "network", "#64D2FF"),
      row("DNS", Array.isArray(device.dnsServers) ? device.dnsServers.join(", ") : "无", "server.rack", "#BF5AF2"),
      row("IP 查询", ipText, "location.circle.fill", "#FF9F0A"),
      card([
        icon("calendar", "#FFFFFF", 16),
        text("上次刷新", "#FFFFFFAA", "caption1", "medium", 1),
        { type: "spacer" },
        {
          type: "date",
          date: now.toISOString(),
          format: "relative",
          font: { size: "caption1", weight: "medium" },
          textColor: "#FFFFFF",
          textAlign: "right",
          maxLines: 1
        }
      ], "#BF5AF2")
    );
  }

  return {
    type: "widget",
    url: openUrl,
    refreshAfter: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    padding: 14,
    gap: 8,
    backgroundGradient: {
      type: "linear",
      colors: ["#101828", "#1D2939", "#344054"],
      stops: [0, 0.65, 1],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 }
    },
    children
  };
}
