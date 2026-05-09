const STORAGE_KEY = "egern_realtime_network_state_v1";

export default async function(ctx) {
  const isWidget = typeof ctx.widgetFamily === "string";

  if (!isWidget) {
    await saveNetworkSnapshot(ctx, "network");
    return;
  }

  await saveNetworkSnapshot(ctx, "widget");
  return buildWidget(ctx);
}

async function saveNetworkSnapshot(ctx, source) {
  const now = new Date();
  const d = ctx.device || {};
  const wifi = d.wifi || {};
  const cellular = d.cellular || {};
  const ipv4 = d.ipv4 || {};
  const ipv6 = d.ipv6 || {};

  const ssid = wifi.ssid || "";
  const bssid = wifi.bssid || "";
  const carrier = cellular.carrier || "";
  const radio = cellular.radio || "";
  const ipv4Address = ipv4.address || "";
  const ipv4Gateway = ipv4.gateway || "";
  const ipv4Interface = ipv4.interface || "";
  const ipv6Address = ipv6.address || "";
  const ipv6Interface = ipv6.interface || "";
  const dnsServers = Array.isArray(d.dnsServers) ? d.dnsServers : [];

  const hasWifi = !!ssid;
  const hasCellular = !!carrier || !!radio;

  let type = "unknown";
  if (hasWifi) type = "wifi";
  else if (hasCellular) type = "cellular";

  const previous = ctx.storage.getJSON(STORAGE_KEY) || {};

  const changed =
    previous.type !== type ||
    previous.ssid !== ssid ||
    previous.carrier !== carrier ||
    previous.radio !== radio ||
    previous.ipv4Address !== ipv4Address ||
    previous.ipv4Interface !== ipv4Interface;

  const state = {
    type,
    source,
    changed,
    updatedAt: now.toISOString(),
    updateCount: Number(previous.updateCount || 0) + 1,

    ssid,
    bssid,
    carrier,
    radio,

    ipv4Address,
    ipv4Gateway,
    ipv4Interface,

    ipv6Address,
    ipv6Interface,
    dnsServers
  };

  ctx.storage.setJSON(STORAGE_KEY, state);

  if (source === "network" && ctx.env?.NOTIFY === "true") {
    const title =
      type === "wifi"
        ? "网络已切换：Wi-Fi"
        : type === "cellular"
          ? "网络已切换：蜂窝数据"
          : "网络已变化";

    const body =
      type === "wifi"
        ? `${ssid || "未知 Wi-Fi"}\n${ipv4Address || "无 IPv4"}`
        : type === "cellular"
          ? `${[carrier, radio].filter(Boolean).join(" · ") || "蜂窝数据"}\n${ipv4Address || "无 IPv4"}`
          : `${ipv4Address || ipv4Interface || "未获取网络信息"}`;

    ctx.notify({
      title,
      body,
      sound: false,
      duration: 3
    });
  }
}

