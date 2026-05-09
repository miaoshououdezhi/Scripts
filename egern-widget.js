export default async function(ctx) {
  const env = ctx.env || {};
  const now = new Date();

  const title = env.TITLE || "Egern";
  const openUrl = env.OPEN_URL || "https://egernapp.com";
  const family = ctx.widgetFamily || "systemSmall";

  const d = ctx.device || {};
  const wifi = d.wifi || {};
  const cellular = d.cellular || {};
  const ipv4 = d.ipv4 || {};
  const ipv6 = d.ipv6 || {};

  const ssid = wifi.ssid || "";
  const carrier = cellular.carrier || "";
  const radio = cellular.radio || "";
  const ip = ipv4.address || "";
  const gateway = ipv4.gateway || "";
  const iface = ipv4.interface || ipv6.interface || "";

  const hasWifi = !!ssid;
  const hasCellular = !!carrier || !!radio;

  // 这里是显示层判断，不是官方保证的“实际出口判断”
  const networkType = hasWifi
    ? "Wi-Fi"
    : hasCellular
      ? "蜂窝数据"
      : "未知网络";

  const networkName = hasWifi
    ? ssid
    : hasCellular
      ? [carrier, radio].filter(Boolean).join(" · ")
      : "未检测到网络名称";

  const mainColor = hasWifi ? "#0A84FF" : hasCellular ? "#34C759" : "#FF9F0A";
  const mainIcon = hasWifi ? "wifi" : hasCellular ? "antenna.radiowaves.left.and.right" : "questionmark.circle";

  let counter = { count: 0 };
  try {
    counter = ctx.storage.getJSON("egern_widget_network_counter") || { count: 0 };
    counter.count += 1;
    counter.last = now.toISOString();
    ctx.storage.setJSON("egern_widget_network_counter", counter);
  } catch (e) {
    counter = { count: 0 };
  }

  function text(value, opt = {}) {
    return {
      type: "text",
      text: String(value ?? ""),
      textColor: opt.color || "#FFFFFF",
      font: {
        size: opt.size || 13,
        weight: opt.weight || "medium"
      },
      textAlign: opt.align || "left",
      maxLines: opt.maxLines || 1,
      minScale: opt.minScale || 0.55
    };
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

  function root(children, opt = {}) {
    return {
      type: "widget",
      url: openUrl,
      refreshAfter: new Date(now.getTime() + 60 * 1000).toISOString(),
      padding: opt.padding || 14,
      gap: opt.gap || 8,
      backgroundGradient: {
        type: "linear",
        colors: hasWifi
          ? ["#0B1220", "#10233D", "#123A5A"]
          : hasCellular
            ? ["#061B12", "#123322", "#1D4D31"]
            : ["#1F1300", "#3B2605", "#4A3008"],
        stops: [0, 0.55, 1],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      },
      children
    };
  }

  function header() {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 8,
      children: [
        icon(mainIcon, mainColor, 27),
        {
          type: "stack",
          direction: "column",
          gap: 1,
          flex: 1,
          children: [
            text(title, {
              size: 20,
              weight: "bold"
            }),
            text(networkType, {
              size: 11,
              weight: "semibold",
              color: mainColor
            })
          ]
        },
        {
          type: "date",
          date: now.toISOString(),
          format: "time",
          font: {
            size: 13,
            weight: "semibold"
          },
          textColor: "#FFFFFFCC",
          textAlign: "right",
          maxLines: 1
        }
      ]
    };
  }

  function bigStatusCard() {
    return {
      type: "stack",
      direction: "column",
      gap: 6,
      padding: [10, 11],
      backgroundColor: "#FFFFFF13",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: mainColor + "66",
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 6,
          children: [
            icon(mainIcon, mainColor, 15),
            text(networkType, {
              size: 12,
              weight: "semibold",
              color: "#FFFFFFAA"
            }),
            { type: "spacer" },
            text(hasWifi ? "无线" : hasCellular ? "移动" : "未知", {
              size: 12,
              weight: "bold",
              color: mainColor,
              align: "right"
            })
          ]
        },
        text(networkName, {
          size: 17,
          weight: "bold",
          color: "#FFFFFF",
          maxLines: 1,
          minScale: 0.45
        }),
        text(ip || "IPv4 未获取", {
          size: 12,
          weight: "semibold",
          color: "#FFFFFFCC",
          maxLines: 1,
          minScale: 0.5
        })
      ]
    };
  }

  function miniRow(label, value, symbol, color) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 6,
      children: [
        icon(symbol, color, 13),
        text(label, {
          size: 11,
          weight: "medium",
          color: "#FFFFFF88"
        }),
        { type: "spacer" },
        text(value || "无", {
          size: 12,
          weight: "semibold",
          color: "#FFFFFF",
          align: "right",
          maxLines: 1,
          minScale: 0.45
        })
      ]
    };
  }

  if (family === "accessoryInline") {
    return {
      type: "widget",
      url: openUrl,
      children: [
        text(`${networkType} · ${networkName}`, {
          size: "caption1",
          weight: "semibold",
          maxLines: 1
        })
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
        icon(mainIcon, mainColor, 24),
        text(hasWifi ? "WiFi" : hasCellular ? "蜂窝" : "未知", {
          size: "caption2",
          weight: "bold",
          align: "center"
        })
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
        text(networkType, {
          size: "caption1",
          weight: "bold",
          color: mainColor
        }),
        text(networkName, {
          size: "caption2",
          weight: "medium",
          color: "#FFFFFFDD",
          maxLines: 1
        }),
        text(ip || iface || "等待刷新", {
          size: "caption2",
          weight: "semibold",
          color: "#FFFFFFAA",
          maxLines: 1
        })
      ]
    };
  }

  if (family === "systemSmall") {
    return root(
      [
        header(),
        bigStatusCard(),
        miniRow("接口", iface || "无", "switch.2", "#BF5AF2"),
        miniRow("刷新", `${counter.count} 次`, "arrow.clockwise.circle.fill", "#34C759")
      ],
      {
        padding: 12,
        gap: 8
      }
    );
  }

  const children = [
    header(),
    bigStatusCard(),
    miniRow("Wi-Fi", ssid || "无", "wifi", "#0A84FF"),
    miniRow("蜂窝", carrier || "无", "antenna.radiowaves.left.and.right", "#34C759"),
    miniRow("制式", radio || "无", "dot.radiowaves.left.and.right", "#34C759"),
    miniRow("IPv4", ip || "无", "globe", "#34C759"),
    miniRow("网关", gateway || "无", "point.3.connected.trianglepath.dotted", "#FF9F0A"),
    miniRow("接口", iface || "无", "switch.2", "#BF5AF2")
  ];

  return root(children, {
    padding: 16,
    gap: 9
  });
}
