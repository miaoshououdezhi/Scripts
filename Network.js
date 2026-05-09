const STORAGE_KEY = "egern_network_widget_state_v1";

export default async function(ctx) {
  const isWidget = typeof ctx.widgetFamily === "string";
  const snapshot = makeSnapshot(ctx);

  const previous = safeGetJSON(ctx, STORAGE_KEY) || {};
  const changed = isChanged(previous, snapshot);

  safeSetJSON(ctx, STORAGE_KEY, {
    ...snapshot,
    changed,
    changeCount: Number(previous.changeCount || 0) + (changed ? 1 : 0)
  });

  // network 脚本：只负责监听网络变化、写入缓存、可选通知
  if (!isWidget) {
    if (changed && ctx.env?.NOTIFY === "true") {
      ctx.notify({
        title: "Network 已变化",
        subtitle: snapshot.modeText,
        body: `${snapshot.displayName}\n${snapshot.ipv4Address || snapshot.interfaceName || "无 IPv4"}`,
        sound: false,
        duration: 3
      });
    }
    return;
  }

  // generic 脚本：返回小组件 DSL
  const state = safeGetJSON(ctx, STORAGE_KEY) || snapshot;
  return renderWidget(ctx, state);
}

function makeSnapshot(ctx) {
  const env = ctx.env || {};
  const d = ctx.device || {};

  const wifi = d.wifi || {};
  const cellular = d.cellular || {};
  const ipv4 = d.ipv4 || {};
  const ipv6 = d.ipv6 || {};

  const ssid = clean(wifi.ssid);
  const bssid = clean(wifi.bssid);
  const carrier = clean(cellular.carrier);
  const radio = clean(cellular.radio);

  const ipv4Address = clean(ipv4.address);
  const ipv4Gateway = clean(ipv4.gateway);
  const ipv4Interface = clean(ipv4.interface);

  const ipv6Address = clean(ipv6.address);
  const ipv6Interface = clean(ipv6.interface);

  const dnsServers = Array.isArray(d.dnsServers)
    ? d.dnsServers.filter(Boolean).map(String)
    : [];

  const interfaceName = ipv4Interface || ipv6Interface;
  const forcedMode = clean(env.NETWORK_MODE || "auto");

  const mode = detectMode({
    forcedMode,
    ssid,
    carrier,
    radio,
    interfaceName,
    ipv4Gateway
  });

  const isWifi = mode === "wifi";
  const isCellular = mode === "cellular";

  const modeText = isWifi ? "Wi-Fi" : isCellular ? "蜂窝数据" : "未知网络";

  const displayName = isWifi
    ? ssid || "Wi-Fi"
    : isCellular
      ? [carrier, radio].filter(Boolean).join(" · ") || "蜂窝数据"
      : "等待网络信息";

  const health = calcHealth({
    mode,
    ipv4Address,
    ipv4Gateway,
    interfaceName,
    dnsServers,
    carrier,
    radio,
    ssid
  });

  return {
    updatedAt: new Date().toISOString(),

    mode,
    modeText,
    displayName,
    health,

    ssid,
    bssid,
    carrier,
    radio,

    ipv4Address,
    ipv4Gateway,
    ipv4Interface,

    ipv6Address,
    ipv6Interface,

    interfaceName,
    dnsServers
  };
}

function detectMode(info) {
  const forcedMode = info.forcedMode;

  if (forcedMode === "wifi") return "wifi";
  if (forcedMode === "cellular") return "cellular";

  const ssid = info.ssid || "";
  const carrier = info.carrier || "";
  const radio = info.radio || "";
  const iface = String(info.interfaceName || "").toLowerCase();

  const hasWifi = Boolean(ssid);
  const hasCellular = Boolean(carrier || radio);

  // 说明：
  // Egern 官方只说明 ipv4.interface / ipv6.interface 是“网络接口”，
  // 没有说明接口命名规则。下面是显示层辅助判断，不是官方保证。
  if ((iface.includes("pdp") || iface.includes("wwan") || iface.includes("cell")) && hasCellular) {
    return "cellular";
  }

  if ((iface === "en0" || iface.includes("wifi")) && hasWifi) {
    return "wifi";
  }

  if (hasWifi && !hasCellular) return "wifi";
  if (hasCellular && !hasWifi) return "cellular";

  // 两者同时存在时，优先 Wi-Fi
  if (hasWifi) return "wifi";
  if (hasCellular) return "cellular";

  return "unknown";
}