function buildWidget(ctx) {
  const env = ctx.env || {};
  const title = env.TITLE || "Egern 网络";
  const openUrl = env.OPEN_URL || "https://egernapp.com";
  const family = ctx.widgetFamily || "systemSmall";
  const now = new Date();

  const state = ctx.storage.getJSON(STORAGE_KEY) || {};
  const type = state.type || "unknown";

  const isWifi = type === "wifi";
  const isCellular = type === "cellular";

  const modeText = isWifi ? "Wi-Fi" : isCellular ? "蜂窝数据" : "未知网络";
  const mainName = isWifi
    ? state.ssid || "未获取 Wi-Fi 名称"
    : isCellular
      ? [state.carrier, state.radio].filter(Boolean).join(" · ") || "蜂窝数据"
      : "等待网络变化";

  const ipText = state.ipv4Address || "无 IPv4";
  const ifaceText = state.ipv4Interface || state.ipv6Interface || "无接口";
  const gatewayText = state.ipv4Gateway || "无网关";

  const accent = isWifi ? "#0A84FF" : isCellular ? "#34C759" : "#FF9F0A";
  const iconName = isWifi
    ? "wifi"
    : isCellular
      ? "antenna.radiowaves.left.and.right"
      : "questionmark.circle";

  const bgColors = isWifi
    ? ["#08111F", "#102A47", "#123E66"]
    : isCellular
      ? ["#06170F", "#11351F", "#1B5730"]
      : ["#1E1303", "#3A2505", "#553505"];

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

  function row(label, value, symbol, color) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 6,
      children: [
        icon(symbol, color, 13),
        text(label, {
          size: 11,
          color: "#FFFFFF88",
          weight: "medium"
        }),
        { type: "spacer" },
        text(value || "无", {
          size: 12,
          color: "#FFFFFF",
          weight: "semibold",
          align: "right",
          maxLines: 1,
          minScale: 0.45
        })
      ]
    };
  }

  function root(children, padding = 12, gap = 8) {
    return {
      type: "widget",
      url: openUrl,

      // 提示小组件尽快刷新；是否完全按这个时间执行由系统调度决定，文档未提及强制刷新能力
      refreshAfter: new Date(now.getTime() + 60 * 1000).toISOString(),

      padding,
      gap,
      backgroundGradient: {
        type: "linear",
        colors: bgColors,
        stops: [0, 0.58, 1],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      },
      children
    };
  }

  function header(compact = false) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 8,
      children: [
        icon(iconName, accent, compact ? 25 : 28),
        {
          type: "stack",
          direction: "column",
          gap: 1,
          flex: 1,
          children: [
            text(title, {
              size: compact ? 18 : 21,
              weight: "bold"
            }),
            text(modeText, {
              size: compact ? 11 : 12,
              weight: "bold",
              color: accent
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
          maxLines: 1
        }
      ]
    };
  }

  function mainCard() {
    return {
      type: "stack",
      direction: "column",
      gap: 6,
      padding: [10, 11],
      backgroundColor: "#FFFFFF13",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: accent + "66",
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
            icon(iconName, accent, 15),
            text(modeText, {
              size: 12,
              weight: "semibold",
              color: "#FFFFFFAA"
            }),
            { type: "spacer" },
            text(state.source === "network" ? "已监听" : "小组件", {
              size: 12,
              weight: "bold",
              color: accent,
              align: "right"
            })
          ]
        },
        text(mainName, {
          size: 17,
          weight: "bold",
          color: "#FFFFFF",
          maxLines: 1,
          minScale: 0.45
        }),
        text(ipText, {
          size: 12,
          weight: "semibold",
          color: "#FFFFFFCC",
          maxLines: 1,
          minScale: 0.5
        })
      ]
    };
  }

  if (family === "accessoryInline") {
    return {
      type: "widget",
      url: openUrl,
      children: [
        text(`${modeText} · ${mainName}`, {
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
        icon(iconName, accent, 24),
        text(isWifi ? "WiFi" : isCellular ? "蜂窝" : "未知", {
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
        text(modeText, {
          size: "caption1",
          weight: "bold",
          color: accent
        }),
        text(mainName, {
          size: "caption2",
          weight: "medium",
          color: "#FFFFFFDD",
          maxLines: 1
        }),
        text(ipText, {
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
        header(true),
        mainCard(),
        row("接口", ifaceText, "switch.2", "#BF5AF2"),
        row("更新", `${state.updateCount || 0} 次`, "arrow.clockwise.circle.fill", "#34C759")
      ],
      12,
      8
    );
  }

  const dnsText = Array.isArray(state.dnsServers) && state.dnsServers.length
    ? state.dnsServers.join(", ")
    : "无 DNS";

  return root(
    [
      header(false),
      mainCard(),
      row("Wi-Fi", state.ssid || "无", "wifi", "#0A84FF"),
      row("蜂窝", state.carrier || "无", "antenna.radiowaves.left.and.right", "#34C759"),
      row("制式", state.radio || "无", "dot.radiowaves.left.and.right", "#34C759"),
      row("IPv4", ipText, "globe", "#34C759"),
      row("网关", gatewayText, "point.3.connected.trianglepath.dotted", "#FF9F0A"),
      row("接口", ifaceText, "switch.2", "#BF5AF2"),
      row("DNS", dnsText, "server.rack", "#BF5AF2"),
      {
        type: "date",
        date: state.updatedAt || now.toISOString(),
        format: "relative",
        font: {
          size: 11,
          weight: "medium"
        },
        textColor: "#FFFFFF88",
        maxLines: 1
      }
    ],
    16,
    9
  );
}
