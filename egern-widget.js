scriptings:
  - generic:
      name: "egern-widget"        # 通用脚本名称
      script_url: "https://raw.githubusercontent.com/你的用户名/egern-scripts/main/egern-all-in-one-widget.js"
      timeout: 20
      update_interval: 86400
      env:
        TITLE: "Egern"
        OPEN_URL: "https://egernapp.com"
        API_URL: ""
        LOOKUP_IP: "8.8.8.8"
        REFRESH_MINUTES: "30"

widgets:
  - name: "Egern 总览"
    script_name: "egern-all-in-one-widget"
    env:
      MODE: "overview"

  - name: "Egern 网络信息"
    script_name: "egern-all-in-one-widget"
    env:
      MODE: "network"

  - name: "Egern 接口状态"
    script_name: "egern-all-in-one-widget"
    env:
      MODE: "api"

  - name: "Egern DSL 展示"
    script_name: "egern-all-in-one-widget"
    env:
      MODE: "dsl"
