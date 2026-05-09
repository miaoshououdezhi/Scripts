export default async function(ctx) {
  const env = ctx.env || {};
  const now = new Date();

  const title = env.TITLE || "Egern";
  const openUrl = env.OPEN_URL || "https://egernapp.com";
  const family = ctx.widgetFamily || "systemSmall";

  const app = ctx.app || {};
  const device = ctx.device || {};

  const wifi = device.wifi?.ssid || "未连接";
  const ipv4 = device.ipv4?.address || "无";
  const gateway = device.ipv4?.gateway || "无";
  const iface = device.ipv4?.interface || "无";
  const ipv6 = device.ipv6?.address || "无";
  const dns = Array.isArray(device.dnsServers) ? device.dnsServers.join(", ") : "无";

  let counter = { count: 0 };
  try {
    counter = ctx.storage.getJSON("egern_widget_counter_v2") || { count: 0 };
    counter.count += 1;
    counter.last = now.toISOString();
    ctx.storage.setJSON("egern_widget_counter_v2", counter);
  } catch (e) {
    counter = { count: 0 };
  }

  function text(value, opt = {}) {
    const node = {
      type: "text",
      text: String(value ?? ""),
      textColor: opt.color || "#FFFFFF",
      font: {
        size: opt.size || 13,
        weight: opt.weight || "medium"
      },
      maxLines: opt.maxLines || 1,
      minScale: opt.minScale || 0.65
    };

    if (opt.align) node.textAlign = opt.align;
    if (opt.opacity !== undefined) node.opacity = opt.opacity;

    return node;
  }

  function icon(name, color = "#FFFFFF", size = 16) {
    return {
      type: "image",
      src: "sf-symbol:" + name,
      width: size,
      height: size,
      color,
      resizeMode: "contain"
    };
  }

  function base(children, opt = {}) {
    return {
      type: "widget",
      url: openUrl,
      refreshAfter: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      padding: opt.padding || 14,
      gap: opt.gap || 8,
      backgroundGradient: {
        type: "linear",
        colors: ["#101828", "#172033", "#24364D"],
        stops: [0, 0.55, 1],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      },
      children
    };
  }

  function header(subtitle, compact = false) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: compact ? 7 : 9,
      children: [
        icon("bolt.horizontal.circle.fill", "#34C759", compact ? 24 : 28),
        {
          type: "stack",
          direction: "column",
          gap: 1,
          flex: 1,
          children: [
            text(title, {
              size: compact ? 18 : 21,
              weight: "bold",
              color: "#FFFFFF"
            }),
            text(subtitle, {
              size: compact ? 10 : 11,
              weight: "medium",
              color: "#FFFFFF88",
              maxLines: 1
            })
          ]
        },
        {
          type: "date",
          date: now.toISOString(),
          format: "time",
          font: {
            size: compact ? 13 : 14,
            weight: "semibold"
          },
          textColor: "#FFFFFFCC",
          textAlign: "right",
          maxLines: 1,
          minScale: 0.7
        }
      ]
    };
  }

  function smallNetworkCard() {
    return {
      type: "stack",
      direction: "column",
      gap: 5,
      padding: [8, 10, 8, 10],
      backgroundColor: "#FFFFFF12",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#FFFFFF24",
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 6,
          children: [
            icon("wifi", wifi === "未连接" ? "#FF9F0A" : "#0A84FF", 15),
            text("Wi-Fi", {
              size: 11,
              weight: "semibold",
              color: "#FFFFFF99"
            }),
            { type: "spacer" },
            text(wifi === "未连接" ? "离线" : "已连接", {
              size: 11,
              weight: "semibold",
              color: wifi === "未连接" ? "#FF9F0A" : "#34C759",
              align: "right"
            })
          ]
        },
        text(wifi, {
          size: 17,
          weight: "bold",
          color: "#FFFFFF",
          maxLines: 1,
          minScale: 0.5
        }),
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 5,
          children: [
            icon("globe", "#34C759", 13),
            text(ipv4, {
              size: 12,
              weight: "semibold",
              color: "#FFFFFFDD",
              maxLines: 1,
              minScale: 0.55
            })
          ]
        }
      ]
    };
  }

  function smallBottom() {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 6,
      children: [
        icon("point.3.connected.trianglepath.dotted", "#FF9F0A", 13),
        text("网关", {
          size: 11,
          weight: "medium",
          color: "#FFFFFF88"
        }),
        text(gateway, {
          size: 12,
          weight: "semibold",
          color: "#FFFFFF",
          maxLines: 1,
          minScale: 0.55
        }),
        { type: "spacer" },
        icon("arrow.clockwise.circle.fill", "#34C759", 13),
        text(`${counter.count}次`, {
          size: 11,
          weight: "semibold",
          color: "#FFFFFFBB",
          align: "right"
        })
      ]
    };
  }

  function metricCard(label, value, symbol, color) {
    return {
      type: "stack",
      direction: "column",
      gap: 5,
      flex: 1,
      padding: 11,
      backgroundColor: "#FFFFFF12",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: color + "66",
      children: [
        icon(symbol, color, 20),
        text(label, {
          size: 11,
          weight: "medium",
          color: "#FFFFFF88"
        }),
        text(value, {
          size: 15,
          weight: "bold",
          color: "#FFFFFF",
          maxLines: 1,
          minScale: 0.55
        })
      ]
    };
  }

  function row(label, value, symbol, color) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 7,
      padding: [3, 0, 3, 0],
      children: [
        icon(symbol, color, 15),
        text(label, {
          size: 12,
          weight: "medium",
          color: "#FFFFFF8F"
        }),
        { type: "spacer" },
        text(value, {
          size: 13,
          weight: "semibold",
          color: "#FFFFFF",
          align: "right",
          maxLines: 1,
          minScale: 0.5
        })
      ]
    };
  }

  // 锁屏内联
  if (family === "accessoryInline") {
    return {
      type: "widget",
      url: openUrl,
      children: [
        text(`${title} · ${wifi} · ${ipv4}`, {
          size: "caption1",
          weight: "semibold",
          maxLines: 1
        })
      ]
    };
  }

  // 锁屏圆形
  if (family === "accessoryCircular") {
    return {
      type: "widget",
      url: openUrl,
      padding: 4,
      gap: 2,
      children: [
        icon("bolt.circle.fill", "#34C759", 24),
        text("OK", {
          size: "caption2",
          weight: "bold",
          align: "center"
        })
      ]
    };
  }

  // 锁屏矩形
  if (family === "accessoryRectangular") {
    return {
      type: "widget",
      url: openUrl,
      padding: 6,
      gap: 3,
      children: [
        text(title, {
          size: "caption1",
          weight: "bold"
        }),
        text(wifi, {
          size: "caption2",
          weight: "medium",
          color: "#FFFFFFBB",
          maxLines: 1
        }),
        text(ipv4, {
          size: "caption2",
          weight: "semibold",
          color: "#34C759",
          maxLines: 1
        })
      ]
    };
  }

  // 主屏幕小组件：只保留最重要信息，避免拥挤
  if (family === "systemSmall") {
    return base(
      [
        header("网络状态", true),
        smallNetworkCard(),
        smallBottom()
      ],
      {
        padding: 12,
        gap: 8
      }
    );
  }

  // 主屏幕中号 / 大号：显示更多信息
  const children = [
    header("网络状态总览", false),

    {
      type: "stack",
      direction: "row",
      gap: 9,
      children: [
        metricCard("App", app.version || "未知", "app.connected.to.app.below.fill", "#0A84FF"),
        metricCard("渲染", `${counter.count} 次`, "arrow.clockwise.circle.fill", "#34C759")
      ]
    },

    row("Wi-Fi", wifi, "wifi", "#0A84FF"),
    row("IPv4", ipv4, "globe", "#34C759"),
    row("网关", gateway, "point.3.connected.trianglepath.dotted", "#FF9F0A"),
    row("接口", iface, "switch.2", "#BF5AF2")
  ];

  if (family === "systemLarge" || family === "systemExtraLarge") {
    children.push(
      row("IPv6", ipv6, "network", "#64D2FF"),
      row("DNS", dns, "server.rack", "#BF5AF2"),
      {
        type: "spacer"
      },
      {
        type: "date",
        date: now.toISOString(),
        format: "relative",
        font: {
          size: 12,
          weight: "medium"
        },
        textColor: "#FFFFFF88",
        maxLines: 1
      }
    );
  }

  return base(children, {
    padding: 16,
    gap: 10
  });
}