function calcHealth(info) {
  let score = 100;
  const warnings = [];

  if (info.mode === "unknown") {
    score -= 50;
    warnings.push("未知网络");
  }

  if (!info.ipv4Address) {
    score -= 30;
    warnings.push("无 IPv4");
  }

  if (info.mode === "wifi" && !info.ipv4Gateway) {
    score -= 15;
    warnings.push("无网关");
  }

  if (!info.interfaceName) {
    score -= 10;
    warnings.push("无接口");
  }

  if (!info.dnsServers || info.dnsServers.length === 0) {
    score -= 10;
    warnings.push("无 DNS");
  }

  if (info.mode === "cellular" && !info.carrier && !info.radio) {
    score -= 10;
    warnings.push("蜂窝信息不足");
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 85) {
    return {
      score,
      label: "健康",
      color: "#34C759",
      icon: "checkmark.seal.fill",
      warnings
    };
  }

  if (score >= 60) {
    return {
      score,
      label: "注意",
      color: "#FF9F0A",
      icon: "exclamationmark.triangle.fill",
      warnings
    };
  }

  return {
    score,
    label: "异常",
    color: "#FF453A",
    icon: "xmark.octagon.fill",
    warnings
  };
}

function renderWidget(ctx, state) {
  const env = ctx.env || {};
  const family = ctx.widgetFamily || "systemSmall";

  const title = env.TITLE || "Network";
  const openUrl = env.OPEN_URL || "https://egernapp.com";

  const refreshSeconds = Math.max(30, Number(env.REFRESH_SECONDS || 60));
  const refreshAfter = new Date(Date.now() + refreshSeconds * 1000).toISOString();

  const isWifi = state.mode === "wifi";
  const isCellular = state.mode === "cellular";

  const accent = isWifi
    ? "#0A84FF"
    : isCellular
      ? "#34C759"
      : "#FF9F0A";

  const modeIcon = isWifi
    ? "wifi"
    : isCellular
      ? "antenna.radiowaves.left.and.right"
      : "questionmark.circle.fill";

  const bgColors = isWifi
    ? ["#07111F", "#102A47", "#0B4F79"]
    : isCellular
      ? ["#06170F", "#123521", "#1D5731"]
      : ["#1E1303", "#3A2505", "#553505"];

  const C = {
    text: "#FFFFFF",
    sub: "#FFFFFFB8",
    dim: "#FFFFFF78",
    card: "#FFFFFF14",
    border: "#FFFFFF26",
    accent
  };

  function text(value, opt = {}) {
    return {
      type: "text",
      text: String(value ?? ""),
      textColor: opt.color || C.text,
      font: {
        size: opt.size || 13,
        weight: opt.weight || "medium",
        ...(opt.family ? { family: opt.family } : {})
      },
      textAlign: opt.align || "left",
      maxLines: opt.maxLines || 1,
      minScale: opt.minScale || 0.55
    };
  }

  function icon(name, color = C.text, size = 16) {
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
      refreshAfter,
      padding: opt.padding || 14,
      gap: opt.gap || 8,
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
        icon(modeIcon, accent, compact ? 26 : 30),
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
            text(state.modeText, {
              size: compact ? 11 : 12,
              weight: "bold",
              color: accent
            })
          ]
        },
        {
          type: "date",
          date: new Date().toISOString(),
          format: "time",
          font: {
            size: compact ? 13 : 14,
            weight: "semibold"
          },
          textColor: C.sub,
          textAlign: "right",
          maxLines: 1
        }
      ]
    };
  }

  function healthCard() {
    return {
      type: "stack",
      direction: "column",
      gap: 7,
      padding: [10, 11, 10, 11],
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: accent + "66",
      shadowColor: "#00000066",
      shadowRadius: 8,
      shadowOffset: { x: 0, y: 3 },
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 7,
          children: [
            icon(state.health.icon, state.health.color, 16),
            text(state.health.label, {
              size: 13,
              weight: "bold",
              color: state.health.color
            }),
            { type: "spacer" },
            text(`${state.health.score}%`, {
              size: 13,
              weight: "bold",
              color: state.health.color,
              align: "right",
              family: "Menlo"
            })
          ]
        },
        text(state.displayName || "无网络名称", {
          size: 17,
          weight: "bold",
          color: C.text,
          maxLines: 1,
          minScale: 0.45
        }),
        text(state.ipv4Address || state.interfaceName || "等待网络信息", {
          size: 12,
          weight: "semibold",
          color: C.sub,
          maxLines: 1,
          minScale: 0.5
        })
      ]
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
          color: C.dim,
          weight: "medium"
        }),
        { type: "spacer" },
        text(value || "无", {
          size: 12,
          color: C.text,
          weight: "semibold",
          align: "right",
          maxLines: 1,
          minScale: 0.45
        })
      ]
    };
  }

  function smallWidget() {
    return root(
      [
        header(true),
        healthCard(),
        row("接口", state.interfaceName, "switch.2", "#BF5AF2"),
        row("更新", state.changed ? "刚变化" : "已监听", "waveform.path.ecg", state.health.color)
      ],
      {
        padding: 12,
        gap: 8
      }
    );
  }

  function mediumWidget() {
    const dnsText = Array.isArray(state.dnsServers) && state.dnsServers.length
      ? state.dnsServers.join(", ")
      : "无";

    return root(
      [
        header(false),
        healthCard(),
        row("Wi-Fi", state.ssid, "wifi", "#0A84FF"),
        row("蜂窝", [state.carrier, state.radio].filter(Boolean).join(" · "), "antenna.radiowaves.left.and.right", "#34C759"),
        row("IPv4", state.ipv4Address, "globe", "#34C759"),
        row("网关", state.ipv4Gateway, "point.3.connected.trianglepath.dotted", "#FF9F0A"),
        row("接口", state.interfaceName, "switch.2", "#BF5AF2"),
        row("DNS", dnsText, "server.rack", "#64D2FF")
      ],
      {
        padding: 15,
        gap: 8
      }
    );
  }

  function largeWidget() {
    const dnsText = Array.isArray(state.dnsServers) && state.dnsServers.length
      ? state.dnsServers.join(", ")
      : "无";

    const warnings = state.health.warnings && state.health.warnings.length
      ? state.health.warnings.join(" / ")
      : "未发现明显问题";

    return root(
      [
        header(false),
        healthCard(),
        row("当前类型", state.modeText, modeIcon, accent),
        row("Wi-Fi 名称", state.ssid, "wifi", "#0A84FF"),
        row("Wi-Fi BSSID", state.bssid, "dot.radiowaves.left.and.right", "#0A84FF"),
        row("蜂窝运营商", state.carrier, "antenna.radiowaves.left.and.right", "#34C759"),
        row("蜂窝制式", state.radio, "cellularbars", "#34C759"),
        row("IPv4 地址", state.ipv4Address, "globe", "#34C759"),
        row("IPv4 网关", state.ipv4Gateway, "point.3.connected.trianglepath.dotted", "#FF9F0A"),
        row("IPv4 接口", state.ipv4Interface, "switch.2", "#BF5AF2"),
        row("IPv6 地址", state.ipv6Address, "network", "#64D2FF"),
        row("DNS", dnsText, "server.rack", "#64D2FF"),
        row("状态说明", warnings, "stethoscope", state.health.color),
        {
          type: "date",
          date: state.updatedAt || new Date().toISOString(),
          format: "relative",
          font: {
            size: 11,
            weight: "medium"
          },
          textColor: C.dim,
          maxLines: 1
        }
      ],
      {
        padding: 16,
        gap: 8
      }
    );
  }

  if (family === "accessoryInline") {
    return {
      type: "widget",
      url: openUrl,
      children: [
        text(`${state.modeText} · ${state.displayName} · ${state.health.label}`, {
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
        icon(modeIcon, accent, 24),
        text(state.health.label, {
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
        text(`${state.modeText} · ${state.health.label}`, {
          size: "caption1",
          weight: "bold",
          color: state.health.color
        }),
        text(state.displayName, {
          size: "caption2",
          weight: "medium",
          color: C.text,
          maxLines: 1
        }),
        text(state.ipv4Address || state.interfaceName || "等待网络信息", {
          size: "caption2",
          weight: "semibold",
          color: C.sub,
          maxLines: 1
        })
      ]
    };
  }

  if (family === "systemSmall") return smallWidget();
  if (family === "systemMedium") return mediumWidget();

  return largeWidget();
}

function isChanged(previous, current) {
  return (
    previous.mode !== current.mode ||
    previous.displayName !== current.displayName ||
    previous.ipv4Address !== current.ipv4Address ||
    previous.interfaceName !== current.interfaceName ||
    previous.ipv4Gateway !== current.ipv4Gateway
  );
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function safeGetJSON(ctx, key) {
  try {
    return ctx.storage.getJSON(key);
  } catch (_) {
    return null;
  }
}

function safeSetJSON(ctx, key, value) {
  try {
    ctx.storage.setJSON(key, value);
  } catch (_) {}
}
