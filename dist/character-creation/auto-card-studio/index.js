// A.U.T.O 角色卡创作台 v0.5.17 · 酒馆助手脚本核心包（内置自动更新器）

// 酒馆助手脚本运行在隐藏 iframe 中；界面需要挂载到 SillyTavern 主页面。
const hostWindow = window.parent;
const document = hostWindow.document;
const localStorage = hostWindow.localStorage;
const Option = hostWindow.Option;
const STUDIO_HTML = "<div id=\"auto-card-studio\" class=\"acs-shell\" aria-hidden=\"true\">\n  <div class=\"acs-backdrop\" data-acs-close></div>\n\n  <section class=\"acs-window\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"acs-title\">\n    <header class=\"acs-topbar\">\n      <div class=\"acs-brand\">\n        <span class=\"acs-brand-mark\" aria-hidden=\"true\">\n          <span class=\"acs-orbit\"></span>\n          <span class=\"acs-core\"></span>\n        </span>\n        <div>\n          <p class=\"acs-eyebrow\">L3 / CHARACTER FORGE</p>\n          <h1 id=\"acs-title\">A.U.T.O 角色卡创作台</h1>\n        </div>\n        <button id=\"acs-tour-launch\" class=\"acs-tour-launch\" type=\"button\" title=\"打开新手引导\">\n          <i class=\"fa-solid fa-compass\" aria-hidden=\"true\"></i>\n          <span>新手引导</span>\n        </button>\n      </div>\n\n      <div class=\"acs-topbar-actions\">\n        <div id=\"acs-dependency-status\" class=\"acs-dependency\" aria-live=\"polite\">\n          <span class=\"acs-status-dot\"></span>\n          <span>正在检查创作环境</span>\n        </div>\n        <div class=\"acs-update-control\">\n          <button id=\"acs-check-update\" class=\"acs-icon-button acs-update-button\" type=\"button\" title=\"检查更新（当前 v0.5.17）\" aria-label=\"检查更新\">\n            <i class=\"fa-solid fa-rotate\" aria-hidden=\"true\"></i>\n          </button>\n          <span id=\"acs-update-feedback\" class=\"acs-update-feedback\" role=\"status\" aria-live=\"polite\" hidden></span>\n        </div>\n        <button id=\"acs-save-project\" class=\"acs-icon-button\" type=\"button\" title=\"导出项目\">\n          <i class=\"fa-solid fa-box-archive\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">导出项目</span>\n        </button>\n        <button id=\"acs-inspector-toggle\" class=\"acs-icon-button\" type=\"button\" title=\"打开项目检查器\" aria-expanded=\"false\">\n          <i class=\"fa-solid fa-table-columns\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">打开项目检查器</span>\n        </button>\n        <button class=\"acs-icon-button\" type=\"button\" data-acs-close title=\"关闭创作台\">\n          <i class=\"fa-solid fa-xmark\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">关闭创作台</span>\n        </button>\n      </div>\n    </header>\n\n    <div class=\"acs-workspace\">\n      <aside class=\"acs-rail\" aria-label=\"创作流程\">\n        <div class=\"acs-project-identity\">\n          <div class=\"acs-project-title-field\">\n            <label for=\"acs-project-name\">当前项目</label>\n            <span class=\"acs-project-name-control\">\n              <span class=\"acs-project-title-icon\" aria-hidden=\"true\">\n                <i class=\"fa-solid fa-folder-open\"></i>\n              </span>\n              <input id=\"acs-project-name\" type=\"text\" maxlength=\"80\" placeholder=\"未命名世界\">\n              <i class=\"fa-solid fa-pen\" aria-hidden=\"true\"></i>\n            </span>\n          </div>\n          <div class=\"acs-progress-row\">\n            <span id=\"acs-progress-copy\">0 / 30</span>\n            <span id=\"acs-progress-percent\">0%</span>\n          </div>\n          <div class=\"acs-progress-track\" aria-hidden=\"true\">\n            <span id=\"acs-progress-bar\"></span>\n          </div>\n        </div>\n\n        <nav id=\"acs-step-rail\" class=\"acs-step-rail\" aria-label=\"A.U.T.O 创作步骤\"></nav>\n\n        <button id=\"acs-new-project\" class=\"acs-quiet-action\" type=\"button\">\n          <i class=\"fa-solid fa-plus\" aria-hidden=\"true\"></i>\n          新建项目\n        </button>\n      </aside>\n\n      <main class=\"acs-stage\">\n        <div class=\"acs-stage-heading\">\n          <div>\n            <p id=\"acs-step-kicker\" class=\"acs-eyebrow\">PHASE 01</p>\n            <h2 id=\"acs-step-title\">交互范式和美学纲领</h2>\n            <p id=\"acs-step-goal\" class=\"acs-step-goal\"></p>\n          </div>\n          <div class=\"acs-stage-heading-actions\">\n            <span id=\"acs-step-state\" class=\"acs-state-chip\">未开始</span>\n            <button id=\"acs-toggle-overview\" class=\"acs-overview-toggle\" type=\"button\" aria-expanded=\"true\" aria-controls=\"acs-brief-panel\" title=\"收起创作概览\">\n              <i class=\"fa-solid fa-chevron-up\" aria-hidden=\"true\"></i>\n              <span>收起概览</span>\n            </button>\n          </div>\n        </div>\n\n        <section id=\"acs-brief-panel\" class=\"acs-brief-panel\">\n          <div class=\"acs-section-label\">\n            <span>创作母题</span>\n            <span>贯穿全部 30 个阶段</span>\n          </div>\n          <textarea id=\"acs-project-brief\" rows=\"5\" placeholder=\"描述你想创作的世界、主控角色、核心体验、边界与参考作品。无需一次写完，后续可以持续补充。\"></textarea>\n        </section>\n\n        <section class=\"acs-conversation\" aria-label=\"本阶段对话\">\n          <div id=\"acs-empty-turns\" class=\"acs-empty-turns\" aria-live=\"polite\">\n            <span class=\"acs-empty-glyph\">◎</span>\n            <span id=\"acs-empty-kicker\" class=\"acs-empty-kicker\">STATION 01 · 创作航标</span>\n            <h3 id=\"acs-empty-title\">先定下这段体验的方向</h3>\n            <p id=\"acs-empty-description\">不用一次写完整套设定。先告诉 A.U.T.O 玩家要体验什么，以及这段创作必须遵守的边界。</p>\n            <div class=\"acs-guide-panel\">\n              <span>可以从这些问题开始</span>\n              <ol id=\"acs-empty-prompts\" class=\"acs-guide-prompts\"></ol>\n            </div>\n          </div>\n          <div id=\"acs-turns\" class=\"acs-turns\" aria-live=\"polite\"></div>\n        </section>\n\n        <section class=\"acs-composer\" aria-label=\"向 A.U.T.O 补充说明\">\n          <label id=\"acs-user-input-label\" for=\"acs-user-input\">本轮补充 · 交互范式和美学纲领</label>\n          <textarea id=\"acs-user-input\" rows=\"3\" placeholder=\"可以留空直接生成；也可以指出偏好、修改方向或要求 A.U.T.O 接续未完成内容。\"></textarea>\n          <div class=\"acs-composer-actions\">\n            <p id=\"acs-generation-hint\">将使用配套预设与当前步骤提示词</p>\n            <div>\n              <button id=\"acs-stop-generation\" class=\"acs-button acs-button-danger\" type=\"button\" hidden>\n                <i class=\"fa-solid fa-stop\" aria-hidden=\"true\"></i>\n                停止\n              </button>\n              <button id=\"acs-generate\" class=\"acs-button acs-button-primary\" type=\"button\">\n                <i class=\"fa-solid fa-wand-magic-sparkles\" aria-hidden=\"true\"></i>\n                生成阶段草案\n              </button>\n              <button id=\"acs-accept-step\" class=\"acs-button acs-button-confirm\" type=\"button\" disabled>\n                确认并前往下一站\n                <i class=\"fa-solid fa-arrow-right\" aria-hidden=\"true\"></i>\n              </button>\n            </div>\n          </div>\n        </section>\n      </main>\n\n      <aside class=\"acs-inspector\" aria-label=\"项目检查器\">\n        <div class=\"acs-tabs\" role=\"tablist\" aria-label=\"检查器标签\">\n          <button class=\"acs-tab is-active\" type=\"button\" role=\"tab\" aria-selected=\"true\" data-acs-tab=\"structure\">产物</button>\n          <button class=\"acs-tab\" type=\"button\" role=\"tab\" aria-selected=\"false\" data-acs-tab=\"settings\">设置</button>\n          <button class=\"acs-tab\" type=\"button\" role=\"tab\" aria-selected=\"false\" data-acs-tab=\"publish\">发布</button>\n        </div>\n\n        <div class=\"acs-tab-panel is-active\" data-acs-panel=\"structure\">\n          <div class=\"acs-inspector-intro\">\n            <div>\n              <span>结构解析</span>\n              <strong id=\"acs-block-count\">0 个区块</strong>\n            </div>\n            <button id=\"acs-expand-artifacts\" class=\"acs-inspector-action\" type=\"button\" title=\"放大产物工作区\" aria-pressed=\"false\">\n              <i class=\"fa-solid fa-expand\" aria-hidden=\"true\"></i>\n              <span>放大</span>\n            </button>\n          </div>\n          <p class=\"acs-inspector-help\">仅显示 A.U.T.O 预设规定的最终产物；同名产物默认显示最新版，可切换历史并恢复。</p>\n          <div id=\"acs-artifact-list\" class=\"acs-artifact-list\"></div>\n        </div>\n\n        <div class=\"acs-tab-panel\" data-acs-panel=\"settings\" hidden>\n          <section class=\"acs-connection-section\" aria-labelledby=\"acs-connection-title\">\n            <div class=\"acs-settings-heading\">\n              <div>\n                <span id=\"acs-connection-title\">模型连接</span>\n                <small>决定创作台从哪里调用 AI</small>\n              </div>\n              <strong id=\"acs-connection-summary\">跟随 SillyTavern</strong>\n            </div>\n\n            <div class=\"acs-connection-options\" role=\"radiogroup\" aria-label=\"模型连接方式\">\n              <label class=\"acs-connection-choice\">\n                <input type=\"radio\" name=\"acs-connection-mode\" value=\"current\" checked>\n                <span>\n                  <strong>使用当前连接</strong>\n                  <small>跟随 SillyTavern 当前选择的接口和模型</small>\n                </span>\n              </label>\n              <label class=\"acs-connection-choice\">\n                <input type=\"radio\" name=\"acs-connection-mode\" value=\"custom\">\n                <span>\n                  <strong>单独配置</strong>\n                  <small>只让这个创作台使用另一套接口和模型</small>\n                </span>\n              </label>\n            </div>\n\n            <div id=\"acs-custom-connection\" class=\"acs-custom-connection\" hidden>\n              <div class=\"acs-field-stack\">\n                <label>\n                  <span>接口类型</span>\n                  <select id=\"acs-custom-source\">\n                    <option value=\"openai\">OpenAI / OpenAI 兼容接口</option>\n                    <option value=\"openrouter\">OpenRouter</option>\n                    <option value=\"claude\">Anthropic Claude</option>\n                    <option value=\"makersuite\">Google AI Studio / Gemini</option>\n                    <option value=\"deepseek\">DeepSeek</option>\n                    <option value=\"mistralai\">Mistral AI</option>\n                    <option value=\"groq\">Groq</option>\n                    <option value=\"xai\">xAI</option>\n                    <option value=\"custom\">SillyTavern Custom</option>\n                  </select>\n                </label>\n                <label>\n                  <span>接口地址</span>\n                  <input id=\"acs-custom-api-url\" type=\"url\" inputmode=\"url\" spellcheck=\"false\" placeholder=\"例如：https://api.example.com/v1\">\n                </label>\n                <label>\n                  <span>API 密钥（可以留空）</span>\n                  <input id=\"acs-custom-api-key\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"仅在当前页面中保留\">\n                </label>\n                <div class=\"acs-model-field\">\n                  <label for=\"acs-custom-model\">模型名称</label>\n                  <div class=\"acs-model-picker\">\n                    <input id=\"acs-custom-model\" type=\"text\" list=\"acs-custom-model-options\" spellcheck=\"false\" placeholder=\"例如：gpt-4.1-mini\">\n                    <button id=\"acs-fetch-models\" class=\"acs-button acs-button-compact\" type=\"button\">\n                      <i class=\"fa-solid fa-rotate\" aria-hidden=\"true\"></i>\n                      获取模型\n                    </button>\n                  </div>\n                  <datalist id=\"acs-custom-model-options\"></datalist>\n                </div>\n              </div>\n              <p class=\"acs-security-note\">\n                <i class=\"fa-solid fa-shield-halved\" aria-hidden=\"true\"></i>\n                密钥不会写入项目、导出文件或长期存储；刷新页面后需要重新填写。\n              </p>\n            </div>\n          </section>\n\n          <p class=\"acs-settings-section-label\">创作流程</p>\n          <div class=\"acs-field-stack\">\n            <div id=\"acs-preset-lock\" class=\"acs-fixed-resource\" aria-live=\"polite\">\n              <div class=\"acs-fixed-resource-icon\" aria-hidden=\"true\">\n                <i class=\"fa-solid fa-lock\"></i>\n              </div>\n              <div class=\"acs-fixed-resource-copy\">\n                <span>固定预设</span>\n                <strong id=\"acs-preset-name\">正在查找 A.U.T.O v2.0</strong>\n                <small>创作台始终读取这份预设，不跟随主界面当前选择。</small>\n              </div>\n              <span class=\"acs-fixed-resource-badge\">已锁定</span>\n            </div>\n            <label>\n              <span>世界书模板</span>\n              <select id=\"acs-worldbook-select\"></select>\n            </label>\n            <div class=\"acs-field-grid\">\n              <label>\n                <span>助手称呼</span>\n                <input id=\"acs-ai-role\" type=\"text\" value=\"A.U.T.O.\">\n              </label>\n              <label>\n                <span>创作者</span>\n                <input id=\"acs-creator-role\" type=\"text\" value=\"创作者\">\n              </label>\n              <label>\n                <span>目标字数</span>\n                <input id=\"acs-word-count\" type=\"text\" value=\"3000\">\n              </label>\n              <label>\n                <span>输出语言</span>\n                <input id=\"acs-language\" type=\"text\" value=\"中文\">\n              </label>\n            </div>\n            <label>\n              <span>叙事人称</span>\n              <select id=\"acs-person\">\n                <option value=\"第三人称\">第三人称</option>\n                <option value=\"第一人称\">第一人称</option>\n                <option value=\"第二人称\">第二人称</option>\n              </select>\n            </label>\n          </div>\n        </div>\n\n        <div class=\"acs-tab-panel\" data-acs-panel=\"publish\" hidden>\n          <div class=\"acs-publish-copy\">\n            <p class=\"acs-eyebrow\">HANDOFF</p>\n            <h3>交付到 SillyTavern</h3>\n            <p>创建一份项目世界书，并把它绑定到角色卡。若名称已存在，会在最终确认后更新。</p>\n          </div>\n          <div class=\"acs-field-stack\">\n            <label>\n              <span>角色卡名称</span>\n              <input id=\"acs-character-name\" type=\"text\" placeholder=\"例如：雾港来客\">\n            </label>\n            <label>\n              <span>世界书名称</span>\n              <input id=\"acs-output-worldbook\" type=\"text\" placeholder=\"自动跟随项目名称\">\n            </label>\n          </div>\n          <button id=\"acs-publish\" class=\"acs-button acs-button-publish\" type=\"button\">\n            <i class=\"fa-solid fa-feather-pointed\" aria-hidden=\"true\"></i>\n            创建角色卡与世界书\n          </button>\n          <button id=\"acs-download-dossier\" class=\"acs-button acs-button-secondary\" type=\"button\">\n            <i class=\"fa-solid fa-file-arrow-down\" aria-hidden=\"true\"></i>\n            下载创作档案\n          </button>\n          <p id=\"acs-publish-note\" class=\"acs-publish-note\">建议至少完成 Step 1、Step 5 与 Step 30 后发布。</p>\n        </div>\n      </aside>\n    </div>\n  </section>\n\n  <div id=\"acs-tour-overlay\" class=\"acs-tour-overlay\" aria-hidden=\"true\" hidden>\n    <div id=\"acs-tour-spotlight\" class=\"acs-tour-spotlight\" aria-hidden=\"true\"></div>\n    <section id=\"acs-tour-card\" class=\"acs-tour-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"acs-tour-title\">\n      <header class=\"acs-tour-card-head\">\n        <span id=\"acs-tour-progress\" class=\"acs-tour-progress\">1 / 6</span>\n        <button id=\"acs-tour-skip\" class=\"acs-tour-skip\" type=\"button\">跳过引导</button>\n      </header>\n      <p id=\"acs-tour-eyebrow\" class=\"acs-tour-eyebrow\">PROJECT 01</p>\n      <h2 id=\"acs-tour-title\">从一个项目开始</h2>\n      <p id=\"acs-tour-description\" class=\"acs-tour-description\"></p>\n      <div id=\"acs-tour-dots\" class=\"acs-tour-dots\" aria-hidden=\"true\"></div>\n      <footer class=\"acs-tour-actions\">\n        <button id=\"acs-tour-previous\" class=\"acs-tour-nav acs-tour-previous\" type=\"button\">\n          <i class=\"fa-solid fa-arrow-left\" aria-hidden=\"true\"></i>\n          上一步\n        </button>\n        <button id=\"acs-tour-next\" class=\"acs-tour-nav acs-tour-next\" type=\"button\">\n          <span>下一步</span>\n          <i class=\"fa-solid fa-arrow-right\" aria-hidden=\"true\"></i>\n        </button>\n      </footer>\n    </section>\n  </div>\n</div>\n\n<input id=\"acs-import-project\" type=\"file\" accept=\"application/json,.json\" hidden>\n";
const STUDIO_CSS = ":root {\n  --acs-void: #1e1c19;\n  --acs-ink: #2b2925;\n  --acs-panel: #302e29;\n  --acs-panel-raised: #38352f;\n  --acs-line: #59534b;\n  --acs-line-soft: rgba(232, 224, 212, 0.12);\n  --acs-text: #e8e2d8;\n  --acs-text-soft: #d0c8bd;\n  --acs-muted: #aba297;\n  --acs-cyan: #d97757;\n  --acs-cyan-soft: rgba(217, 119, 87, 0.14);\n  --acs-violet: #b7a3cf;\n  --acs-gold: #d3ad72;\n  --acs-green: #93bd91;\n  --acs-red: #d9847f;\n  --acs-shadow: 0 28px 80px rgba(10, 9, 8, 0.42);\n  --acs-display: \"Iowan Old Style\", \"Noto Serif SC\", \"Songti SC\", Georgia, serif;\n  --acs-body: Inter, \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif;\n  --acs-mono: \"JetBrains Mono\", \"Cascadia Code\", Consolas, monospace;\n}\n\n#auto-card-studio,\n#auto-card-studio * {\n  box-sizing: border-box;\n}\n\n.acs-shell {\n  position: fixed;\n  inset: 0;\n  z-index: 10001;\n  display: none;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  isolation: isolate;\n}\n\n.acs-shell.is-open {\n  display: block;\n}\n\n.acs-shell [hidden] {\n  display: none !important;\n}\n\n.acs-backdrop {\n  position: absolute;\n  inset: 0;\n  background: rgba(17, 15, 13, 0.72);\n  backdrop-filter: blur(14px);\n}\n\n.acs-window {\n  position: absolute;\n  inset: 2.2vh 1.6vw;\n  display: grid;\n  grid-template-rows: 72px minmax(0, 1fr);\n  overflow: hidden;\n  border: 1px solid rgba(217, 202, 182, 0.22);\n  border-radius: 22px;\n  background:\n    radial-gradient(circle at 88% 8%, rgba(183, 163, 207, 0.08), transparent 27%),\n    radial-gradient(circle at 10% 84%, rgba(217, 119, 87, 0.07), transparent 25%),\n    var(--acs-ink);\n  box-shadow: var(--acs-shadow);\n}\n\n.acs-window::before {\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  background-image:\n    linear-gradient(rgba(232, 224, 212, 0.025) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(232, 224, 212, 0.025) 1px, transparent 1px);\n  background-size: 42px 42px;\n  content: \"\";\n  mask-image: linear-gradient(to bottom, black, transparent 72%);\n  pointer-events: none;\n}\n\n.acs-topbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-width: 0;\n  padding: 0 22px 0 26px;\n  border-bottom: 1px solid var(--acs-line-soft);\n  background: rgba(43, 41, 37, 0.96);\n  box-shadow: 0 5px 22px rgba(10, 9, 8, 0.14);\n}\n\n.acs-brand,\n.acs-topbar-actions,\n.acs-progress-row,\n.acs-stage-heading,\n.acs-composer-actions,\n.acs-composer-actions > div,\n.acs-inspector-intro,\n.acs-artifact-head {\n  display: flex;\n  align-items: center;\n}\n\n.acs-brand {\n  min-width: 0;\n  gap: 15px;\n}\n\n.acs-brand h1 {\n  margin: 1px 0 0;\n  overflow: hidden;\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: clamp(20px, 2vw, 27px);\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  line-height: 1.05;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-tour-launch {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  min-height: 31px;\n  padding: 6px 11px;\n  border: 1px solid rgba(211, 173, 114, 0.3);\n  border-radius: 999px;\n  background: rgba(211, 173, 114, 0.07);\n  color: #d6bd95;\n  cursor: pointer;\n  font-size: 10px;\n  font-weight: 650;\n  white-space: nowrap;\n  transition: border-color 150ms ease, background 150ms ease, color 150ms ease, transform 150ms ease;\n}\n\n.acs-tour-launch:hover {\n  border-color: rgba(211, 173, 114, 0.58);\n  background: rgba(211, 173, 114, 0.13);\n  color: #ecd4ae;\n  transform: translateY(-1px);\n}\n\n.acs-tour-launch i {\n  color: var(--acs-gold);\n  font-size: 11px;\n}\n\n.acs-tour-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 10060;\n  overflow: hidden;\n  pointer-events: auto;\n}\n\n.acs-tour-spotlight {\n  position: fixed;\n  z-index: 0;\n  border: 1px solid rgba(229, 174, 111, 0.9);\n  border-radius: 13px;\n  background: transparent;\n  box-shadow: 0 0 0 9999px rgba(18, 16, 13, 0.76), 0 0 0 5px rgba(217, 119, 87, 0.12), 0 0 28px rgba(229, 174, 111, 0.28);\n  pointer-events: none;\n  transition: left 340ms cubic-bezier(0.22, 1, 0.36, 1), top 340ms cubic-bezier(0.22, 1, 0.36, 1), width 340ms cubic-bezier(0.22, 1, 0.36, 1), height 340ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n\n.acs-tour-spotlight::after {\n  position: absolute;\n  inset: -6px;\n  border: 1px solid rgba(229, 174, 111, 0.38);\n  border-radius: 17px;\n  content: \"\";\n  animation: acs-tour-breathe 1.8s ease-in-out infinite;\n}\n\n.acs-tour-card {\n  position: fixed;\n  z-index: 1;\n  width: min(344px, calc(100vw - 32px));\n  padding: 18px;\n  border: 1px solid rgba(217, 176, 124, 0.34);\n  border-radius: 15px;\n  background: linear-gradient(145deg, #3b3730, #302d28 72%);\n  box-shadow: 0 22px 60px rgba(8, 7, 6, 0.48);\n  color: var(--acs-text);\n  transition: left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n\n.acs-tour-card.is-refreshing {\n  animation: acs-tour-card-in 260ms ease-out;\n}\n\n.acs-tour-card-head,\n.acs-tour-actions {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.acs-tour-progress {\n  color: var(--acs-gold);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n}\n\n.acs-tour-skip {\n  padding: 3px 0;\n  border: 0;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 10px;\n}\n\n.acs-tour-skip:hover {\n  color: var(--acs-text);\n}\n\n.acs-tour-eyebrow {\n  margin: 18px 0 5px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.17em;\n}\n\n.acs-tour-card h2 {\n  margin: 0;\n  font-family: var(--acs-display);\n  font-size: 22px;\n  font-weight: 550;\n  line-height: 1.25;\n}\n\n.acs-tour-description {\n  min-height: 68px;\n  margin: 10px 0 15px;\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-tour-dots {\n  display: flex;\n  gap: 5px;\n  margin-bottom: 15px;\n}\n\n.acs-tour-dot {\n  width: 16px;\n  height: 3px;\n  border-radius: 999px;\n  background: rgba(232, 224, 212, 0.16);\n  transition: width 180ms ease, background 180ms ease;\n}\n\n.acs-tour-dot.is-past {\n  background: rgba(211, 173, 114, 0.42);\n}\n\n.acs-tour-dot.is-active {\n  width: 28px;\n  background: var(--acs-cyan);\n}\n\n.acs-tour-actions {\n  gap: 10px;\n  padding-top: 13px;\n  border-top: 1px solid var(--acs-line-soft);\n}\n\n.acs-tour-nav {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  min-height: 34px;\n  padding: 7px 11px;\n  border: 1px solid var(--acs-line);\n  border-radius: 8px;\n  background: #3b3832;\n  color: var(--acs-text-soft);\n  cursor: pointer;\n  font-size: 10px;\n  font-weight: 650;\n}\n\n.acs-tour-nav:disabled {\n  cursor: default;\n  opacity: 0.32;\n}\n\n.acs-tour-next {\n  margin-left: auto;\n  border-color: rgba(217, 119, 87, 0.48);\n  background: rgba(217, 119, 87, 0.14);\n  color: #f0d8cd;\n}\n\n@keyframes acs-tour-breathe {\n  0%, 100% { opacity: 0.45; transform: scale(0.995); }\n  50% { opacity: 1; transform: scale(1.012); }\n}\n\n@keyframes acs-tour-card-in {\n  from { opacity: 0.55; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.acs-eyebrow {\n  margin: 0;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.18em;\n  line-height: 1.4;\n  text-transform: uppercase;\n}\n\n.acs-brand-mark {\n  position: relative;\n  flex: 0 0 auto;\n  width: 38px;\n  height: 38px;\n}\n\n.acs-orbit,\n.acs-orbit::before {\n  position: absolute;\n  inset: 4px;\n  border: 1px solid var(--acs-cyan);\n  border-radius: 50%;\n  content: \"\";\n  transform: rotate(-26deg) scaleY(0.52);\n}\n\n.acs-orbit::before {\n  inset: -5px;\n  border-color: rgba(183, 163, 207, 0.62);\n  transform: rotate(68deg) scaleY(0.65);\n}\n\n.acs-core {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--acs-gold);\n  box-shadow: 0 0 16px rgba(211, 173, 114, 0.34);\n  transform: translate(-50%, -50%);\n}\n\n.acs-topbar-actions {\n  gap: 10px;\n}\n\n.acs-update-control {\n  position: relative;\n  flex: 0 0 auto;\n}\n\n.acs-update-button {\n  color: var(--acs-muted);\n}\n\n.acs-update-button:hover,\n.acs-update-button.is-current {\n  color: var(--acs-green);\n}\n\n.acs-update-button.is-error {\n  color: var(--acs-red);\n}\n\n.acs-update-button.is-checking i {\n  animation: acs-update-spin 760ms linear infinite;\n}\n\n.acs-update-feedback {\n  position: absolute;\n  top: calc(100% + 9px);\n  right: 0;\n  z-index: 12;\n  width: max-content;\n  max-width: min(260px, 70vw);\n  padding: 7px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 9px;\n  color: var(--acs-text-soft);\n  background: #35322d;\n  box-shadow: 0 10px 28px rgba(10, 9, 8, 0.32);\n  font-size: 11px;\n  line-height: 1.4;\n  white-space: nowrap;\n}\n\n.acs-update-feedback::before {\n  position: absolute;\n  top: -5px;\n  right: 12px;\n  width: 8px;\n  height: 8px;\n  border-top: 1px solid var(--acs-line);\n  border-left: 1px solid var(--acs-line);\n  background: #35322d;\n  content: \"\";\n  transform: rotate(45deg);\n}\n\n@keyframes acs-update-spin {\n  to { transform: rotate(360deg); }\n}\n\n.acs-dependency {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  max-width: 280px;\n  padding: 7px 11px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  background: rgba(56, 53, 47, 0.72);\n  font-size: 12px;\n  white-space: nowrap;\n}\n\n.acs-status-dot {\n  flex: 0 0 auto;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--acs-gold);\n  box-shadow: 0 0 10px currentColor;\n}\n\n.acs-dependency.is-ready .acs-status-dot {\n  background: var(--acs-green);\n}\n\n.acs-dependency.is-error .acs-status-dot {\n  background: var(--acs-red);\n}\n\n.acs-icon-button,\n.acs-button,\n.acs-tab,\n.acs-quiet-action,\n.acs-step-button {\n  color: inherit;\n  font: inherit;\n}\n\n.acs-icon-button {\n  display: grid;\n  width: 36px;\n  height: 36px;\n  padding: 0;\n  border: 1px solid transparent;\n  border-radius: 50%;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  place-items: center;\n}\n\n.acs-icon-button:hover,\n.acs-icon-button:focus-visible {\n  border-color: var(--acs-line);\n  background: var(--acs-panel-raised);\n  color: var(--acs-text);\n}\n\n.acs-workspace {\n  display: grid;\n  grid-template-columns: minmax(220px, 16vw) minmax(440px, 1fr) minmax(300px, 21vw);\n  min-height: 0;\n}\n\n.acs-rail,\n.acs-stage,\n.acs-inspector {\n  min-width: 0;\n  min-height: 0;\n}\n\n.acs-rail {\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var(--acs-line-soft);\n  background: #292722;\n}\n\n.acs-project-identity {\n  padding: 16px 14px 15px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-composer > label,\n.acs-field-stack label > span {\n  display: block;\n  margin-bottom: 7px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n}\n\n.acs-project-title-field {\n  display: block;\n}\n\n.acs-project-title-icon {\n  display: grid;\n  width: 32px;\n  height: 32px;\n  border: 0;\n  border-radius: 11px;\n  background: rgba(217, 119, 87, 0.13);\n  color: var(--acs-cyan);\n  font-size: 11px;\n  place-items: center;\n}\n\n.acs-project-title-field label {\n  display: block;\n  margin: 0 0 7px 4px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.11em;\n  text-transform: uppercase;\n}\n\n.acs-project-name-control {\n  display: grid;\n  grid-template-columns: 32px minmax(0, 1fr) 28px;\n  gap: 4px;\n  align-items: center;\n  min-height: 48px;\n  padding: 6px 7px;\n  border: 1px solid rgba(232, 224, 212, 0.14);\n  border-radius: 16px;\n  background: #38352f;\n  box-shadow: 0 7px 20px rgba(10, 9, 8, 0.18);\n  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;\n}\n\n.acs-project-name-control input {\n  width: 100%;\n  min-width: 0;\n  padding: 4px 8px;\n  border: 0;\n  border-radius: 10px;\n  outline: 0;\n  background: transparent !important;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 15px;\n  font-weight: 700;\n}\n\n.acs-project-name-control > i {\n  display: grid;\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: #45413a;\n  color: var(--acs-muted);\n  font-size: 9px;\n  opacity: 0.8;\n  place-items: center;\n}\n\n.acs-project-name-control:focus-within {\n  border-color: rgba(217, 119, 87, 0.58);\n  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1), 0 9px 24px rgba(10, 9, 8, 0.22);\n  transform: translateY(-1px);\n}\n\n.acs-project-title-field:focus-within .acs-project-name-control > i {\n  color: var(--acs-cyan);\n  opacity: 1;\n}\n\n.acs-progress-row {\n  justify-content: space-between;\n  margin-top: 12px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-progress-track {\n  height: 2px;\n  margin-top: 7px;\n  overflow: hidden;\n  background: var(--acs-line);\n}\n\n.acs-progress-track span {\n  display: block;\n  width: 0;\n  height: 100%;\n  background: linear-gradient(90deg, var(--acs-cyan), var(--acs-violet));\n  transition: width 260ms ease;\n}\n\n.acs-step-rail {\n  flex: 1 1 auto;\n  overflow: auto;\n  padding: 12px 8px 24px;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-phase-group + .acs-phase-group {\n  margin-top: 7px;\n}\n\n.acs-phase-toggle {\n  position: relative;\n  z-index: 1;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto 13px;\n  gap: 7px;\n  align-items: center;\n  width: 100%;\n  min-height: 32px;\n  padding: 6px 8px 6px 12px;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  text-align: left;\n}\n\n.acs-phase-toggle:hover,\n.acs-phase-toggle:focus-visible {\n  border-color: var(--acs-line-soft);\n  background: rgba(56, 53, 47, 0.82);\n  color: var(--acs-text);\n}\n\n.acs-phase-title {\n  overflow: hidden;\n  letter-spacing: 0.1em;\n  text-overflow: ellipsis;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n\n.acs-phase-progress {\n  padding: 2px 5px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 999px;\n  font-size: 7px;\n  letter-spacing: 0;\n}\n\n.acs-phase-toggle i {\n  font-size: 8px;\n  text-align: center;\n  transition: transform 160ms ease;\n}\n\n.acs-phase-group.is-collapsed .acs-phase-toggle i {\n  transform: rotate(-90deg);\n}\n\n.acs-phase-steps {\n  position: relative;\n  padding: 2px 0 4px 10px;\n}\n\n.acs-phase-steps::before {\n  position: absolute;\n  top: 3px;\n  bottom: 5px;\n  left: 20px;\n  width: 1px;\n  background: linear-gradient(var(--acs-cyan), var(--acs-line) 28%, var(--acs-line) 78%, var(--acs-violet));\n  content: \"\";\n  opacity: 0.38;\n}\n\n.acs-step-button {\n  position: relative;\n  z-index: 1;\n  display: grid;\n  grid-template-columns: 27px minmax(0, 1fr) 15px;\n  align-items: center;\n  width: 100%;\n  min-height: 37px;\n  padding: 4px 7px 4px 0;\n  border: 0;\n  border-radius: 9px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  text-align: left;\n}\n\n.acs-step-button:hover {\n  color: var(--acs-text);\n}\n\n.acs-step-button.is-active {\n  background: linear-gradient(90deg, rgba(217, 119, 87, 0.18), rgba(56, 53, 47, 0.28));\n  color: var(--acs-text);\n}\n\n.acs-step-node {\n  display: grid;\n  width: 15px;\n  height: 15px;\n  margin-left: 6px;\n  border: 1px solid var(--acs-line);\n  border-radius: 50%;\n  background: var(--acs-ink);\n  color: transparent;\n  font-size: 7px;\n  place-items: center;\n}\n\n.acs-step-button.is-active .acs-step-node {\n  border-color: var(--acs-cyan);\n  background: var(--acs-cyan);\n  box-shadow: 0 0 0 4px rgba(217, 119, 87, 0.1), 0 4px 12px rgba(217, 119, 87, 0.22);\n}\n\n.acs-step-button.is-complete .acs-step-node {\n  border-color: var(--acs-green);\n  background: var(--acs-green);\n  color: var(--acs-void);\n}\n\n.acs-step-button.is-draft .acs-step-node {\n  border-color: var(--acs-gold);\n  background: var(--acs-gold);\n}\n\n.acs-step-name {\n  overflow: hidden;\n  font-size: 12px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-step-number {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  text-align: right;\n}\n\n.acs-quiet-action {\n  flex: 0 0 auto;\n  margin: 8px 14px 14px;\n  padding: 10px;\n  border: 1px dashed var(--acs-line);\n  border-radius: 10px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 12px;\n}\n\n.acs-quiet-action:hover {\n  border-color: var(--acs-cyan);\n  color: var(--acs-text);\n}\n\n.acs-stage {\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  background: #302e29;\n}\n\n.acs-stage-heading {\n  flex: 0 0 auto;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 25px 28px 18px;\n  transition: padding 160ms ease, background 160ms ease;\n}\n\n.acs-stage-heading h2 {\n  margin: 4px 0 5px;\n  font-family: var(--acs-display);\n  font-size: clamp(24px, 2.4vw, 34px);\n  font-weight: 500;\n  line-height: 1.18;\n}\n\n.acs-step-goal {\n  max-width: 760px;\n  margin: 0;\n  color: var(--acs-muted);\n  font-size: 13px;\n  line-height: 1.65;\n}\n\n.acs-stage-heading-actions {\n  display: flex;\n  flex: 0 0 auto;\n  align-items: center;\n  gap: 8px;\n}\n\n.acs-overview-toggle {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  min-height: 30px;\n  padding: 5px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  outline: 0;\n  background: #38352f;\n  color: var(--acs-muted);\n  font-family: var(--acs-body);\n  font-size: 10px;\n  cursor: pointer;\n  transition: border-color 150ms ease, color 150ms ease, background 150ms ease;\n}\n\n.acs-overview-toggle:hover,\n.acs-overview-toggle:focus-visible {\n  border-color: rgba(217, 119, 87, 0.5);\n  background: #413d36;\n  color: var(--acs-cyan);\n}\n\n.acs-overview-toggle i {\n  font-size: 9px;\n}\n\n/* 收起后保留一条“飞行条”，仍可确认当前步骤与状态。 */\n.acs-stage.is-overview-collapsed .acs-stage-heading {\n  min-height: 48px;\n  align-items: center;\n  padding: 8px 20px;\n  border-bottom: 1px solid var(--acs-line-soft);\n  background: #2b2925;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading > div:first-child {\n  display: grid;\n  min-width: 0;\n  grid-template-columns: auto minmax(0, 1fr);\n  align-items: center;\n  gap: 10px;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading .acs-eyebrow {\n  margin: 0;\n  white-space: nowrap;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading h2 {\n  overflow: hidden;\n  margin: 0;\n  font-family: var(--acs-body);\n  font-size: 14px;\n  font-weight: 650;\n  line-height: 1.3;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-stage.is-overview-collapsed .acs-step-goal {\n  display: none;\n}\n\n.acs-state-chip {\n  flex: 0 0 auto;\n  padding: 6px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-state-chip.is-draft {\n  border-color: rgba(211, 173, 114, 0.45);\n  color: var(--acs-gold);\n}\n\n.acs-state-chip.is-complete {\n  border-color: rgba(147, 189, 145, 0.45);\n  color: var(--acs-green);\n}\n\n.acs-brief-panel {\n  flex: 0 0 auto;\n  margin: 0 28px 16px;\n  padding: 14px 16px 12px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 14px;\n  background: #38352f;\n  box-shadow: 0 6px 20px rgba(10, 9, 8, 0.12);\n}\n\n.acs-section-label {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n}\n\n.acs-section-label span:last-child {\n  color: var(--acs-muted);\n  letter-spacing: 0;\n  text-transform: none;\n}\n\n.acs-brief-panel textarea,\n.acs-composer textarea,\n.acs-field-stack input,\n.acs-field-stack select {\n  width: 100%;\n  border: 1px solid var(--acs-line);\n  outline: 0;\n  background: #34312c !important;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n}\n\n.acs-brief-panel textarea {\n  min-height: 72px;\n  padding: 0;\n  border: 0;\n  background: transparent !important;\n  font-size: 13px;\n  line-height: 1.65;\n  resize: vertical;\n}\n\n.acs-brief-panel textarea:focus,\n.acs-composer textarea:focus,\n.acs-field-stack input:focus,\n.acs-field-stack select:focus {\n  border-color: var(--acs-cyan);\n  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);\n}\n\n.acs-conversation {\n  position: relative;\n  flex: 1 1 auto;\n  min-height: 120px;\n  overflow: auto;\n  padding: 10px 28px 24px;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-empty-turns {\n  display: grid;\n  min-height: 100%;\n  padding: 30px;\n  color: var(--acs-muted);\n  text-align: center;\n  justify-items: center;\n  place-content: center;\n}\n\n.acs-empty-turns[hidden] {\n  display: none;\n}\n\n.acs-empty-glyph {\n  color: var(--acs-cyan);\n  font-size: 44px;\n  font-weight: 200;\n  line-height: 1;\n  opacity: 0.7;\n}\n\n.acs-empty-kicker {\n  margin-top: 12px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.acs-empty-turns h3 {\n  margin: 7px 0 6px;\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: 21px;\n  font-weight: 500;\n}\n\n.acs-empty-turns p {\n  max-width: 620px;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.65;\n}\n\n.acs-guide-panel {\n  width: min(100%, 680px);\n  margin-top: 22px;\n  padding-top: 14px;\n  border-top: 1px solid var(--acs-line-soft);\n  text-align: left;\n}\n\n.acs-guide-panel > span {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n}\n\n.acs-guide-prompts {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 8px;\n  margin: 9px 0 0;\n  padding: 0;\n  list-style: none;\n  counter-reset: guide-prompt;\n}\n\n.acs-guide-prompts li {\n  position: relative;\n  min-height: 64px;\n  padding: 10px 10px 10px 31px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #38352f;\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.55;\n  counter-increment: guide-prompt;\n}\n\n.acs-guide-prompts li::before {\n  position: absolute;\n  top: 10px;\n  left: 10px;\n  color: var(--acs-cyan);\n  content: counter(guide-prompt, decimal-leading-zero);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  letter-spacing: 0.05em;\n  opacity: 0.78;\n}\n\n.acs-turns {\n  display: grid;\n  gap: 14px;\n}\n\n.acs-turn {\n  position: relative;\n  max-width: min(92%, 900px);\n  padding: 14px 16px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 14px;\n  background: #38352f;\n  box-shadow: 0 6px 22px rgba(10, 9, 8, 0.12);\n}\n\n.acs-turn.is-user {\n  margin-left: auto;\n  border-color: rgba(217, 119, 87, 0.24);\n  background: #3a3330;\n}\n\n.acs-turn-label {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 8px;\n  margin-bottom: 8px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n}\n\n.acs-turn.is-user .acs-turn-label {\n  justify-content: flex-end;\n  color: var(--acs-violet);\n  text-align: right;\n}\n\n.acs-turn-retry {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  min-height: 23px;\n  padding: 2px 7px;\n  border: 1px solid transparent;\n  border-radius: 999px;\n  outline: 0;\n  background: transparent;\n  color: inherit;\n  font: 600 9px/1 var(--acs-body);\n  cursor: pointer;\n  opacity: 0.68;\n  transition: border-color 140ms ease, background 140ms ease, opacity 140ms ease;\n}\n\n.acs-turn-retry:hover,\n.acs-turn-retry:focus-visible {\n  border-color: rgba(217, 119, 87, 0.32);\n  background: rgba(217, 119, 87, 0.1);\n  opacity: 1;\n}\n\n.acs-turn-retry:disabled {\n  cursor: not-allowed;\n  opacity: 0.35;\n}\n\n.acs-turn-content {\n  margin: 0;\n  overflow: visible;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 12px;\n  line-height: 1.72;\n  word-break: break-word;\n}\n\npre.acs-turn-content {\n  white-space: pre-wrap;\n}\n\n.acs-turn-content > :first-child {\n  margin-top: 0;\n}\n\n.acs-turn-content > :last-child {\n  margin-bottom: 0;\n}\n\n.acs-turn-content details {\n  margin: 8px 0;\n  overflow: hidden;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #2f2c28;\n}\n\n.acs-turn-content summary {\n  padding: 8px 10px;\n  cursor: pointer;\n}\n\n.acs-turn-content details:not(.acs-code-block) > :not(summary) {\n  margin-right: 10px;\n  margin-left: 10px;\n}\n\n.acs-turn-content pre {\n  position: relative;\n  max-width: 100%;\n  overflow: auto;\n  margin: 12px 0;\n  padding: 34px 12px 12px;\n  border: 1px solid rgba(232, 224, 212, 0.2);\n  border-radius: 9px;\n  background: transparent;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n  white-space: pre-wrap;\n}\n\n.acs-turn-content .acs-code-block {\n  margin: 12px 0;\n  overflow: hidden;\n  border: 1px solid rgba(232, 224, 212, 0.2);\n  border-radius: 9px;\n  background: transparent;\n}\n\n.acs-turn-content .acs-code-block summary {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 30px;\n  padding: 6px 10px;\n  border: 0;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n  list-style: none;\n  text-transform: uppercase;\n  transition: background 140ms ease;\n}\n\n.acs-turn-content .acs-code-block summary::-webkit-details-marker {\n  display: none;\n}\n\n.acs-turn-content .acs-code-block summary:hover,\n.acs-turn-content .acs-code-block summary:focus-visible {\n  background: rgba(217, 119, 87, 0.08);\n}\n\n.acs-turn-content .acs-code-block[open] summary {\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-turn-content .acs-code-block summary i {\n  font-size: 8px;\n  transform: rotate(-90deg);\n  transition: transform 150ms ease;\n}\n\n.acs-turn-content .acs-code-block[open] summary i {\n  transform: rotate(0deg);\n}\n\n.acs-turn-content .acs-code-block > pre.acs-code-content {\n  margin: 0;\n  padding: 12px;\n  border: 0;\n  border-radius: 0;\n  background: transparent;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-turn-content pre > code {\n  display: block;\n  padding: 0;\n  border: 0;\n  background: transparent !important;\n  color: inherit;\n  font: inherit;\n  white-space: pre-wrap;\n}\n\n/* AUTO 的“说明和建议”原本使用代码围栏；此处按说明文字展示，避免全局 code 样式形成逐行黑底。 */\n.acs-turn-content details:not(.acs-code-block) > pre {\n  margin: 0 10px 10px;\n  padding: 10px 2px 2px;\n  border: 0;\n  border-top: 1px solid var(--acs-line-soft);\n  border-radius: 0;\n  background: transparent;\n  color: var(--acs-muted);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-turn-content details > pre > code {\n  white-space: pre-wrap;\n}\n\n.acs-composer {\n  flex: 0 0 auto;\n  padding: 15px 28px 20px;\n  border-top: 1px solid var(--acs-line-soft);\n  background: #292722;\n  box-shadow: 0 -5px 20px rgba(10, 9, 8, 0.12);\n}\n\n.acs-composer textarea {\n  min-height: 58px;\n  padding: 10px 12px;\n  border-radius: 10px;\n  font-size: 12px;\n  line-height: 1.55;\n  resize: vertical;\n}\n\n.acs-composer-actions {\n  justify-content: space-between;\n  gap: 14px;\n  margin-top: 10px;\n}\n\n.acs-composer-actions > div {\n  gap: 8px;\n}\n\n.acs-composer-actions p {\n  margin: 0;\n  color: var(--acs-muted);\n  font-size: 10px;\n}\n\n.acs-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  min-height: 36px;\n  padding: 8px 13px;\n  border: 1px solid var(--acs-line);\n  border-radius: 9px;\n  background: var(--acs-panel-raised);\n  color: var(--acs-text);\n  cursor: pointer;\n  font-size: 11px;\n  font-weight: 650;\n  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;\n}\n\n.acs-button:hover:not(:disabled) {\n  border-color: var(--acs-cyan);\n  transform: translateY(-1px);\n}\n\n.acs-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.38;\n}\n\n.acs-button-primary {\n  border-color: rgba(217, 119, 87, 0.46);\n  background: var(--acs-cyan-soft);\n}\n\n.acs-button-confirm {\n  border-color: rgba(147, 189, 145, 0.42);\n  background: rgba(147, 189, 145, 0.11);\n  color: #b9d7b7;\n}\n\n.acs-button-danger {\n  border-color: rgba(217, 132, 127, 0.44);\n  background: rgba(217, 132, 127, 0.11);\n  color: #edaaa6;\n}\n\n.acs-inspector {\n  position: relative;\n  overflow: auto;\n  border-left: 1px solid var(--acs-line-soft);\n  background: #292722;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-inspector.is-expanded {\n  position: absolute;\n  top: 72px;\n  right: 0;\n  bottom: 0;\n  z-index: 8;\n  width: min(72vw, 1080px);\n  border-left-color: rgba(217, 119, 87, 0.24);\n  background: #2b2925;\n  box-shadow: -28px 0 70px rgba(10, 9, 8, 0.34);\n}\n\n.acs-tabs {\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  padding: 11px 14px 0;\n  background: rgba(41, 39, 34, 0.96);\n  backdrop-filter: blur(8px);\n}\n\n.acs-tab {\n  padding: 10px 5px;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 11px;\n}\n\n.acs-tab.is-active {\n  border-color: var(--acs-cyan);\n  color: var(--acs-text);\n}\n\n.acs-tab-panel {\n  padding: 20px 18px 28px;\n}\n\n.acs-tab-panel[hidden] {\n  display: none;\n}\n\n#acs-inspector-toggle {\n  display: none;\n}\n\n.acs-inspector-intro {\n  justify-content: space-between;\n  gap: 12px;\n  color: var(--acs-muted);\n  font-size: 11px;\n}\n\n.acs-inspector-intro > div {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.acs-inspector-intro strong {\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-inspector-action,\n.acs-artifact-action {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  min-height: 28px;\n  padding: 5px 8px;\n  border: 1px solid var(--acs-line);\n  border-radius: 7px;\n  background: rgba(56, 53, 47, 0.86);\n  color: var(--acs-muted);\n  cursor: pointer;\n  font: 600 9px/1 var(--acs-body);\n}\n\n.acs-inspector-action:hover,\n.acs-inspector-action.is-active,\n.acs-artifact-action:hover {\n  border-color: rgba(217, 119, 87, 0.5);\n  color: var(--acs-cyan);\n}\n\n.acs-inspector-help,\n.acs-publish-copy p,\n.acs-publish-note {\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.6;\n}\n\n.acs-artifact-list {\n  display: grid;\n  gap: 8px;\n  margin-top: 17px;\n}\n\n.acs-artifact-empty {\n  padding: 22px 10px;\n  border-top: 1px solid var(--acs-line-soft);\n  border-bottom: 1px solid var(--acs-line-soft);\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.6;\n  text-align: center;\n}\n\n.acs-artifact {\n  overflow: hidden;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 10px;\n  background: #35322d;\n}\n\n.acs-artifact summary {\n  padding: 10px 11px;\n  cursor: pointer;\n  list-style: none;\n}\n\n.acs-artifact summary::-webkit-details-marker {\n  display: none;\n}\n\n.acs-artifact-head {\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.acs-artifact-name {\n  overflow: hidden;\n  color: var(--acs-text);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-artifact-step {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n}\n\n.acs-artifact-editor {\n  border-top: 1px solid var(--acs-line-soft);\n  background: #2d2b27;\n}\n\n.acs-artifact-toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 9px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-artifact-save-state {\n  color: var(--acs-green);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n}\n\n.acs-artifact-save-state.is-pending {\n  color: var(--acs-gold);\n}\n\n.acs-artifact-editor textarea.acs-artifact-content {\n  display: block;\n  width: 100%;\n  min-height: 260px;\n  max-height: 56vh;\n  margin: 0;\n  overflow: auto;\n  padding: 15px 16px;\n  border: 0;\n  outline: 0;\n  resize: vertical;\n  background: #302e29 !important;\n  color: #f0e9df !important;\n  caret-color: var(--acs-cyan);\n  font-family: var(--acs-body);\n  font-size: 12px;\n  font-weight: 450;\n  line-height: 1.78;\n  letter-spacing: 0.008em;\n  white-space: pre-wrap;\n  word-break: break-word;\n  tab-size: 2;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n}\n\n.acs-artifact-editor textarea.acs-artifact-content:focus {\n  background: #34312c !important;\n  box-shadow: inset 2px 0 0 rgba(217, 119, 87, 0.72);\n}\n\n.acs-artifact-editor textarea.acs-artifact-content::selection {\n  background: rgba(217, 119, 87, 0.3);\n  color: #fff8ee;\n}\n\n.acs-inspector.is-expanded .acs-artifact-content {\n  min-height: 360px;\n  max-height: 68vh;\n  font-size: 13px;\n  line-height: 1.82;\n}\n\n.acs-field-stack {\n  display: grid;\n  gap: 15px;\n}\n\n.acs-fixed-resource {\n  display: grid;\n  grid-template-columns: 34px minmax(0, 1fr) auto;\n  gap: 10px;\n  align-items: center;\n  padding: 11px;\n  border: 1px solid rgba(217, 119, 87, 0.28);\n  border-radius: 9px;\n  background: linear-gradient(110deg, rgba(217, 119, 87, 0.1), rgba(56, 53, 47, 0.82));\n}\n\n.acs-fixed-resource-icon {\n  display: grid;\n  width: 32px;\n  height: 32px;\n  place-items: center;\n  border: 1px solid rgba(217, 119, 87, 0.24);\n  border-radius: 8px;\n  color: var(--acs-cyan);\n  background: rgba(217, 119, 87, 0.1);\n  font-size: 11px;\n}\n\n.acs-fixed-resource-copy {\n  min-width: 0;\n}\n\n.acs-fixed-resource-copy > span,\n.acs-fixed-resource-copy > strong,\n.acs-fixed-resource-copy > small {\n  display: block;\n}\n\n.acs-fixed-resource-copy > span {\n  margin-bottom: 3px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n}\n\n.acs-fixed-resource-copy > strong {\n  overflow: hidden;\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  font-weight: 650;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-fixed-resource-copy > small {\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.45;\n}\n\n.acs-fixed-resource-badge {\n  padding: 4px 7px;\n  border: 1px solid rgba(217, 119, 87, 0.26);\n  border-radius: 999px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  white-space: nowrap;\n}\n\n.acs-fixed-resource.is-missing {\n  border-color: rgba(217, 132, 127, 0.42);\n  background: rgba(217, 132, 127, 0.08);\n}\n\n.acs-fixed-resource.is-missing .acs-fixed-resource-icon,\n.acs-fixed-resource.is-missing .acs-fixed-resource-badge {\n  border-color: rgba(217, 132, 127, 0.3);\n  color: var(--acs-red);\n}\n\n.acs-connection-section {\n  margin-bottom: 20px;\n  padding-bottom: 18px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-settings-heading {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n\n.acs-settings-heading span,\n.acs-settings-section-label {\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: 15px;\n  font-weight: 500;\n}\n\n.acs-settings-heading small {\n  display: block;\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 10px;\n}\n\n.acs-settings-heading > strong {\n  max-width: 48%;\n  overflow: hidden;\n  padding: 5px 8px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-settings-heading > strong.is-custom {\n  border-color: rgba(183, 163, 207, 0.38);\n  background: rgba(183, 163, 207, 0.1);\n  color: #cbb9dd;\n}\n\n.acs-connection-options {\n  display: grid;\n  gap: 8px;\n}\n\n.acs-connection-choice {\n  display: grid;\n  grid-template-columns: 18px minmax(0, 1fr);\n  gap: 9px;\n  align-items: start;\n  padding: 10px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #35322d;\n  cursor: pointer;\n}\n\n.acs-connection-choice:has(input:checked) {\n  border-color: rgba(217, 119, 87, 0.4);\n  background: rgba(217, 119, 87, 0.1);\n}\n\n.acs-field-stack .acs-connection-choice input,\n.acs-connection-choice input {\n  width: 14px;\n  min-height: 14px;\n  margin: 2px 0 0;\n  accent-color: var(--acs-cyan);\n}\n\n.acs-field-stack .acs-connection-choice > span,\n.acs-connection-choice > span {\n  margin: 0;\n}\n\n.acs-connection-choice strong,\n.acs-connection-choice small {\n  display: block;\n}\n\n.acs-connection-choice strong {\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  font-weight: 650;\n}\n\n.acs-connection-choice small {\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.45;\n}\n\n.acs-custom-connection {\n  margin-top: 10px;\n  padding: 13px;\n  border-left: 2px solid rgba(183, 163, 207, 0.5);\n  border-radius: 0 10px 10px 0;\n  background: rgba(183, 163, 207, 0.08);\n}\n\n.acs-custom-connection[hidden] {\n  display: none;\n}\n\n.acs-model-picker {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 7px;\n}\n\n.acs-model-field > label {\n  display: block;\n  margin-bottom: 7px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n}\n\n.acs-button-compact {\n  min-height: 38px;\n  padding: 7px 10px;\n  border-color: var(--acs-line);\n  background: rgba(217, 119, 87, 0.08);\n  white-space: nowrap;\n}\n\n.acs-security-note {\n  display: flex;\n  gap: 7px;\n  margin: 12px 0 0;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.55;\n}\n\n.acs-security-note i {\n  margin-top: 2px;\n  color: var(--acs-violet);\n}\n\n.acs-settings-section-label {\n  margin: 0 0 13px;\n}\n\n.acs-field-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 12px;\n}\n\n.acs-field-stack input,\n.acs-field-stack select {\n  min-height: 38px;\n  padding: 8px 9px;\n  border-radius: 8px;\n  font-size: 11px;\n}\n\n.acs-field-stack select {\n  padding-right: 36px;\n  appearance: none;\n  color-scheme: dark;\n  background-color: #34312c !important;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='m1 1 5 5 5-5' fill='none' stroke='%23d97757' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3C/svg%3E\") !important;\n  background-repeat: no-repeat !important;\n  background-position: right 12px center !important;\n  background-size: 11px 7px !important;\n  cursor: pointer;\n  transition: border-color 140ms ease, background-color 140ms ease;\n}\n\n.acs-field-stack select:hover {\n  border-color: rgba(217, 119, 87, 0.46);\n  background-color: #3b3832 !important;\n}\n\n.acs-field-stack select option {\n  background: #2d2b27;\n  color: var(--acs-text);\n}\n\n.acs-publish-copy h3 {\n  margin: 5px 0 8px;\n  font-family: var(--acs-display);\n  font-size: 22px;\n  font-weight: 500;\n}\n\n.acs-button-publish,\n.acs-button-secondary {\n  width: 100%;\n  margin-top: 16px;\n}\n\n.acs-button-publish {\n  min-height: 43px;\n  border-color: rgba(211, 173, 114, 0.48);\n  background: rgba(211, 173, 114, 0.11);\n  color: #e2c28f;\n}\n\n.acs-button-secondary {\n  margin-top: 8px;\n  background: transparent;\n}\n\n.acs-publish-note {\n  margin-top: 14px;\n  padding-left: 10px;\n  border-left: 2px solid var(--acs-gold);\n}\n\n.acs-visually-hidden {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n\n.acs-shell button:focus-visible,\n.acs-shell input:focus-visible,\n.acs-shell textarea:focus-visible,\n.acs-shell select:focus-visible {\n  outline: 2px solid var(--acs-cyan);\n  outline-offset: 2px;\n}\n\nbody.acs-no-scroll {\n  overflow: hidden !important;\n}\n\n@media (max-width: 1120px) {\n  .acs-tour-launch {\n    width: 32px;\n    padding: 6px;\n    justify-content: center;\n  }\n\n  .acs-tour-launch span {\n    display: none;\n  }\n\n  .acs-window {\n    inset: 1vh 1vw;\n  }\n\n  .acs-workspace {\n    grid-template-columns: 205px minmax(0, 1fr) 280px;\n  }\n\n  .acs-composer-actions {\n    align-items: flex-end;\n  }\n\n  .acs-composer-actions p {\n    display: none;\n  }\n}\n\n@media (max-width: 860px) {\n  .acs-window {\n    inset: 0;\n    grid-template-rows: 64px minmax(0, 1fr);\n    border: 0;\n    border-radius: 0;\n  }\n\n  .acs-dependency {\n    display: none;\n  }\n\n  .acs-workspace {\n    grid-template-columns: 68px minmax(0, 1fr);\n  }\n\n  .acs-rail {\n    grid-column: 1;\n  }\n\n  .acs-stage {\n    grid-column: 2;\n  }\n\n  .acs-inspector {\n    position: absolute;\n    top: 64px;\n    right: 0;\n    bottom: 0;\n    z-index: 5;\n    display: none;\n    width: min(88vw, 340px);\n    box-shadow: -18px 0 50px rgba(0, 0, 0, 0.4);\n  }\n\n  .acs-inspector.is-mobile-open {\n    display: block;\n  }\n\n  .acs-inspector.is-expanded {\n    top: 64px;\n    width: min(96vw, 860px);\n  }\n\n  #acs-inspector-toggle {\n    display: grid;\n  }\n\n  .acs-project-identity {\n    padding: 12px 7px;\n  }\n\n  .acs-project-title-field,\n  .acs-progress-row,\n  .acs-step-name,\n  .acs-step-number,\n  .acs-quiet-action {\n    display: none;\n  }\n\n  .acs-progress-track {\n    margin: 0;\n  }\n\n  .acs-step-rail {\n    padding-right: 7px;\n    padding-left: 7px;\n  }\n\n  .acs-phase-toggle {\n    display: grid;\n    grid-template-columns: 1fr;\n    width: 39px;\n    min-height: 28px;\n    margin: 0 auto;\n    padding: 6px;\n  }\n\n  .acs-phase-title,\n  .acs-phase-progress {\n    display: none;\n  }\n\n  .acs-phase-steps {\n    padding-left: 0;\n  }\n\n  .acs-phase-steps::before {\n    left: 13px;\n  }\n\n  .acs-step-button {\n    grid-template-columns: 27px;\n    width: 39px;\n  }\n\n  .acs-stage-heading,\n  .acs-composer {\n    padding-right: 17px;\n    padding-left: 17px;\n  }\n\n  .acs-brief-panel {\n    margin-right: 17px;\n    margin-left: 17px;\n  }\n\n  .acs-conversation {\n    padding-right: 17px;\n    padding-left: 17px;\n  }\n\n  .acs-guide-prompts {\n    grid-template-columns: 1fr;\n  }\n\n  .acs-guide-prompts li {\n    min-height: 0;\n  }\n\n  .acs-composer-actions {\n    display: block;\n  }\n\n  .acs-composer-actions > div {\n    display: grid;\n    grid-template-columns: auto 1fr;\n  }\n\n  .acs-button-confirm {\n    grid-column: 1 / -1;\n  }\n}\n\n@media (max-width: 560px) {\n  .acs-brand h1 {\n    font-size: 17px;\n  }\n\n  .acs-brand .acs-eyebrow,\n  #acs-save-project {\n    display: none;\n  }\n\n  .acs-brand-mark {\n    width: 30px;\n    height: 30px;\n  }\n\n  .acs-topbar {\n    padding: 0 12px;\n  }\n\n  .acs-stage-heading {\n    align-items: flex-start;\n  }\n\n  .acs-state-chip {\n    display: none;\n  }\n\n  .acs-overview-toggle span {\n    display: none;\n  }\n\n  .acs-overview-toggle {\n    width: 30px;\n    padding: 5px;\n  }\n\n  .acs-stage-heading h2 {\n    font-size: 25px;\n  }\n\n  .acs-section-label span:last-child {\n    display: none;\n  }\n\n  .acs-turn {\n    max-width: 100%;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .acs-progress-track span,\n  .acs-button,\n  .acs-stage-heading,\n  .acs-overview-toggle,\n  .acs-update-button i,\n  .acs-tour-launch,\n  .acs-tour-spotlight,\n  .acs-tour-spotlight::after,\n  .acs-tour-card,\n  .acs-tour-card.is-refreshing {\n    transition: none;\n    animation: none;\n  }\n}\n";
const PROJECT_LIBRARY_CSS = `
.acs-project-identity {
  position: relative;
  overflow: visible;
}

.acs-project-title-icon {
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease, transform 150ms ease;
}

.acs-project-title-icon:hover,
.acs-project-title-icon:focus-visible,
.acs-project-title-icon[aria-expanded="true"] {
  border-color: color-mix(in srgb, var(--acs-cyan) 64%, var(--acs-line));
  background: rgba(217, 119, 87, 0.2);
  color: #f0a184;
  outline: none;
}

.acs-project-title-icon:active {
  transform: translateY(1px);
}

.acs-project-menu {
  position: absolute;
  top: calc(100% + 7px);
  left: 12px;
  z-index: 60;
  width: min(310px, calc(100vw - 42px));
  overflow: hidden;
  border: 1px solid rgba(232, 224, 212, 0.2);
  border-radius: 16px;
  background: #34312c;
  box-shadow: 0 22px 54px rgba(12, 10, 8, 0.48), 0 2px 8px rgba(12, 10, 8, 0.3);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-16px) scaleY(0.94);
  transform-origin: top left;
  transition: opacity 150ms ease, transform 210ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.acs-project-menu.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scaleY(1);
}

.acs-project-menu::before {
  position: absolute;
  top: -6px;
  left: 22px;
  width: 11px;
  height: 11px;
  border-top: 1px solid rgba(232, 224, 212, 0.2);
  border-left: 1px solid rgba(232, 224, 212, 0.2);
  background: #34312c;
  content: "";
  transform: rotate(45deg);
}

.acs-project-menu-head,
.acs-project-menu-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.acs-project-menu-head {
  border-bottom: 1px solid var(--acs-line-soft);
}

.acs-project-menu-head strong {
  color: var(--acs-text);
  font-size: 13px;
  font-weight: 650;
}

.acs-project-menu-count {
  color: var(--acs-muted);
  font-family: var(--acs-mono);
  font-size: 10px;
}

.acs-project-list {
  display: grid;
  gap: 4px;
  max-height: min(330px, 48vh);
  padding: 7px;
  overflow: auto;
}

.acs-project-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: stretch;
  border: 1px solid transparent;
  border-radius: 11px;
}

.acs-project-row:hover {
  border-color: rgba(232, 224, 212, 0.13);
  background: rgba(232, 224, 212, 0.045);
}

.acs-project-row.is-current {
  border-color: rgba(217, 119, 87, 0.38);
  background: rgba(217, 119, 87, 0.1);
}

.acs-project-switch,
.acs-project-delete,
.acs-project-menu-new {
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.acs-project-switch {
  min-width: 0;
  padding: 10px 8px 10px 10px;
  background: transparent;
  text-align: left;
}

.acs-project-switch strong,
.acs-project-switch small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-project-switch strong {
  color: var(--acs-text);
  font-size: 13px;
  font-weight: 620;
}

.acs-project-switch small {
  margin-top: 4px;
  color: var(--acs-muted);
  font-family: var(--acs-mono);
  font-size: 9px;
  letter-spacing: 0.03em;
}

.acs-project-row.is-current .acs-project-switch strong::before {
  margin-right: 7px;
  color: var(--acs-cyan);
  content: "●";
  font-size: 8px;
}

.acs-project-delete {
  align-self: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  color: var(--acs-muted);
  opacity: 0.55;
}

.acs-project-row:hover .acs-project-delete,
.acs-project-delete:focus-visible {
  opacity: 1;
}

.acs-project-delete:hover,
.acs-project-delete:focus-visible {
  background: rgba(217, 132, 127, 0.14);
  color: var(--acs-red);
  outline: none;
}

.acs-project-menu-foot {
  border-top: 1px solid var(--acs-line-soft);
}

.acs-project-menu-new {
  width: 100%;
  padding: 9px 12px;
  border: 1px dashed rgba(217, 119, 87, 0.38);
  border-radius: 10px;
  background: rgba(217, 119, 87, 0.07);
  color: var(--acs-text-soft);
}

.acs-project-menu-new:hover,
.acs-project-menu-new:focus-visible {
  border-style: solid;
  background: rgba(217, 119, 87, 0.15);
  color: var(--acs-text);
  outline: none;
}

.acs-project-menu-new i {
  margin-right: 7px;
  color: var(--acs-cyan);
}

/* 原生 select 的展开层由操作系统绘制；用自定义菜单确保收起与展开状态保持同一主题。 */
.acs-native-select {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  clip: rect(0 0 0 0) !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.acs-styled-select {
  position: relative;
  width: 100%;
}

.acs-styled-select.is-open {
  z-index: 30;
}

.acs-select-trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid var(--acs-line);
  border-radius: 9px;
  background: #34312c;
  color: var(--acs-text);
  font: 500 11px/1.4 var(--acs-body);
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.acs-select-trigger:hover,
.acs-select-trigger:focus-visible,
.acs-styled-select.is-open .acs-select-trigger {
  border-color: rgba(217, 119, 87, 0.58);
  background: #3b3832;
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.09);
  outline: none;
}

.acs-select-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.acs-select-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-select-trigger i {
  color: var(--acs-cyan);
  font-size: 9px;
  transition: transform 150ms ease;
}

.acs-styled-select.is-open .acs-select-trigger i {
  transform: rotate(180deg);
}

.acs-select-options {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 31;
  display: grid;
  gap: 3px;
  max-height: min(250px, 42vh);
  padding: 6px;
  overflow: auto;
  border: 1px solid rgba(232, 224, 212, 0.2);
  border-radius: 11px;
  background: #302d28;
  box-shadow: 0 16px 38px rgba(10, 9, 8, 0.46), 0 2px 8px rgba(10, 9, 8, 0.24);
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-styled-select.opens-up .acs-select-options {
  top: auto;
  bottom: calc(100% + 6px);
}

.acs-select-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--acs-text-soft);
  font: 500 11px/1.45 var(--acs-body);
  text-align: left;
  cursor: pointer;
}

.acs-select-option:hover,
.acs-select-option:focus-visible {
  border-color: rgba(232, 224, 212, 0.13);
  background: #3b3832;
  color: var(--acs-text);
  outline: none;
}

.acs-select-option.is-selected {
  border-color: rgba(217, 119, 87, 0.34);
  background: rgba(217, 119, 87, 0.12);
  color: #f0ded5;
}

.acs-select-option i {
  color: var(--acs-cyan);
  font-size: 9px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .acs-project-menu {
    transition: none;
  }
}
`;

const ARTIFACT_HISTORY_CSS = `
.acs-artifact-toolbar-actions,
.acs-artifact-history {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acs-artifact-history {
  color: var(--acs-muted);
  font-family: var(--acs-mono);
  font-size: 8px;
}

.acs-artifact-history-button {
  display: grid;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--acs-line);
  border-radius: 7px;
  background: #38352f;
  color: var(--acs-muted);
  cursor: pointer;
  place-items: center;
}

.acs-artifact-history-button:hover:not(:disabled) {
  border-color: rgba(217, 119, 87, 0.5);
  color: var(--acs-cyan);
}

.acs-artifact-history-button:disabled {
  cursor: default;
  opacity: 0.3;
}

.acs-artifact-restore {
  border-color: rgba(211, 173, 114, 0.42);
  color: var(--acs-gold);
}

.acs-artifact-content[readonly] {
  color: var(--acs-text-soft) !important;
  background: #2d2b27 !important;
}
`;

const PROMPT_INSPECTOR_CSS = `
.acs-artifact-meta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: var(--acs-muted);
  font-family: var(--acs-mono);
  font-size: 8px;
  white-space: nowrap;
}

.acs-artifact-token-count {
  padding-left: 6px;
  border-left: 1px solid var(--acs-line-soft);
  color: #c8b9a8;
}

.acs-prompt-preview {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
}

.acs-prompt-preview-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 18, 15, 0.78);
  backdrop-filter: blur(10px);
}

.acs-prompt-preview-panel {
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  width: min(1080px, calc(100% - 48px));
  height: min(780px, calc(100% - 48px));
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(217, 202, 182, 0.25);
  border-radius: 18px;
  background: #2b2925;
  box-shadow: 0 30px 90px rgba(10, 9, 8, 0.58);
}

.acs-prompt-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--acs-line-soft);
  background: #302e29;
}

.acs-prompt-preview-title {
  min-width: 0;
}

.acs-prompt-preview-title .acs-eyebrow {
  margin: 0 0 4px;
}

.acs-prompt-preview-title h2 {
  margin: 0;
  font-family: var(--acs-display);
  font-size: 23px;
  font-weight: 500;
}

.acs-prompt-preview-title p:last-child {
  margin: 5px 0 0;
  color: var(--acs-muted);
  font-size: 10px;
}

.acs-prompt-preview-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.acs-prompt-preview-note {
  margin: 0;
  padding: 10px 20px;
  border-bottom: 1px solid var(--acs-line-soft);
  color: var(--acs-muted);
  background: rgba(211, 173, 114, 0.05);
  font-size: 10px;
  line-height: 1.55;
}

.acs-prompt-message-list {
  min-height: 0;
  overflow: auto;
  padding: 16px 18px 22px;
  scrollbar-color: var(--acs-line) transparent;
}

.acs-prompt-message {
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--acs-line-soft);
  border-left: 3px solid var(--acs-violet);
  border-radius: 10px;
  background: #302e29;
}

.acs-prompt-message[data-role="user"] {
  border-left-color: var(--acs-cyan);
}

.acs-prompt-message[data-role="assistant"] {
  border-left-color: var(--acs-green);
}

.acs-prompt-message-toggle {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto;
  width: 100%;
  gap: 9px;
  align-items: center;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.acs-prompt-message-index,
.acs-prompt-message-role,
.acs-prompt-message-size {
  font-family: var(--acs-mono);
  font-size: 8px;
}

.acs-prompt-message-index,
.acs-prompt-message-size {
  color: var(--acs-muted);
}

.acs-prompt-message-role {
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(183, 163, 207, 0.12);
  color: #cdbdde;
}

.acs-prompt-message[data-role="user"] .acs-prompt-message-role {
  background: rgba(217, 119, 87, 0.12);
  color: #efb19b;
}

.acs-prompt-message-name {
  overflow: hidden;
  color: var(--acs-text-soft);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-prompt-message-toggle i {
  color: var(--acs-muted);
  font-size: 8px;
  transform: rotate(-90deg);
  transition: transform 150ms ease;
}

.acs-prompt-message.is-open {
  border-color: rgba(217, 202, 182, 0.28);
  background: #34312c;
}

.acs-prompt-message.is-open .acs-prompt-message-toggle {
  border-bottom: 1px solid var(--acs-line-soft);
}

.acs-prompt-message.is-open .acs-prompt-message-toggle i {
  transform: rotate(0deg);
}

.acs-prompt-message-body {
  min-height: 0;
  background: #292722;
}

.acs-prompt-message-body[hidden] {
  display: none !important;
}

.acs-prompt-message-body pre {
  display: block !important;
  min-height: 180px;
  max-height: min(440px, 48vh);
  margin: 0;
  overflow: auto;
  padding: 15px 16px;
  border: 0;
  background: transparent;
  color: var(--acs-text-soft);
  font-family: var(--acs-body);
  font-size: 11px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.acs-artifact-filters {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.acs-artifact-filter-scopes {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.acs-artifact-filter-scopes::-webkit-scrollbar {
  display: none;
}

.acs-artifact-filter-button {
  flex: 0 0 auto;
  min-height: 27px;
  padding: 5px 8px;
  border: 1px solid var(--acs-line-soft);
  border-radius: 999px;
  background: #35322d;
  color: var(--acs-muted);
  cursor: pointer;
  font: 600 9px/1 var(--acs-body);
}

.acs-artifact-filter-button:hover,
.acs-artifact-filter-button.is-active {
  border-color: rgba(217, 119, 87, 0.46);
  background: rgba(217, 119, 87, 0.1);
  color: #efb19b;
}

.acs-artifact-search {
  width: 100%;
  min-height: 34px;
  padding: 7px 10px 7px 30px;
  border: 1px solid var(--acs-line-soft);
  border-radius: 9px;
  background: #35322d;
  color: var(--acs-text);
  font-size: 10px;
}

.acs-artifact-search-wrap {
  position: relative;
}

.acs-artifact-search-wrap i {
  position: absolute;
  top: 50%;
  left: 11px;
  color: var(--acs-muted);
  font-size: 9px;
  transform: translateY(-50%);
  pointer-events: none;
}

@media (max-width: 680px) {
  .acs-prompt-preview-panel {
    width: calc(100% - 18px);
    height: calc(100% - 18px);
    border-radius: 14px;
  }

  .acs-prompt-preview-head {
    align-items: flex-start;
    padding: 14px;
  }

  .acs-prompt-preview-title h2 {
    font-size: 19px;
  }

  .acs-prompt-preview-actions .acs-button span {
    display: none;
  }

  .acs-prompt-message-toggle {
    grid-template-columns: auto auto minmax(0, 1fr) auto;
  }

  .acs-prompt-message-size {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .acs-prompt-message-toggle i {
    transition: none;
  }
}
`;

const PROMPT_PREVIEW_HTML = `
  <div id="acs-prompt-preview" class="acs-prompt-preview" aria-hidden="true" hidden>
    <div class="acs-prompt-preview-backdrop" data-prompt-preview-close></div>
    <section class="acs-prompt-preview-panel" role="dialog" aria-modal="true" aria-labelledby="acs-prompt-preview-title">
      <header class="acs-prompt-preview-head">
        <div class="acs-prompt-preview-title">
          <p class="acs-eyebrow">REQUEST MANIFEST</p>
          <h2 id="acs-prompt-preview-title">本轮发送内容</h2>
          <p id="acs-prompt-preview-summary"></p>
        </div>
        <div class="acs-prompt-preview-actions">
          <button id="acs-copy-prompt-preview" class="acs-button" type="button">
            <i class="fa-regular fa-copy" aria-hidden="true"></i><span>复制全部</span>
          </button>
          <button class="acs-icon-button" type="button" data-prompt-preview-close title="关闭提示词预览">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </header>
      <p class="acs-prompt-preview-note">这里按照实际发送顺序展示，token 数按 SillyTavern 当前 tokenizer 统计消息正文；接口封装还可能产生少量额外 token。为便于阅读，受保护的角色卡变量显示为 {{char}} 与 {{user}}。</p>
      <div id="acs-prompt-message-list" class="acs-prompt-message-list"></div>
    </section>
  </div>`;

const INTERACTIVE_TOUR_CSS = `
.acs-tour-card {
  width: min(390px, calc(100vw - 28px));
  max-height: calc(100vh - 28px);
  overflow: auto;
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-tour-description {
  min-height: 0;
  margin-bottom: 10px;
}

.acs-tour-points {
  display: grid;
  gap: 7px;
  margin: 0 0 13px;
  padding: 0;
  list-style: none;
}

.acs-tour-points li {
  position: relative;
  padding-left: 16px;
  color: var(--acs-muted);
  font-size: 10px;
  line-height: 1.58;
}

.acs-tour-points li::before {
  position: absolute;
  top: 0.62em;
  left: 2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--acs-gold);
  box-shadow: 0 0 0 3px rgba(211, 173, 114, 0.1);
  content: "";
}

.acs-tour-action-note {
  margin: 0 0 14px;
  padding: 8px 10px;
  border-left: 2px solid var(--acs-cyan);
  border-radius: 0 8px 8px 0;
  background: rgba(217, 119, 87, 0.08);
  color: #e5c4b6;
  font-size: 9px;
  line-height: 1.5;
}

.acs-tour-action-note::before {
  margin-right: 6px;
  color: var(--acs-cyan);
  content: "界面动作";
  font-family: var(--acs-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.acs-tour-dots {
  overflow: hidden;
}

.acs-tour-dot {
  flex: 1 1 0;
  width: auto;
  max-width: 24px;
}

.acs-tour-dot.is-active {
  width: auto;
  flex-grow: 1.8;
}

@media (max-width: 560px) {
  .acs-tour-card {
    width: calc(100vw - 18px);
    max-height: min(68vh, 560px);
    padding: 15px;
  }

  .acs-tour-card h2 {
    font-size: 19px;
  }

  .acs-tour-eyebrow {
    margin-top: 12px;
  }
}
`;

const SCRIPT_RUNTIME_MARK = 'tavern-helper-global-script';
const SCRIPT_STYLE_ID = 'auto-card-studio-script-style';
const AUTO_CARD_STUDIO_VERSION = '0.5.17';
const UPDATE_CATALOG_URL = 'https://api.github.com/repos/NightingNine/sillytavern-scripts/contents/catalog.json?ref=main';
const UPDATE_CACHE_KEY = 'auto-card-studio:update-state:v1';
const UPDATE_REOPEN_KEY = 'auto-card-studio:reopen-after-update:v1';
const TOUR_COMPLETED_KEY = 'auto-card-studio:tour-completed:v1';
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const VERSIONED_SCRIPT_URL = version => `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-v${version}/dist/character-creation/auto-card-studio/index.js`;


const STORAGE_KEY = 'auto-card-studio:project:v1';
const PROJECT_LIBRARY_KEY = 'auto-card-studio:projects:v1';
const PROJECT_LIBRARY_VERSION = 1;
const CONNECTION_STORAGE_KEY = 'auto-card-studio:connection:v1';
const PROJECT_VERSION = 1;
const MAX_CONTEXT_CHARS = 420000;
const FIXED_PRESET_NAME = 'A.U.T.O预设_v2.0';
const TEMPLATE_MACRO_SENTINELS = Object.freeze({
    char: '__AUTO_LITERAL_CHAR_MACRO_7F3A__',
    user: '__AUTO_LITERAL_USER_MACRO_7F3A__',
});
const TEMPLATE_MACRO_GUARD_PROMPT = `模板变量保护规则：
- __AUTO_LITERAL_CHAR_MACRO_7F3A__ 是角色卡中的角色变量，输出时必须保持原样。
- __AUTO_LITERAL_USER_MACRO_7F3A__ 是角色卡中的用户变量，输出时必须保持原样。
- 不得把以上占位符改写成人名、系统名或当前聊天参与者名称。`;

const DEFAULT_CONNECTION_SETTINGS = Object.freeze({
    mode: 'current',
    source: 'openai',
    apiUrl: '',
    model: '',
});

const PHASES = [
    { id: 'foundation', label: 'I · 核心与世界', range: [1, 9] },
    { id: 'narrative', label: 'II · 叙事与体验', range: [10, 15] },
    { id: 'variables', label: 'III · 变量化系统', range: [16, 21] },
    { id: 'production', label: 'IV · 装配与交付', range: [22, 30] },
];

const TOUR_STEPS = Object.freeze([
    {
        selector: '.acs-brand',
        placement: 'bottom',
        scene: 'welcome',
        eyebrow: 'ORIENTATION 01',
        title: '先认识这座角色锻造台',
        description: 'A.U.T.O 会把角色卡创作拆成 30 个相互衔接的步骤。你负责方向、取舍与修改，AI 负责按照固定预设整理阶段产物。',
        points: ['无需一次写完全部设定，可以从模糊想法开始。', '每一步的对话、正式产物和历史版本都会保存在当前项目。'],
        actionNote: '接下来会自动打开各区域演示，不会修改你的项目内容。',
    },
    {
        selector: '#acs-project-menu',
        fallbackSelector: '.acs-project-identity',
        placement: 'right',
        scene: 'projects',
        eyebrow: 'PROJECT 02',
        title: '一个角色卡对应一个项目',
        description: '文件夹会展开项目库。你可以同时保存多个角色卡方案，并在这里新建、切换或删除项目。',
        points: ['项目名、母题、30 步进度和全部产物会一起切换。', '删除项目前会再次确认；导出的项目文件可用于备份和迁移。'],
        actionNote: '已自动展开项目库。',
    },
    {
        selector: '#acs-brief-panel',
        placement: 'right',
        scene: 'brief',
        eyebrow: 'THESIS 03',
        title: '用创作母题守住全局方向',
        description: '这里写的是整张角色卡都要遵守的总纲，而不是某一步的临时要求。后续 30 个步骤都会读取它。',
        points: ['建议写明核心体验、主角定位、审美方向与内容边界。', '母题可以随时补充；标题区的“收起概览”能为对话腾出空间。'],
        actionNote: '已自动展开创作概览。',
    },
    {
        selector: '#acs-step-rail',
        placement: 'right',
        scene: 'route',
        eyebrow: 'ROUTE 04',
        title: '30 步被组织成四段旅程',
        description: '左侧依次完成核心与世界、叙事与体验、变量化系统、装配与交付。大类可以折叠，也可以跳转到任意步骤。',
        points: ['通常按顺序推进，后一步会读取前面正式产物的最新版。', '需要返工时可直接返回旧步骤，原有对话和版本不会丢失。'],
        actionNote: '已自动展开第一大类并定位 Step 1。',
    },
    {
        selector: '.acs-stage-heading',
        placement: 'bottom',
        scene: 'station',
        eyebrow: 'STATION 05',
        title: '每一步只解决一个明确问题',
        description: '标题、目标说明和空白页提问会随步骤变化。先理解这一站要产出什么，再决定直接生成还是补充方向。',
        points: ['“未开始、草案、已确认”表示当前步骤状态。', '确认只代表采用当前版本，之后仍然可以返回修改。'],
        actionNote: '中间内容已切换到 Step 1 的任务视图。',
    },
    {
        selector: '.acs-composer',
        placement: 'top',
        scene: 'compose',
        eyebrow: 'DIALOGUE 06',
        title: '用对话逐轮打磨阶段产物',
        description: '输入框既能提交初始设想，也能要求删改、扩写或重新生成。留空时，A.U.T.O 会依据母题与已有正式产物主动完成本阶段。',
        points: ['最新一条用户输入可直接重试，并保留被替换产物的历史版本。', '满意后点击“确认并前往下一站”；不满意就继续提出具体修改。'],
        actionNote: '已自动收起创作概览，让输入与生成按钮完整可见。',
    },
    {
        selector: '#acs-preview-prompt',
        placement: 'top',
        scene: 'prompt',
        eyebrow: 'REQUEST 07',
        title: '发送前先检查 AI 会看到什么',
        description: '“查看提示词”会列出固定预设、当前步骤条目、项目上下文和本轮输入，适合排查变量、上下文与预设开关。',
        points: ['项目上下文只携带正式产物最新版和你的修改要求。', '{{char}}、{{user}} 会受到保护，不应显示成当前聊天角色名。'],
        actionNote: '引导不会直接打开大弹窗，结束后可点击此按钮亲自检查。',
    },
    {
        selector: '.acs-inspector-intro',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'artifacts',
        eyebrow: 'ARTIFACT 08',
        title: '右侧只管理正式产物',
        description: '产物页不会收录 AI 的思考、评分或建议，只展示 A.U.T.O 为当前步骤规定的最终代码块。',
        points: ['同一产物默认显示最新版，也可查看和恢复历史。', '支持编辑、复制、放大，以及按步骤、阶段和关键词筛选。'],
        actionNote: '已自动切换到“产物”页；小屏幕会同时打开右侧栏。',
    },
    {
        selector: '.acs-connection-section',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'settings',
        eyebrow: 'CONNECTION 09',
        title: '决定创作台使用哪个模型',
        description: '默认跟随 SillyTavern 当前连接；也可以为创作台单独填写兼容接口、密钥和模型，不影响主聊天。',
        points: ['A.U.T.O v2.0 预设始终固定，不跟随主界面临时切换。', '独立连接的密钥只保留在当前页面，刷新后需要重新填写。'],
        actionNote: '已自动切换到“设置”页。',
    },
    {
        selector: '.acs-publish-copy',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'publish',
        eyebrow: 'HANDOFF 10',
        title: '完成后交付角色卡与世界书',
        description: '发布页会把各步骤的正式产物装配进配套世界书，并创建或更新 SillyTavern 角色卡。',
        points: ['同名角色卡或世界书不会静默覆盖，操作前会再次确认。', '创作档案可单独下载，方便审阅完整过程或迁移。'],
        actionNote: '已自动切换到“发布”页；引导不会执行真正发布。',
    },
    {
        selector: '.acs-topbar-actions',
        placement: 'bottom',
        scene: 'controls',
        eyebrow: 'CONTROL 11',
        title: '最后记住更新与备份入口',
        description: '标题栏右侧可以手动检查脚本更新、导出当前项目、打开移动端检查器或关闭创作台。',
        points: ['项目会自动保存在浏览器中，但重要项目仍建议定期导出。', '引导可以从标题旁重复打开；Esc 可退出，左右方向键可切换步骤。'],
        actionNote: '完成后会恢复你进入引导前的页面与折叠状态。',
    },
]);

const STEPS = [
    ['9376366e-bf35-446f-babe-438959ccc452', '交互范式和美学纲领', '确定角色卡允许什么、拒绝什么，以及这段体验最终要呈现怎样的审美质感。'],
    ['94e2bf01-18df-4be8-9377-aa12d53e654a', '实现机制', '把核心体验拆成可被剧情持续执行的机制与切面。'],
    ['487bb55b-da3f-4ee7-8f6d-0c23b5591bc2', '弧光识别', '识别人物、关系、组织或世界状态从起点到终点的变化轨迹。'],
    ['ac469228-bd1a-444b-a61e-fa91bea00042', '世界蓝图', '搭建世界的身份、支柱、边界与整体运行轮廓。'],
    ['91be7e14-4169-4e4e-b0b2-c4a32c8809f0', '主要角色', '建立主要角色的原点、画像、当前状态与核心张力。'],
    ['e9b91a84-50d3-40db-b642-084797782bc6', '关系图谱', '定义角色与世界实体之间可推动叙事的关系网络。'],
    ['bb9bb9b7-3b3d-4b1a-8eb9-0a23ed3d799d', '生成规则', '为可重复生成的角色、地点、事件或细节建立一致的推演规则。'],
    ['2eeba189-911a-4d15-bf46-7caba49581b7', '具体实例', '把生成规则落成世界中真实存在的实体、地点、组织与概念。'],
    ['835fe974-b281-4077-9ef1-10ad92ce65ba', '世界知识', '补充能让叙事有据可依、可被角色实际使用的背景知识。'],
    ['07688972-a290-4b22-a210-3f9df7ef0781', '空间规划设计', '规划世界内容如何分层、分区，并明确各部分之间的边界。'],
    ['430d57cf-d2ea-46ce-b83d-624ca2300f2b', '情节图谱', '把关键事件、条件、分支和回路组织为可游玩的情节网络。'],
    ['6ab76630-4988-4dcb-a1b7-2e2635ec7a00', '维度内容', '逐一填充空间规划中的叙事维度，让它们能够独立运作。'],
    ['c6a34ba6-393f-48c7-993d-86c47de6a35c', '叙事指南核心', '确定叙事者的身份、态度、镜头与处理场景的核心方法。'],
    ['324e85a9-0fc1-4e8b-85cf-1ff9851f5b03', '语料库', '建立符合角色与世界气质的措辞、意象、句式和表达素材。'],
    ['35ea2ccc-99c5-4731-a25a-0693614b07fa', '场景策略集', '为高频或关键场景准备可复用、可变化的描写策略。'],
    ['d491235e-9535-48b0-8b15-6c0e777114fb', '数据盘点', '识别哪些叙事信息需要成为变量，哪些应继续留在静态设定中。'],
    ['60b1db7c-30d4-4a86-bd41-67e13c5084e0', '变量体系规划', '规划变量簇、层级、职责和相互依赖关系。'],
    ['dace3da4-0f0d-4c81-8e7c-02db7e716acf', '具体变量设计', '为每个变量定义类型、初值、范围、联动与展示引用。'],
    ['5255b750-60b7-4f53-ad3b-3a950452d0f1', '变量汇总与路由', '汇总变量结构，并规定剧情变化如何被路由到对应变量。'],
    ['d8f77e8f-ab6c-486f-a422-c136d7d5cb95', '条件显示配置', '定义哪些变量状态会触发哪些世界书内容。'],
    ['db7539c5-8920-4899-bbdc-9c0d910beb43', '条件展示内容', '编写由变量条件唤起的具体知识、场景与实例内容。'],
    ['5472b214-c260-4ce8-97c2-7e9831cce93d', '世界根目录', '建立运行时索引，让模型能找到庞大世界书中的正确内容。'],
    ['d6d362c4-5556-4bd0-a08c-067afb3424b1', '设计状态栏', '设计与体验一致的状态栏界面、数据区和正则捕获方式。'],
    ['268aa2ec-491c-4232-827d-8dbe291d4917', '设计回复格式', '规定正文、摘要、选项、变量更新与状态栏的最终输出结构。'],
    ['829abf27-660e-4df4-8925-d7041bfd2868', '副AI任务清单', '识别适合交给副 AI 独立执行的任务与触发时机。'],
    ['3a430168-7280-44ed-ab33-a0e8e4bbaf35', '世界书提示词', '为副 AI 编写读取和维护世界书内容的任务提示词。'],
    ['ca6d2266-d37f-4596-bd2b-b61ac0f7ba49', '变量提示词', '编写遵循 MVU 语法的变量更新任务提示词。'],
    ['4c520657-a4b7-460f-95cf-96c1931c4cdc', '配置与条目设计', '规划最终世界书条目、激活策略、位置与读取关系。'],
    ['bdc8f3a0-37a3-415a-b01d-b91359b79104', '世界书重组方案', '生成可供重组器执行的条目映射与属性方案。'],
    ['0b166044-370f-428d-ba4c-35531287b921', '开场白和变量初始值', '用已完成的世界设定生成正式开场，并给出完整变量初始树。'],
].map(([promptId, name, goal], index) => ({
    number: index + 1,
    promptId,
    name,
    goal,
    phase: PHASES.find(phase => index + 1 >= phase.range[0] && index + 1 <= phase.range[1]).id,
}));

// 每一站都给出不同的创作入口，避免初次使用者只看到抽象的阶段名称。
const STEP_GUIDES = [
    {
        title: '先定下这段体验的方向',
        description: '不用一次写完整套设定。先告诉 A.U.T.O 玩家要体验什么，以及这段创作必须遵守的边界。',
        prompts: ['玩家将以什么身份进入故事，主要能做什么？', '你最希望反复出现的是哪种情绪或体验？', '哪些内容、走向或表现方式明确不要出现？'],
        placeholder: '例如：玩家扮演刚抵达边境城的调查员，体验重点是未知探索与同伴信任；不要替玩家决定关键选择。',
    },
    {
        title: '找出体验持续发生的办法',
        description: '把上一站的体验目标拆成可以在剧情里反复运作的机制。先描述“怎样发生”，不必急着写技术格式。',
        prompts: ['什么事件会不断把玩家推向核心体验？', '角色、地点或资源分别承担什么作用？', '怎样避免体验只在开场出现一次就消失？'],
        placeholder: '例如：线索调查推动探索；同伴信任决定能否获得真实情报；每次选择都会改变阵营态度。',
    },
    {
        title: '画出变化发生的轨迹',
        description: '这一站关注“从什么状态走向什么状态”。人物、关系、组织和世界都可以拥有自己的变化弧线。',
        prompts: ['故事开始时，最重要的人或关系处于什么状态？', '什么事件会让它第一次发生明显变化？', '你希望它最终可能走向哪些不同结果？'],
        placeholder: '例如：主角起初拒绝依赖任何人；共同危机迫使其合作；最终可能学会信任，也可能彻底走向孤立。',
    },
    {
        title: '搭起世界能够运行的骨架',
        description: '先确定世界最重要的事实、力量和边界。细节可以以后补，这里只需要让世界站得住。',
        prompts: ['这是怎样的时代、地域或社会？', '哪些力量、规则或矛盾支配着日常生活？', '世界之外或设定边界之外，有什么不需要展开？'],
        placeholder: '例如：被永久风暴包围的群岛文明；航路由三家公会控制；魔法只能改变记忆，不能创造物质。',
    },
    {
        title: '让主要角色真正站到台前',
        description: '从角色的过去、现在和内在矛盾入手。姓名可以暂定，但请尽量说明他为什么值得被故事持续关注。',
        prompts: ['角色是谁，目前处在什么困境或位置？', '他最想得到什么，又最害怕失去什么？', '他与玩家是什么关系，表面和真实态度有何不同？'],
        placeholder: '例如：姓名、身份、外貌印象、关键过去、当前目标、秘密，以及与玩家的初始关系。',
    },
    {
        title: '把角色连接成会拉扯的网络',
        description: '关系不是通讯录。重点写清彼此如何影响选择，以及哪些关系会主动制造剧情。',
        prompts: ['谁信任、依赖、利用或敌视谁？', '哪些关系存在隐瞒、误解或单方面期待？', '一段关系变化时，会牵动哪些其他角色？'],
        placeholder: '例如：A 表面效忠 B，实际在保护 C；B 依赖 A 的能力却怀疑其动机；玩家可能打破这一平衡。',
    },
    {
        title: '规定新内容怎样被生成',
        description: '为尚未逐一写出的角色、地点、事件和细节建立共同规律，让临场生成仍然属于同一个世界。',
        prompts: ['需要反复生成的是人物、地点、事件还是物品？', '它们必须共享哪些特征和因果规律？', '有哪些反例看似合理，却不应该被生成？'],
        placeholder: '例如：每座港口都由一种稀缺资源塑造；当地冲突必须同时涉及航路、阶层与风暴风险。',
    },
    {
        title: '用具体实例检验规则',
        description: '把生成规则落成几件真实存在的事物。实例既是世界内容，也是检查规则是否足够清楚的样本。',
        prompts: ['最值得先落地的角色、地点或组织是什么？', '它如何体现上一站的生成规律？', '它能立即引出什么事件或互动？'],
        placeholder: '例如：列出一个代表地点、一个当地组织和一个正在发生的事件，并说明它们之间的联系。',
    },
    {
        title: '补齐角色真正用得上的知识',
        description: '世界知识不是百科全书。优先补充会影响判断、对话和行动的事实与常识。',
        prompts: ['当地人默认知道、外来者却不知道什么？', '哪些历史、制度或禁忌会改变角色的选择？', '遇到新情况时，模型应该依据什么规律判断？'],
        placeholder: '例如：当地通行的礼仪、交易规则、历史创伤、危险常识，以及不同群体对它们的理解差异。',
    },
    {
        title: '规划故事发生的空间层次',
        description: '这里的“空间”也可以是时间、关系阶段或事件状态。目标是把庞大内容切成清楚、可管理的区域。',
        prompts: ['故事可分成哪些主要区域或阶段？', '每个区域允许发生什么，不适合发生什么？', '玩家通过什么条件在区域之间移动？'],
        placeholder: '例如：安全据点、争议边区和风暴核心；分别说明功能、主要冲突、进入条件与彼此联系。',
    },
    {
        title: '把事件组织成可游玩的路径',
        description: '不要只写一条固定剧情。先确定关键事件、触发条件、可选分支，以及选择如何回到长期主线。',
        prompts: ['哪些事件是必须存在的关键节点？', '玩家的哪些选择会打开、关闭或延后分支？', '失败后故事怎样继续，而不是直接中断？'],
        placeholder: '例如：调查失踪船队是入口；公开证据或私下交易形成两条路径；失败会提高追捕压力但不结束故事。',
    },
    {
        title: '逐一填充每个叙事维度',
        description: '为上一站划分的区域或阶段补充可独立运作的内容，让进入任何一处都有事可做。',
        prompts: ['这个维度独有的规则、人物和冲突是什么？', '玩家进入后最先看到或遭遇什么？', '这里的行动会怎样影响其他维度？'],
        placeholder: '例如：选择一个尚未完善的区域，补充环境特征、常驻人物、主要事件、危险和离开条件。',
    },
    {
        title: '确定叙事者怎样观察世界',
        description: '这一站决定实际游玩时“谁在讲、怎样讲”。重点是稳定的镜头、态度和处理方法。',
        prompts: ['叙事者与玩家、角色保持怎样的距离？', '描写更关注动作、心理、环境还是对话？', '面对冲突、日常和未知信息时分别怎样处理？'],
        placeholder: '例如：第三人称近距离跟随主要角色；少做解释，多通过动作与感官呈现；未知信息不提前揭晓。',
    },
    {
        title: '收集这个世界自己的语言材料',
        description: '把抽象文风变成可以直接调用的词语、意象、句式和表达习惯，避免所有场景都说同一种话。',
        prompts: ['哪些词汇和意象最能代表世界气质？', '不同角色或群体说话有什么明显差异？', '有哪些陈词滥调或表达方式应当避免？'],
        placeholder: '例如：航海者常用风向比喻；贵族句式克制而绕弯；禁用现代网络用语和泛滥的华丽形容词。',
    },
    {
        title: '为关键场景准备写法',
        description: '为经常出现或承担转折作用的场景准备策略。策略描述怎样变化，不是复制一段固定文本。',
        prompts: ['哪些场景会高频出现或决定体验质量？', '每类场景应聚焦哪些感官、动作与信息？', '重复出现时，怎样根据状态产生变化？'],
        placeholder: '例如：初次会面、秘密交易、风暴航行和关系决裂；分别说明节奏、焦点、变化来源与结束信号。',
    },
    {
        title: '决定哪些信息需要被持续记录',
        description: '先盘点动态信息，再决定是否变量化。只有会变化且会影响后续内容的信息才值得长期追踪。',
        prompts: ['哪些状态会在游玩过程中频繁改变？', '哪些变化会影响剧情、关系或内容显示？', '哪些设定保持不变，放在普通世界书里更合适？'],
        placeholder: '例如：信任、伤势、阵营声望和已发现线索需要记录；出生地与固定历史不需要变量化。',
    },
    {
        title: '给变量分组并划清职责',
        description: '把上一站的数据整理成稳定的体系。先看它们属于谁、服务什么，再考虑具体字段名。',
        prompts: ['变量可以按角色、世界、任务或界面怎样分组？', '哪些是核心状态，哪些只是辅助记录？', '不同变量簇之间存在什么依赖关系？'],
        placeholder: '例如：角色状态簇、关系簇、世界进程簇、线索簇；说明每组职责、更新频率和相互依赖。',
    },
    {
        title: '把每一个变量定义清楚',
        description: '为变量确定名称、类型、初值、范围和更新依据，避免运行后出现含义不明或互相冲突的字段。',
        prompts: ['变量是数字、文本、布尔值、数组还是对象？', '初始值与合法范围是什么？', '什么事件会更新它，哪些变量会与它联动？'],
        placeholder: '例如：信任度为 0–100 的整数，初值 20；兑现承诺上升，欺骗被识破下降，并影响可用对话。',
    },
    {
        title: '让剧情变化准确流向变量',
        description: '汇总变量结构，并规定叙事事件如何找到需要更新的字段，防止漏更、错更或重复更新。',
        prompts: ['每类事件应该检查哪些变量簇？', '一次事件影响多个变量时，先后和优先级如何？', '哪些变化需要记录理由或保留旧值？'],
        placeholder: '例如：关系事件先判断参与角色，再更新信任与关系阶段；世界事件随后更新阵营声望和可用地点。',
    },
    {
        title: '规定内容在什么条件下出现',
        description: '把变量状态与世界书内容连接起来。目标是用尽量少而清楚的条件，准确唤起需要的信息。',
        prompts: ['哪些内容不能始终放入上下文，只能按需出现？', '它依赖哪个变量达到什么状态？', '多个条件同时满足时，是任一满足还是必须全部满足？'],
        placeholder: '例如：关系阶段达到“信任”后显示角色秘密；进入北港且风暴等级大于 2 时显示封港事件。',
    },
    {
        title: '编写条件触发后的实际内容',
        description: '现在填写被条件唤起的知识、场景与实例。内容必须能脱离设计过程，被模型直接理解和使用。',
        prompts: ['条件满足后，模型具体需要知道什么？', '内容是事实、行动规则、场景材料还是对话依据？', '条件失效或状态升级后，旧内容是否仍然有效？'],
        placeholder: '例如：当信任阶段开启后，提供秘密的完整事实、角色透露秘密的方式，以及仍然不会主动说出的部分。',
    },
    {
        title: '建立世界书的运行时导航',
        description: '为已经很多的条目建立根索引，让模型先知道该去哪里找，而不是一次读取全部内容。',
        prompts: ['世界书可以分成哪些主要内容域？', '每个域负责回答什么问题？', '模型遇到一种任务时，应按什么顺序查找？'],
        placeholder: '例如：角色、地点、事件、规则、变量五个入口；说明每个入口的用途、下级标签与读取顺序。',
    },
    {
        title: '设计玩家一眼能读懂的状态栏',
        description: '状态栏只展示当前决策真正需要的信息。先确定内容和层级，再考虑装饰与代码。',
        prompts: ['玩家每轮最需要看到哪些状态？', '哪些信息应该突出、折叠或暂时隐藏？', '状态栏怎样呼应世界气质，又不影响正文阅读？'],
        placeholder: '例如：突出当前位置、时间、关系阶段与当前目标；详细变量折叠；整体采用航海日志式信息层级。',
    },
    {
        title: '规定模型每轮回复的装配顺序',
        description: '把正文、摘要、选项、变量更新和状态栏组织成稳定格式，让后续脚本能够可靠识别。',
        prompts: ['玩家最终会看到哪些部分？', '哪些部分只供脚本读取，不应混进正文？', '各部分使用什么标签、顺序和缺省规则？'],
        placeholder: '例如：先输出叙事正文，再输出可选行动；变量更新与摘要放在独立标签中，最后提供状态栏数据。',
    },
    {
        title: '挑出适合交给副 AI 的工作',
        description: '副 AI 适合处理独立、重复且有明确输入输出的任务，不应该替代主叙事的即时判断。',
        prompts: ['哪些工作耗时重复，却不必占用主回复篇幅？', '任务在什么时机触发，需要读取哪些资料？', '结果写回哪里，失败时怎样处理？'],
        placeholder: '例如：每 10 轮压缩长期摘要；新角色出现时补建档案；章节结束后整理待办与关系变化。',
    },
    {
        title: '教副 AI 怎样维护世界知识',
        description: '为世界书相关任务编写可执行的提示词，明确资料来源、判断范围、输出格式和禁止事项。',
        prompts: ['副 AI 需要读取哪些条目或上下文？', '它要新增、更新、合并还是仅做检查？', '怎样的输出才能被系统安全地写回世界书？'],
        placeholder: '例如：读取本轮新事实与现有角色条目；只更新已被剧情证实的信息；按指定标签输出变更块。',
    },
    {
        title: '教副 AI 安全地更新变量',
        description: '把变量更新规则写成严格任务，确保它只依据实际剧情改动合法字段，并遵循 MVU 格式。',
        prompts: ['每轮需要检查哪些事件与变量？', '如何判断“没有变化”，避免强行更新？', '输出必须满足哪些 MVU 语法与范围约束？'],
        placeholder: '例如：只依据本轮已发生事件；不得推测未公开事实；先核对字段类型和范围，再输出最小变更集。',
    },
    {
        title: '把设计成果装进正确的条目',
        description: '规划最终世界书的条目边界、激活方式、位置和读取关系，让内容既找得到，也不会全部常驻。',
        prompts: ['哪些内容必须放在一起，哪些应该拆开？', '条目常驻、关键词触发还是由脚本读取？', '条目的位置、顺序和优先级怎样安排？'],
        placeholder: '例如：核心规则常驻；角色细节按名字触发；条件内容由变量控制；列出条目名、内容来源与激活方式。',
    },
    {
        title: '生成可以执行的重组方案',
        description: '把源世界书内容映射到最终条目，并补全重组器需要的属性。这里重在准确，不再改写设定本身。',
        prompts: ['每个源内容块应该进入哪个目标条目？', '需要合并、拆分、追加还是保持原样？', '是否存在无法识别、重复或缺失的内容块？'],
        placeholder: '例如：确认源条目与目标条目的映射；标记合并方式、条目属性，以及需要人工复核的异常项。',
    },
    {
        title: '用开场把整个世界启动起来',
        description: '调用前面完成的世界、角色、叙事和变量设计，写出可直接开始游玩的开场与完整初始状态。',
        prompts: ['玩家在第一句话前身处何时何地、面对什么？', '哪个人物、动作或事件最适合立刻建立核心体验？', '所有变量的初值是否与开场事实完全一致？'],
        placeholder: '例如：指定开场地点、出场角色、即时矛盾、玩家可感知的信息，以及与场景一致的完整变量初始树。',
    },
];

const STEP_PROMPT_IDS = new Set(STEPS.map(step => step.promptId));
const PLACEHOLDER_IDS = new Set([
    'worldInfoBefore',
    'personaDescription',
    'charDescription',
    'charPersonality',
    'scenario',
    'worldInfoAfter',
    'dialogueExamples',
    'chatHistory',
]);

const WORLD_ENTRY_MAPPINGS = [
    { step: 1, needle: '交互范式', tags: ['WORLD_interaction_paradigm'] },
    { step: 1, needle: '美学纲领', tags: ['WORLD_aesthetic_program'] },
    { step: 2, needle: '实现机制', prefixes: ['WORLD_implementation_mechanisms'] },
    { step: 3, needle: '弧光识别' },
    { step: 4, needle: '世界蓝图', tags: ['WORLD_blueprint'] },
    { step: 5, needle: '主要角色-原点', suffixes: ['_原点'] },
    { step: 5, needle: '主要角色-画像', suffixes: ['_画像'] },
    { step: 5, needle: '主要角色-状态', sourcePrefixes: ['SOURCE_main_characters_'] },
    { step: 6, needle: '关系图谱', prefixes: ['WORLD_relationship_map'] },
    { step: 7, needle: '生成规则', prefixes: ['WORLD_generative_rules_'] },
    { step: 8, needle: '具体实例', prefixes: ['WORLD_specific_instances'] },
    { step: 9, needle: '世界知识', prefixes: ['WORLD_lore_'] },
    { step: 10, needle: '空间规划' },
    { step: 11, needle: '情节图谱' },
    { step: 12, needle: '维度内容', prefixes: ['WORLD_dimension_'] },
    { step: 13, needle: '叙事指南核心', tags: ['WORLD_narrative_core'] },
    { step: 14, needle: '语料库', prefixes: ['WORLD_language_materials_'] },
    { step: 15, needle: '场景策略集', prefixes: ['WORLD_scene_strategies_'] },
    { step: 16, needle: '数据盘点' },
    { step: 17, needle: '变量体系规划' },
    { step: 18, needle: '当前变量', prefixes: ['WORLD_current_'] },
    { step: 19, needle: '更新指南', tags: ['WORLD_variable_update_guide'] },
    { step: 20, needle: '条件显示规划' },
    { step: 21, needle: '其他条件显示内容', prefixes: ['WORLD_'] },
    { step: 22, needle: '世界根目录', tags: ['WORLD_root_index'] },
    { step: 23, needle: '输出格式', tags: ['SOURCE_statusbar_data_guide', 'STATUSBAR_DATA'], append: true },
    { step: 24, needle: '输出格式', prefixes: ['SYS_output_format', 'WORLD_'], append: true },
    { step: 25, needle: '副AI任务清单' },
    { step: 26, needle: '世界书提示词' },
    { step: 27, needle: '变量提示词' },
    { step: 28, needle: '条目规划表' },
];

// 固定 A.U.T.O v2.0 各步骤的正式交付物。CONTEXT_* 属于思考、评分或追问，不进入产物栏。
const STEP_ARTIFACT_RULES = Object.freeze({
    1: { tags: ['WORLD_interaction_paradigm', 'WORLD_aesthetic_program'] },
    2: { prefixes: ['WORLD_implementation_mechanisms'] },
    3: { prefixes: ['WORLD_arc_framework_'] },
    4: { tags: ['WORLD_blueprint'] },
    // Step 5 的“状态”按 A.U.T.O 预设定义为 SOURCE 中间产物，
    // 但它是角色卡后续变量系统的必要输入，因此与原点、画像一起纳入正式产物。
    5: { prefixes: ['WORLD_main_characters_', 'SOURCE_main_characters_'] },
    6: { prefixes: ['WORLD_relationship_map'] },
    7: { prefixes: ['WORLD_generative_rules_'] },
    8: { prefixes: ['WORLD_specific_instances_'] },
    9: { prefixes: ['WORLD_lore_'] },
    10: { tags: ['SOURCE_spatial_planning'] },
    11: { prefixes: ['SOURCE_plot_graph_'] },
    12: { prefixes: ['WORLD_dimension_'] },
    13: { tags: ['WORLD_narrative_core'] },
    14: { prefixes: ['WORLD_language_materials_'] },
    15: { prefixes: ['WORLD_scene_strategies_'] },
    16: { fences: ['part1', 'part2'] },
    17: { tags: ['SOURCE_variable_system_planning'] },
    18: { prefixes: ['WORLD_current_', 'SOURCE_condition_mapping_'], fences: ['schema'] },
    19: { tags: ['WORLD_variable_update_guide'] },
    20: { prefixes: ['WORLD_'] },
    21: { prefixes: ['WORLD_'] },
    22: { tags: ['WORLD_root_index'] },
    23: { statusbarFences: true },
    24: { tags: ['SYS_output_format'] },
    25: { tags: ['SOURCE_task_list'] },
    26: { prefixes: ['SYS_task_'] },
    27: { prefixes: ['SYS_task_'] },
    28: { tags: ['SOURCE_entry_plan'], fences: ['autotask_config'] },
    29: { fences: ['reorg_plan'] },
    30: { fences: ['opening'] },
});

let projectLibrary = loadProjectLibrary();
let project = getActiveProject(projectLibrary);
let connectionSettings = loadConnectionSettings();
// 密钥只在当前页面的内存中保留，不能进入项目存档或导出文件。
let customApiKey = '';
let shell = null;
let helper = null;
let launcherInstallTimer = null;
let isGenerating = false;
let activeGenerationId = null;
let artifactPanelExpanded = false;
let projectMenuCloseTimer = null;
let updateFeedbackTimer = null;
let isCheckingForUpdate = false;
let tourActive = false;
let tourStepIndex = 0;
let tourAnimationFrame = null;
let tourSceneTimer = null;
let tourRestoreState = null;
let renderedArtifactGroups = [];
let promptPreviewMessages = [];
let promptTokenRenderEpoch = 0;
let artifactFilterScope = 'all';
let artifactFilterQuery = '';
const artifactSaveTimers = new Map();
let environment = {
    checked: false,
    presetNames: [],
    worldbookNames: [],
    presetName: project.presetName || '',
    worldbookName: project.sourceWorldbookName || '',
};

function createDefaultProject() {
    const steps = {};
    for (const step of STEPS) {
        steps[step.number] = { status: 'idle', turns: [], updatedAt: null };
    }

    return {
        version: PROJECT_VERSION,
        id: globalThis.crypto?.randomUUID?.() || `auto-${Date.now()}`,
        name: '未命名世界',
        brief: '',
        currentStep: 1,
        presetName: '',
        sourceWorldbookName: '',
        preferences: {
            aiRole: 'A.U.T.O.',
            creatorRole: '创作者',
            wordCount: '3000',
            language: '中文',
            person: '第三人称',
        },
        output: {
            characterName: '',
            worldbookName: '',
        },
        ui: {
            collapsedPhases: [],
            overviewCollapsed: true,
        },
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function normalizeProject(saved) {
    if (!saved || typeof saved !== 'object' || saved.version !== PROJECT_VERSION) return null;
    const clean = createDefaultProject();
    const normalized = {
        ...clean,
        ...saved,
        id: String(saved.id || clean.id),
        name: String(saved.name || '未命名世界'),
        preferences: { ...clean.preferences, ...(saved.preferences || {}) },
        output: { ...clean.output, ...(saved.output || {}) },
        ui: { ...clean.ui, ...(saved.ui || {}) },
        steps: { ...clean.steps, ...(saved.steps || {}) },
    };
    repairProjectTemplateMacros(normalized);
    return normalized;
}

function loadProjectLibrary() {
    try {
        const savedLibrary = JSON.parse(localStorage.getItem(PROJECT_LIBRARY_KEY));
        if (savedLibrary?.version === PROJECT_LIBRARY_VERSION && Array.isArray(savedLibrary.projects)) {
            const projects = savedLibrary.projects.map(normalizeProject).filter(Boolean);
            if (projects.length) {
                const activeProjectId = projects.some(item => item.id === savedLibrary.activeProjectId)
                    ? savedLibrary.activeProjectId
                    : projects[0].id;
                return { version: PROJECT_LIBRARY_VERSION, activeProjectId, projects };
            }
        }
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 项目库读取失败，尝试迁移旧项目。', error);
    }

    // 首次升级时，把旧版单项目存档完整迁移进项目库。
    let migratedProject = null;
    try {
        migratedProject = normalizeProject(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 旧项目读取失败，将创建新项目。', error);
    }
    const initialProject = migratedProject || createDefaultProject();
    const library = {
        version: PROJECT_LIBRARY_VERSION,
        activeProjectId: initialProject.id,
        projects: [initialProject],
    };
    localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(library));
    return library;
}

function getActiveProject(library) {
    const active = library.projects.find(item => item.id === library.activeProjectId) || library.projects[0];
    library.activeProjectId = active.id;
    return active;
}

function saveProjectLibrary() {
    localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(projectLibrary));
    // 同步保留旧版单项目键，便于回退旧版本时仍可读取当前项目。
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

function saveProject() {
    project.updatedAt = new Date().toISOString();
    const index = projectLibrary.projects.findIndex(item => item.id === project.id);
    if (index >= 0) projectLibrary.projects[index] = project;
    else projectLibrary.projects.push(project);
    projectLibrary.activeProjectId = project.id;
    saveProjectLibrary();
    if (shell?.querySelector('#acs-project-menu:not([hidden])')) renderProjectMenu();
}

function loadConnectionSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONNECTION_STORAGE_KEY));
        return {
            ...DEFAULT_CONNECTION_SETTINGS,
            ...(saved && typeof saved === 'object' ? saved : {}),
            mode: saved?.mode === 'custom' ? 'custom' : 'current',
        };
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 无法读取模型连接设置，将使用当前 SillyTavern 连接。', error);
        return { ...DEFAULT_CONNECTION_SETTINGS };
    }
}

function saveConnectionSettings() {
    // 明确挑选可持久化字段，避免以后误把 customApiKey 写入本地存储。
    localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify({
        mode: connectionSettings.mode,
        source: connectionSettings.source,
        apiUrl: connectionSettings.apiUrl,
        model: connectionSettings.model,
    }));
}

function notify(type, message, title = 'A.U.T.O 角色卡创作台') {
    if (globalThis.toastr?.[type]) {
        globalThis.toastr[type](message, title);
        return;
    }
    console[type === 'error' ? 'error' : 'info'](`[${title}] ${message}`);
}

function normalizeName(value) {
    return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\s._·\-—()（）\[\]【】]/g, '');
}

function choosePresetName(names) {
    // 创作台只认 A.U.T.O v2.0，避免项目记录或主界面选择把流程切到其他预设。
    const exact = names.find(name => normalizeName(name) === normalizeName(FIXED_PRESET_NAME));
    if (exact) return exact;
    return names.find(name => {
        const normalized = normalizeName(name);
        return normalized.includes('auto') && normalized.includes('预设') && normalized.includes('20');
    }) || '';
}

function chooseWorldbookName(names) {
    if (project.sourceWorldbookName && names.includes(project.sourceWorldbookName)) {
        return project.sourceWorldbookName;
    }
    const exact = names.find(name => /A\.U\.T\.O.*预设.*2\.0/i.test(name));
    if (exact) return exact;
    return names.find(name => {
        const normalized = normalizeName(name);
        return normalized.includes('auto') && normalized.includes('预设') && normalized.includes('20');
    }) || '';
}

async function waitForTavernHelper(timeout = 12000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
        if (globalThis.TavernHelper?.generateRaw && globalThis.TavernHelper?.getPreset) {
            return globalThis.TavernHelper;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return null;
}

async function inspectEnvironment() {
    const status = shell.querySelector('#acs-dependency-status');
    status.classList.remove('is-ready', 'is-error');
    status.querySelector('span:last-child').textContent = '正在检查创作环境';

    helper = await waitForTavernHelper();
    if (!helper) {
        environment.checked = true;
        status.classList.add('is-error');
        status.querySelector('span:last-child').textContent = '未检测到酒馆助手';
        notify('error', '请先启用“酒馆助手”扩展，然后刷新 SillyTavern。');
        renderEnvironmentSelectors();
        renderCurrentStep();
        return;
    }

    try {
        environment.presetNames = helper.getPresetNames?.() || [];
        environment.worldbookNames = helper.getWorldbookNames?.() || [];
        environment.presetName = choosePresetName(environment.presetNames);
        environment.worldbookName = chooseWorldbookName(environment.worldbookNames);
        project.presetName = environment.presetName;
        project.sourceWorldbookName = environment.worldbookName;
        environment.checked = true;
        saveProject();
        renderEnvironmentSelectors();
        renderCurrentStep();

        const missing = [];
        if (!environment.presetName) missing.push('A.U.T.O v2.0 预设');
        if (!environment.worldbookName) missing.push('A.U.T.O v2.0 世界书');
        if (missing.length) {
            status.classList.add('is-error');
            status.querySelector('span:last-child').textContent = `缺少：${missing.join('、')}`;
            return;
        }

        status.classList.add('is-ready');
        status.querySelector('span:last-child').textContent = '预设、世界书与酒馆助手已就绪';
    } catch (error) {
        environment.checked = true;
        console.error('[A.U.T.O Card Studio] 环境检查失败', error);
        status.classList.add('is-error');
        status.querySelector('span:last-child').textContent = '环境检查失败';
        renderCurrentStep();
    }
}

function renderEnvironmentSelectors() {
    const presetLock = shell.querySelector('#acs-preset-lock');
    const presetName = shell.querySelector('#acs-preset-name');
    const worldbookSelect = shell.querySelector('#acs-worldbook-select');
    const presetReady = Boolean(environment.presetName);
    presetLock.classList.toggle('is-missing', !presetReady);
    presetName.textContent = presetReady ? environment.presetName : `未找到 ${FIXED_PRESET_NAME}`;
    presetLock.querySelector('.acs-fixed-resource-badge').textContent = presetReady ? '已锁定' : '需要导入';
    presetLock.querySelector('.acs-fixed-resource-copy small').textContent = presetReady
        ? '创作台始终读取这份预设，不跟随主界面当前选择。'
        : `请先在 SillyTavern 导入 ${FIXED_PRESET_NAME}，然后重新打开创作台。`;
    fillSelect(worldbookSelect, environment.worldbookNames, environment.worldbookName, '未找到可用世界书');
}

function fillSelect(select, items, selected, emptyLabel) {
    select.replaceChildren();
    if (!items.length) {
        const option = new Option(emptyLabel, '');
        option.disabled = true;
        option.selected = true;
        select.add(option);
        syncStyledSelect(select);
        return;
    }
    for (const item of items) {
        select.add(new Option(item, item, false, item === selected));
    }
    syncStyledSelect(select);
}

function closeStyledSelects(except = null) {
    if (!shell) return;
    for (const widget of shell.querySelectorAll('.acs-styled-select.is-open')) {
        if (widget === except) continue;
        widget.classList.remove('is-open', 'opens-up');
        widget.querySelector('.acs-select-trigger').setAttribute('aria-expanded', 'false');
        widget.querySelector('.acs-select-options').hidden = true;
    }
}

function syncStyledSelect(select) {
    const widget = select?.nextElementSibling;
    if (!widget?.classList.contains('acs-styled-select')) return;
    const trigger = widget.querySelector('.acs-select-trigger');
    const value = widget.querySelector('.acs-select-value');
    const optionsPanel = widget.querySelector('.acs-select-options');
    const selectedOption = select.selectedOptions?.[0];
    value.textContent = selectedOption?.textContent || '请选择';
    trigger.disabled = select.disabled || ![...select.options].some(option => !option.disabled);
    optionsPanel.replaceChildren();

    for (const option of select.options) {
        if (option.disabled) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `acs-select-option${option.value === select.value ? ' is-selected' : ''}`;
        button.dataset.selectValue = option.value;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.value === select.value));
        const copy = document.createElement('span');
        copy.textContent = option.textContent;
        const check = document.createElement('i');
        check.className = option.value === select.value ? 'fa-solid fa-check' : '';
        check.setAttribute('aria-hidden', 'true');
        button.append(copy, check);
        optionsPanel.append(button);
    }
}

function toggleStyledSelect(widget, force) {
    const trigger = widget.querySelector('.acs-select-trigger');
    if (trigger.disabled) return;
    const opened = typeof force === 'boolean' ? force : !widget.classList.contains('is-open');
    closeStyledSelects(opened ? widget : null);
    widget.classList.toggle('is-open', opened);
    trigger.setAttribute('aria-expanded', String(opened));
    const options = widget.querySelector('.acs-select-options');
    options.hidden = !opened;
    if (!opened) {
        widget.classList.remove('opens-up');
        return;
    }
    const bounds = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(options.scrollHeight || 220, 250);
    widget.classList.toggle('opens-up', hostWindow.innerHeight - bounds.bottom < estimatedHeight + 18 && bounds.top > estimatedHeight);
}

function installStyledSelects() {
    for (const select of shell.querySelectorAll('#acs-custom-source, #acs-worldbook-select, #acs-person')) {
        if (select.nextElementSibling?.classList.contains('acs-styled-select')) continue;
        select.classList.add('acs-native-select');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        const labelText = select.closest('label')?.querySelector(':scope > span')?.textContent?.trim() || '选项';
        const widget = document.createElement('div');
        widget.className = 'acs-styled-select';
        const optionsId = `${select.id}-styled-options`;
        widget.innerHTML = `
          <button class="acs-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${optionsId}" aria-label="选择${labelText}">
            <span class="acs-select-value"></span>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
          <div id="${optionsId}" class="acs-select-options" role="listbox" hidden></div>`;
        select.insertAdjacentElement('afterend', widget);
        const trigger = widget.querySelector('.acs-select-trigger');
        trigger.addEventListener('click', event => {
            event.preventDefault();
            toggleStyledSelect(widget);
        });
        trigger.addEventListener('keydown', event => {
            if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
            event.preventDefault();
            toggleStyledSelect(widget, true);
            const selected = widget.querySelector('.acs-select-option.is-selected') || widget.querySelector('.acs-select-option');
            selected?.focus();
        });
        widget.querySelector('.acs-select-options').addEventListener('click', event => {
            const option = event.target.closest('[data-select-value]');
            if (!option) return;
            select.value = option.dataset.selectValue;
            select.dispatchEvent(new hostWindow.Event('change', { bubbles: true }));
            syncStyledSelect(select);
            toggleStyledSelect(widget, false);
            trigger.focus();
        });
        select.addEventListener('change', () => syncStyledSelect(select));
        syncStyledSelect(select);
    }
}

function renderStepRail() {
    const rail = shell.querySelector('#acs-step-rail');
    rail.replaceChildren();

    for (const phase of PHASES) {
        const phaseSteps = STEPS.filter(item => item.phase === phase.id);
        const completed = phaseSteps.filter(step => project.steps[step.number]?.status === 'accepted').length;
        const collapsed = project.ui.collapsedPhases.includes(phase.id);
        const section = document.createElement('section');
        section.className = 'acs-phase-group';
        section.dataset.phase = phase.id;
        section.classList.toggle('is-collapsed', collapsed);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'acs-phase-toggle';
        toggle.dataset.phaseToggle = phase.id;
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-controls', `acs-phase-${phase.id}`);
        toggle.innerHTML = `
            <span class="acs-phase-title">${phase.label}</span>
            <span class="acs-phase-progress">${completed}/${phaseSteps.length}</span>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        `;

        const steps = document.createElement('div');
        steps.id = `acs-phase-${phase.id}`;
        steps.className = 'acs-phase-steps';
        steps.hidden = collapsed;

        for (const step of phaseSteps) {
            const state = project.steps[step.number] || { status: 'idle' };
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'acs-step-button';
            button.dataset.step = String(step.number);
            button.title = `Step ${step.number} · ${step.name}`;
            button.setAttribute('aria-label', button.title);
            if (step.number === project.currentStep) button.classList.add('is-active');
            if (state.status === 'accepted') button.classList.add('is-complete');
            if (state.status === 'draft') button.classList.add('is-draft');

            const node = document.createElement('span');
            node.className = 'acs-step-node';
            if (state.status === 'accepted') node.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
            const name = document.createElement('span');
            name.className = 'acs-step-name';
            name.textContent = step.name;
            const number = document.createElement('span');
            number.className = 'acs-step-number';
            number.textContent = String(step.number).padStart(2, '0');
            button.append(node, name, number);
            steps.append(button);
        }
        section.append(toggle, steps);
        rail.append(section);
    }
}

function togglePhase(phaseId) {
    if (!PHASES.some(phase => phase.id === phaseId)) return;
    const collapsed = new Set(project.ui.collapsedPhases);
    collapsed.has(phaseId) ? collapsed.delete(phaseId) : collapsed.add(phaseId);
    project.ui.collapsedPhases = [...collapsed];
    saveProject();
    renderStepRail();
}

function revealStepPhase(stepNumber) {
    const phaseId = STEPS[stepNumber - 1]?.phase;
    if (!phaseId || !project.ui.collapsedPhases.includes(phaseId)) return;
    project.ui.collapsedPhases = project.ui.collapsedPhases.filter(id => id !== phaseId);
}

function getAutoPresetSafe() {
    try {
        return helper && environment.presetName ? helper.getPreset(environment.presetName) : null;
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 无法读取用于回复渲染的预设。', error);
        return null;
    }
}

function normalizeResponseRegex(script) {
    if (!script || script.findRegex !== undefined) return script;
    return {
        id: script.id,
        scriptName: script.script_name,
        disabled: !script.enabled,
        findRegex: script.find_regex,
        replaceString: script.replace_string ?? '',
        trimStrings: script.trim_strings || [],
        placement: script.source?.ai_output ? [2] : [],
        markdownOnly: Boolean(script.destination?.display),
        promptOnly: Boolean(script.destination?.prompt),
    };
}

function shouldRunResponseRegex(script, mode) {
    if (!script || script.disabled || !script.findRegex) return false;
    const placements = Array.isArray(script.placement) ? script.placement.map(Number) : [];
    if (!placements.includes(2)) return false;
    if (mode === 'markdown') return Boolean(script.markdownOnly);
    if (mode === 'prompt') return Boolean(script.promptOnly);
    return !script.markdownOnly && !script.promptOnly;
}

function runSingleResponseRegex(script, text) {
    let result = String(text || '');
    for (const trimString of script.trimStrings || []) {
        result = result.replaceAll(trimString, '');
    }
    const regex = globalThis.builtin?.parseRegexFromString?.(script.findRegex);
    if (!regex) throw new Error(`无法解析正则：${script.findRegex}`);
    return result.replace(regex, script.replaceString ?? '');
}

function getResponseRegexes() {
    const regexGetter = globalThis.getTavernRegexes || hostWindow.getTavernRegexes;
    if (typeof regexGetter !== 'function') return [];
    const globalScripts = regexGetter({ type: 'global' }) || [];
    const characterScripts = regexGetter({ type: 'character', name: 'current' }) || [];
    const presetScripts = environment.presetName
        ? regexGetter({ type: 'preset', name: environment.presetName }) || []
        : [];
    return [...globalScripts, ...characterScripts, ...presetScripts].map(normalizeResponseRegex);
}

function runResponseRegexPass(text, _preset, mode) {
    let result = String(text || '');
    for (const script of getResponseRegexes()) {
        if (!shouldRunResponseRegex(script, mode)) continue;
        try {
            result = runSingleResponseRegex(script, result);
        } catch (error) {
            console.warn(`[A.U.T.O Card Studio] 回复正则执行失败：${script.scriptName || '未命名正则'}`, error);
        }
    }
    return result;
}

function formatResponseWithTavernRegex(rawResponse, destination, preset) {
    const formatter = globalThis.formatAsTavernRegexedString || hostWindow.formatAsTavernRegexedString;
    if (typeof formatter === 'function') {
        try {
            // 使用酒馆助手的官方处理链，自动遵循全局、角色与当前预设的正则范围设置。
            return formatter(String(rawResponse || ''), 'ai_output', destination);
        } catch (error) {
            console.warn('[A.U.T.O Card Studio] 官方正则接口执行失败，改用兼容处理流程。', error);
        }
    }

    const outputProcessed = runResponseRegexPass(rawResponse, preset, 'output');
    const fallbackMode = destination === 'display' ? 'markdown' : 'prompt';
    return runResponseRegexPass(outputProcessed, preset, fallbackMode);
}

function responseForDisplay(rawResponse, preset) {
    return formatResponseWithTavernRegex(rawResponse, 'display', preset);
}

function responseForPrompt(rawResponse, preset) {
    return formatResponseWithTavernRegex(rawResponse, 'prompt', preset);
}

function normalizeCodeLanguage(value) {
    const language = String(value || '').trim().toLowerCase();
    const aliases = {
        js: 'JAVASCRIPT',
        javascript: 'JAVASCRIPT',
        ts: 'TYPESCRIPT',
        typescript: 'TYPESCRIPT',
        py: 'PYTHON',
        python: 'PYTHON',
        yml: 'YAML',
        yaml: 'YAML',
        json: 'JSON',
        html: 'HTML',
        xml: 'XML',
        css: 'CSS',
        scss: 'SCSS',
        sql: 'SQL',
        md: 'MARKDOWN',
        markdown: 'MARKDOWN',
        sh: 'SHELL',
        bash: 'SHELL',
        shell: 'SHELL',
        ejs: 'EJS',
    };
    return aliases[language] || language.toUpperCase() || '代码';
}

function detectCodeLanguage(code) {
    const declaredClass = [...code.classList].find(name => name.startsWith('language-'));
    if (declaredClass) return normalizeCodeLanguage(declaredClass.slice('language-'.length));

    const source = code.textContent.trim();
    if (!source) return '代码';

    if (/^<%[=-]?|<%[\s\S]*%>/.test(source)) return 'EJS';
    if (/^<!doctype\s+html|^<html\b|^<(?:head|body|main|section|article|div|script|style)\b/i.test(source)) return 'HTML';
    if (/^<[A-Za-z_][\w:.-]*(?:\s|>)/.test(source) && /<\/[A-Za-z_][\w:.-]*>/.test(source)) return 'XML';

    try {
        JSON.parse(source);
        return 'JSON';
    } catch {
        // 不是合法 JSON 时继续进行轻量特征识别。
    }

    if (/^(?:from\s+\S+\s+import|import\s+\S+|def\s+\w+\s*\(|class\s+\w+.*:)|\bprint\s*\(/m.test(source)) return 'PYTHON';
    if (/\b(?:const|let|var)\s+\w+|\bfunction\s+\w+\s*\(|=>|console\.(?:log|warn|error)\s*\(/m.test(source)) return 'JAVASCRIPT';
    if (/^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/im.test(source)) return 'SQL';
    if (/^(?:---\s*$|[\w.'"-]+:\s*\S+)/m.test(source)
        && (source.match(/^[\w.'"-]+:\s*.*$/gm) || []).length >= 2) return 'YAML';
    if (/^(?:#{1,6}\s|[-*+]\s|\d+\.\s)|\[[^\]]+\]\([^)]+\)/m.test(source)) return 'MARKDOWN';
    if (/^[.#]?[\w-]+(?:\s+[.#]?[\w-]+)*\s*\{[\s\S]*:[^;{}]+;/m.test(source)) return 'CSS';
    if (/^#!.*\b(?:bash|sh)\b|^(?:export\s+\w+=|(?:npm|pnpm|yarn|git|curl)\s+)/m.test(source)) return 'SHELL';
    return '代码';
}

function decorateResponseCodeBlocks(element) {
    for (const code of element.querySelectorAll('pre > code')) {
        const pre = code.parentElement;
        // AUTO 的说明区使用代码围栏承载普通文字，不将它误标为代码产物。
        if (pre.closest('details')) continue;
        const language = detectCodeLanguage(code);
        const details = document.createElement('details');
        details.className = 'acs-code-block';
        details.open = true;
        details.dataset.codeLanguage = language;

        const summary = document.createElement('summary');
        summary.setAttribute('aria-label', `${language} 代码块，点击折叠或展开`);
        const type = document.createElement('span');
        type.textContent = language;
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down';
        icon.setAttribute('aria-hidden', 'true');
        summary.append(type, icon);

        pre.classList.add('acs-code-content');
        pre.before(details);
        details.append(summary, pre);
    }
}

function sanitizeRenderedHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('script, iframe, object, embed, link, meta').forEach(node => node.remove());
    template.content.querySelectorAll('*').forEach(node => {
        for (const attribute of [...node.attributes]) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
                node.removeAttribute(attribute.name);
            }
        }
    });
    return template.innerHTML;
}

function renderAssistantResponse(element, rawResponse, preset) {
    const displayText = responseForDisplay(rawResponse, preset);
    const rendered = globalThis.builtin?.renderMarkdown?.(displayText)
        ?? String(displayText).replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]).replace(/\n/g, '<br>');
    element.innerHTML = sanitizeRenderedHtml(rendered);
    decorateResponseCodeBlocks(element);
}

function renderCurrentStep() {
    const step = STEPS[project.currentStep - 1];
    const guide = STEP_GUIDES[step.number - 1];
    const state = project.steps[step.number];
    shell.querySelector('#acs-step-kicker').textContent = `PHASE ${String(step.number).padStart(2, '0')} / 30`;
    shell.querySelector('#acs-step-title').textContent = step.name;
    shell.querySelector('#acs-step-goal').textContent = step.goal;

    // 空白状态也是创作向导：切换步骤时同步刷新，而不是沿用第一站文案。
    shell.querySelector('#acs-empty-kicker').textContent = `STATION ${String(step.number).padStart(2, '0')} · 创作航标`;
    shell.querySelector('#acs-empty-title').textContent = guide.title;
    shell.querySelector('#acs-empty-description').textContent = guide.description;
    const guidePrompts = shell.querySelector('#acs-empty-prompts');
    guidePrompts.replaceChildren();
    for (const prompt of guide.prompts) {
        const item = document.createElement('li');
        item.textContent = prompt;
        guidePrompts.append(item);
    }
    shell.querySelector('#acs-user-input-label').textContent = `本轮补充 · ${step.name}`;
    shell.querySelector('#acs-user-input').placeholder = guide.placeholder;

    const stateChip = shell.querySelector('#acs-step-state');
    stateChip.classList.remove('is-draft', 'is-complete');
    if (state.status === 'accepted') {
        stateChip.textContent = '已确认';
        stateChip.classList.add('is-complete');
    } else if (state.status === 'draft') {
        stateChip.textContent = '待确认';
        stateChip.classList.add('is-draft');
    } else {
        stateChip.textContent = '未开始';
    }

    const turns = shell.querySelector('#acs-turns');
    turns.replaceChildren();
    const hasTurns = Array.isArray(state.turns) && state.turns.length > 0;
    const responsePreset = hasTurns ? getAutoPresetSafe() : null;
    let latestUserIndex = -1;
    for (let index = state.turns.length - 1; index >= 0; index -= 1) {
        if (state.turns[index].role === 'user') {
            latestUserIndex = index;
            break;
        }
    }
    shell.querySelector('#acs-empty-turns').hidden = hasTurns;
    for (const [turnIndex, turn] of (state.turns || []).entries()) {
        const article = document.createElement('article');
        article.className = `acs-turn ${turn.role === 'user' ? 'is-user' : 'is-assistant'}`;
        const label = document.createElement('div');
        label.className = 'acs-turn-label';
        const labelText = document.createElement('span');
        labelText.textContent = turn.role === 'user' ? '你的补充' : project.preferences.aiRole || 'A.U.T.O.';
        label.append(labelText);
        if (turn.role === 'user' && turnIndex === latestUserIndex) {
            const retry = document.createElement('button');
            retry.className = 'acs-turn-retry';
            retry.type = 'button';
            retry.dataset.retryTurn = String(turnIndex);
            retry.disabled = isGenerating;
            retry.title = '重新生成这条输入';
            retry.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i><span>重试</span>';
            label.append(retry);
        }
        const content = document.createElement(turn.role === 'user' ? 'pre' : 'div');
        content.className = 'acs-turn-content';
        if (turn.role === 'user') {
            content.textContent = turn.content;
        } else {
            renderAssistantResponse(content, turn.content, responsePreset);
        }
        article.append(label, content);
        turns.append(article);
    }

    const dependencyMessage = generationDependencyMessage();
    const generateButton = shell.querySelector('#acs-generate');
    shell.querySelector('#acs-accept-step').disabled = !latestAssistantResponse(step.number) || isGenerating;
    generateButton.disabled = isGenerating || Boolean(dependencyMessage);
    generateButton.title = dependencyMessage || '使用 A.U.T.O 预设生成本阶段草案';
    shell.querySelector('#acs-generation-hint').textContent = dependencyMessage || (state.turns?.length
        ? `会带上修改要求与各步骤正式产物继续生成 · ${connectionDisplayName()}`
        : `可留空生成；本阶段将整理「${step.name}」 · ${connectionDisplayName()}`);

    requestAnimationFrame(() => {
        const conversation = shell.querySelector('.acs-conversation');
        conversation.scrollTop = conversation.scrollHeight;
    });
}

function renderProgress() {
    const completed = STEPS.filter(step => project.steps[step.number]?.status === 'accepted').length;
    const percent = Math.round((completed / STEPS.length) * 100);
    shell.querySelector('#acs-progress-copy').textContent = `${completed} / ${STEPS.length}`;
    shell.querySelector('#acs-progress-percent').textContent = `${percent}%`;
    shell.querySelector('#acs-progress-bar').style.width = `${percent}%`;
}

function collectArtifactGroups() {
    const groups = new Map();
    for (const step of STEPS) {
        const state = project.steps[step.number];
        const sources = [
            ...(state?.artifactHistory || []).map((turn, turnIndex) => ({ turn, turnIndex, archived: true })),
            ...(state?.turns || []).map((turn, turnIndex) => ({ turn, turnIndex, archived: false })),
        ];
        for (const { turn, turnIndex, archived } of sources) {
            if (turn.role !== 'assistant') continue;
            const blocks = extractArtifactBlocks(turn.content, step.number);
            blocks.forEach((block, blockIndex) => {
                // 同名代码类型可能在不同步骤代表不同产物，历史版本只在当前步骤内合并。
                const identity = resolveArtifactIdentity(step.number, block, blocks);
                const groupKey = `${step.number}:${identity}`;
                if (!groups.has(groupKey)) groups.set(groupKey, { tag: identity, versions: [] });
                groups.get(groupKey).versions.push({
                    ...block,
                    identity,
                    blockIndex,
                    turnIndex,
                    archived,
                    step: step.number,
                    accepted: project.steps[step.number].status === 'accepted',
                    createdAt: turn.createdAt || project.steps[step.number].updatedAt || '',
                });
            });
        }
    }
    return [...groups.values()];
}

function showArtifactVersion(details, requestedIndex) {
    const group = renderedArtifactGroups[Number(details.dataset.artifactGroup)];
    if (!group) return;
    const index = Math.max(0, Math.min(Number(requestedIndex), group.versions.length - 1));
    const version = group.versions[index];
    const isLatest = index === group.versions.length - 1;
    const content = details.querySelector('.acs-artifact-content');
    const step = details.querySelector('.acs-artifact-step');
    const saveState = details.querySelector('.acs-artifact-save-state');

    content.value = version.content;
    content.readOnly = !isLatest;
    content.dataset.artifactVersion = String(index);
    content.dataset.artifactStep = String(version.step);
    content.dataset.artifactTurn = String(version.turnIndex);
    content.dataset.artifactArchived = String(version.archived);
    content.dataset.artifactIndex = String(version.blockIndex);
    content.dataset.savedContent = version.content;
    step.textContent = `S${String(version.step).padStart(2, '0')}${version.accepted ? ' · 已确认' : ' · 草案'}`;
    updateArtifactTokenMetric(details, version.content);
    saveState.textContent = isLatest ? '当前版本 · 可编辑' : '历史版本 · 只读';
    saveState.classList.remove('is-pending');
    details.querySelector('[data-artifact-version-label]').textContent = `${index + 1} / ${group.versions.length}`;
    details.querySelector('[data-artifact-history="previous"]').disabled = index <= 0;
    details.querySelector('[data-artifact-history="next"]').disabled = index >= group.versions.length - 1;
    details.querySelector('[data-restore-artifact]').hidden = isLatest;
}

// 优先使用 SillyTavern 当前 tokenizer；只有接口不可用时才显示带“≈”的估算值。
function estimateTokenCount(text) {
    const source = String(text || '');
    const cjkCount = (source.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
    const remaining = source.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, '');
    return cjkCount + Math.ceil(remaining.length / 4);
}

async function measureTokenCount(text) {
    const source = String(text || '');
    try {
        const counter = hostWindow.SillyTavern?.getContext?.().getTokenCountAsync;
        if (typeof counter === 'function') {
            const count = await counter(source, 0);
            if (Number.isFinite(count)) return { count: Math.max(0, Math.round(count)), approximate: false };
        }
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] Token 统计失败，将显示估算值。', error);
    }
    return { count: estimateTokenCount(source), approximate: true };
}

function formatTokenMetric(metric) {
    return `${metric.approximate ? '≈' : ''}${metric.count.toLocaleString()} tokens`;
}

async function updateArtifactTokenMetric(details, content) {
    const target = details?.querySelector('[data-artifact-token-count]');
    if (!target) return;
    const requestId = String((Number(details.dataset.tokenRequestId) || 0) + 1);
    details.dataset.tokenRequestId = requestId;
    target.textContent = '统计中…';
    const metric = await measureTokenCount(content);
    if (!details.isConnected || details.dataset.tokenRequestId !== requestId) return;
    target.textContent = formatTokenMetric(metric);
    target.title = metric.approximate
        ? '当前 tokenizer 暂不可用，这是估算值'
        : '按 SillyTavern 当前 tokenizer 统计';
}

function artifactGroupMatchesFilter(group) {
    const artifact = group.versions.at(-1);
    const step = STEPS[artifact.step - 1];
    if (artifactFilterScope === 'current' && artifact.step !== project.currentStep) return false;
    if (!['all', 'current'].includes(artifactFilterScope) && step?.phase !== artifactFilterScope) return false;

    const query = artifactFilterQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    const haystack = `${group.tag} ${step?.name || ''} step ${artifact.step} s${String(artifact.step).padStart(2, '0')}`
        .toLocaleLowerCase();
    return haystack.includes(query);
}

function syncArtifactFilterControls() {
    for (const button of shell.querySelectorAll('[data-artifact-scope]')) {
        const active = button.dataset.artifactScope === artifactFilterScope;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
    }
    const search = shell.querySelector('#acs-artifact-search');
    if (search && search.value !== artifactFilterQuery) search.value = artifactFilterQuery;
}

function renderArtifacts() {
    const list = shell.querySelector('#acs-artifact-list');
    const allArtifactGroups = collectArtifactGroups();
    renderedArtifactGroups = allArtifactGroups.filter(artifactGroupMatchesFilter);
    syncArtifactFilterControls();

    list.replaceChildren();
    shell.querySelector('#acs-block-count').textContent = renderedArtifactGroups.length === allArtifactGroups.length
        ? `${allArtifactGroups.length} 个产物`
        : `${renderedArtifactGroups.length} / ${allArtifactGroups.length} 个产物`;
    if (!renderedArtifactGroups.length) {
        const empty = document.createElement('div');
        empty.className = 'acs-artifact-empty';
        empty.textContent = allArtifactGroups.length
            ? '没有符合当前筛选条件的产物。可以切换范围或清空搜索词。'
            : '生成阶段草案后，A.U.T.O 规定的最终产物会在这里出现。';
        list.append(empty);
        return;
    }

    for (const [groupIndex, group] of renderedArtifactGroups.entries()) {
        const artifact = group.versions.at(-1);
        const details = document.createElement('details');
        details.className = 'acs-artifact';
        details.dataset.artifactGroup = String(groupIndex);
        if (renderedArtifactGroups.length === 1) details.open = true;
        const summary = document.createElement('summary');
        const head = document.createElement('span');
        head.className = 'acs-artifact-head';
        const name = document.createElement('span');
        name.className = 'acs-artifact-name';
        name.textContent = group.tag;
        const step = document.createElement('span');
        step.className = 'acs-artifact-step';
        step.textContent = `S${String(artifact.step).padStart(2, '0')}${artifact.accepted ? ' · 已确认' : ' · 草案'}`;
        const meta = document.createElement('span');
        meta.className = 'acs-artifact-meta';
        const tokenCount = document.createElement('span');
        tokenCount.className = 'acs-artifact-token-count';
        tokenCount.dataset.artifactTokenCount = '';
        tokenCount.textContent = '统计中…';
        meta.append(step, tokenCount);
        head.append(name, meta);
        summary.append(head);

        const editor = document.createElement('div');
        editor.className = 'acs-artifact-editor';
        const toolbar = document.createElement('div');
        toolbar.className = 'acs-artifact-toolbar';
        const saveState = document.createElement('span');
        saveState.className = 'acs-artifact-save-state';
        saveState.textContent = '当前版本 · 可编辑';
        const actions = document.createElement('span');
        actions.className = 'acs-artifact-toolbar-actions';
        const history = document.createElement('span');
        history.className = 'acs-artifact-history';
        history.innerHTML = `
            <button class="acs-artifact-history-button" type="button" data-artifact-history="previous" title="查看上一版本">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <span data-artifact-version-label>${group.versions.length} / ${group.versions.length}</span>
            <button class="acs-artifact-history-button" type="button" data-artifact-history="next" title="查看下一版本" disabled>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>`;
        const restore = document.createElement('button');
        restore.type = 'button';
        restore.className = 'acs-artifact-action acs-artifact-restore';
        restore.dataset.restoreArtifact = '';
        restore.hidden = true;
        restore.innerHTML = '<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>恢复此版</span>';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'acs-artifact-action';
        copy.dataset.copyArtifact = '';
        copy.title = '复制这个区块';
        copy.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i><span>复制</span>';
        actions.append(history, restore, copy);
        toolbar.append(saveState, actions);

        const content = document.createElement('textarea');
        content.className = 'acs-artifact-content';
        content.value = artifact.content;
        content.spellcheck = false;
        content.dataset.artifactGroup = String(groupIndex);
        content.dataset.artifactVersion = String(group.versions.length - 1);
        content.dataset.artifactStep = String(artifact.step);
        content.dataset.artifactTurn = String(artifact.turnIndex);
        content.dataset.artifactArchived = String(artifact.archived);
        content.dataset.artifactIndex = String(artifact.blockIndex);
        content.dataset.savedContent = artifact.content;
        content.setAttribute('aria-label', `${artifact.tag} 区块内容`);
        editor.append(toolbar, content);
        details.append(summary, editor);
        list.append(details);
        updateArtifactTokenMetric(details, artifact.content);
    }
}

function saveArtifactEdit(textarea) {
    if (textarea.readOnly || textarea.dataset.artifactArchived === 'true') return false;
    const stepNumber = Number(textarea.dataset.artifactStep);
    const turnIndex = Number(textarea.dataset.artifactTurn);
    const blockIndex = Number(textarea.dataset.artifactIndex);
    const timerKey = `${stepNumber}:${turnIndex}:${blockIndex}`;
    clearTimeout(artifactSaveTimers.get(timerKey));
    artifactSaveTimers.delete(timerKey);
    const turn = project.steps[stepNumber]?.turns?.[turnIndex];
    if (!turn || turn.role !== 'assistant') return false;

    const source = turn.content;
    const currentBlock = extractArtifactBlocks(source, stepNumber)[blockIndex];
    if (!currentBlock) return false;

    turn.content = `${source.slice(0, currentBlock.start)}${textarea.value}${source.slice(currentBlock.end)}`;
    turn.editedAt = new Date().toISOString();
    project.steps[stepNumber].updatedAt = turn.editedAt;
    textarea.dataset.savedContent = textarea.value;
    const group = renderedArtifactGroups[Number(textarea.dataset.artifactGroup)];
    const version = group?.versions?.[Number(textarea.dataset.artifactVersion)];
    if (version) version.content = textarea.value;
    saveProject();
    updateArtifactTokenMetric(textarea.closest('.acs-artifact'), textarea.value);

    const state = textarea.closest('.acs-artifact-editor')?.querySelector('.acs-artifact-save-state');
    if (state) {
        state.textContent = `已保存 · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        state.classList.remove('is-pending');
    }
    return true;
}

function scheduleArtifactSave(textarea) {
    if (textarea.readOnly) return;
    const key = `${textarea.dataset.artifactStep}:${textarea.dataset.artifactTurn}:${textarea.dataset.artifactIndex}`;
    clearTimeout(artifactSaveTimers.get(key));
    const state = textarea.closest('.acs-artifact-editor')?.querySelector('.acs-artifact-save-state');
    if (state) {
        state.textContent = '正在保存…';
        state.classList.add('is-pending');
    }
    artifactSaveTimers.set(key, setTimeout(() => {
        saveArtifactEdit(textarea);
        artifactSaveTimers.delete(key);
    }, 360));
}

function flushPendingProjectEdits() {
    if (shell) {
        for (const textarea of shell.querySelectorAll('.acs-artifact-content')) {
            const key = `${textarea.dataset.artifactStep}:${textarea.dataset.artifactTurn}:${textarea.dataset.artifactIndex}`;
            if (artifactSaveTimers.has(key)) saveArtifactEdit(textarea);
        }
    }
    for (const timer of artifactSaveTimers.values()) hostWindow.clearTimeout(timer);
    artifactSaveTimers.clear();
    saveProject();
}

function moveArtifactHistory(button) {
    const details = button.closest('.acs-artifact');
    const content = details?.querySelector('.acs-artifact-content');
    if (!details || !content) return;
    const current = Number(content.dataset.artifactVersion);
    const direction = button.dataset.artifactHistory === 'previous' ? -1 : 1;
    showArtifactVersion(details, current + direction);
}

function restoreArtifactVersion(button) {
    const details = button.closest('.acs-artifact');
    const group = renderedArtifactGroups[Number(details?.dataset.artifactGroup)];
    const content = details?.querySelector('.acs-artifact-content');
    const selectedIndex = Number(content?.dataset.artifactVersion);
    const selected = group?.versions?.[selectedIndex];
    const current = group?.versions?.at(-1);
    if (!selected || !current || selected === current) return;

    flushPendingProjectEdits();
    const state = project.steps[current.step];
    const sourceTurn = state?.turns?.[current.turnIndex];
    const currentBlock = sourceTurn ? extractArtifactBlocks(sourceTurn.content, current.step)[current.blockIndex] : null;
    if (!sourceTurn || !currentBlock) {
        notify('error', '无法定位当前产物，未执行版本恢复。');
        return;
    }

    // 复制当前完整回复并替换指定区块，既保留其他产物，也让回退本身成为一个新的历史版本。
    const restoredResponse = `${sourceTurn.content.slice(0, currentBlock.start)}${selected.content}${sourceTurn.content.slice(currentBlock.end)}`;
    const now = new Date().toISOString();
    state.turns.push({
        role: 'assistant',
        content: restoredResponse,
        createdAt: now,
        artifactRestore: { tag: group.tag, fromVersion: selectedIndex + 1 },
    });
    state.status = 'draft';
    state.updatedAt = now;
    saveProject();
    renderAll();
    notify('success', `${group.tag} 已恢复为历史版本 ${selectedIndex + 1}，原版本仍保留。`);
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
}

async function copyArtifact(button) {
    const textarea = button.closest('.acs-artifact-editor')?.querySelector('.acs-artifact-content');
    if (!textarea) return;
    try {
        await copyText(textarea.value);
        button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i><span>已复制</span>';
        setTimeout(() => {
            button.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i><span>复制</span>';
        }, 1400);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 复制产物失败', error);
        notify('error', '复制失败，请选中文本后使用 Ctrl+C。');
    }
}

function toggleArtifactPanel(force) {
    artifactPanelExpanded = typeof force === 'boolean' ? force : !artifactPanelExpanded;
    const inspector = shell.querySelector('.acs-inspector');
    const button = shell.querySelector('#acs-expand-artifacts');
    inspector.classList.toggle('is-expanded', artifactPanelExpanded);
    button.classList.toggle('is-active', artifactPanelExpanded);
    button.setAttribute('aria-pressed', String(artifactPanelExpanded));
    button.title = artifactPanelExpanded ? '收回产物工作区' : '放大产物工作区';
    button.querySelector('i').className = artifactPanelExpanded
        ? 'fa-solid fa-compress'
        : 'fa-solid fa-expand';
}

function renderProjectFields() {
    shell.querySelector('#acs-project-name').value = project.name;
    shell.querySelector('#acs-project-brief').value = project.brief;
    shell.querySelector('#acs-ai-role').value = project.preferences.aiRole;
    shell.querySelector('#acs-creator-role').value = project.preferences.creatorRole;
    shell.querySelector('#acs-word-count').value = project.preferences.wordCount;
    shell.querySelector('#acs-language').value = project.preferences.language;
    shell.querySelector('#acs-person').value = project.preferences.person;
    syncStyledSelect(shell.querySelector('#acs-person'));
    shell.querySelector('#acs-character-name').value = project.output.characterName;
    shell.querySelector('#acs-output-worldbook').value = project.output.worldbookName || defaultOutputWorldbookName();
    renderConnectionSettings();
}

function projectProgress(projectItem) {
    return STEPS.filter(step => projectItem.steps?.[step.number]?.status === 'accepted').length;
}

function formatProjectTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return '刚刚更新';
    return date.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function renderProjectMenu() {
    const list = shell?.querySelector('#acs-project-list');
    if (!list) return;
    const projects = [...projectLibrary.projects].sort((left, right) =>
        String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')),
    );
    shell.querySelector('#acs-project-menu-count').textContent = `${projects.length} 个项目`;
    list.replaceChildren();

    for (const item of projects) {
        const row = document.createElement('div');
        row.className = `acs-project-row${item.id === project.id ? ' is-current' : ''}`;

        const switchButton = document.createElement('button');
        switchButton.className = 'acs-project-switch';
        switchButton.type = 'button';
        switchButton.dataset.projectId = item.id;
        switchButton.title = item.id === project.id ? '当前项目' : `切换到 ${item.name}`;

        const name = document.createElement('strong');
        name.textContent = item.name || '未命名世界';
        const meta = document.createElement('small');
        meta.textContent = `已确认 ${projectProgress(item)}/${STEPS.length} · ${formatProjectTime(item.updatedAt)}`;
        switchButton.append(name, meta);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'acs-project-delete';
        deleteButton.type = 'button';
        deleteButton.dataset.deleteProject = item.id;
        deleteButton.title = `删除 ${item.name || '未命名世界'}`;
        deleteButton.setAttribute('aria-label', deleteButton.title);
        deleteButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        row.append(switchButton, deleteButton);
        list.append(row);
    }
}

function installProjectLibraryUI() {
    const identity = shell.querySelector('.acs-project-identity');
    const icon = identity.querySelector('.acs-project-title-icon');
    icon.removeAttribute('aria-hidden');
    icon.setAttribute('role', 'button');
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('title', '打开项目库');
    icon.setAttribute('aria-label', '打开项目库');
    icon.setAttribute('aria-expanded', 'false');
    icon.setAttribute('aria-controls', 'acs-project-menu');

    const menu = document.createElement('section');
    menu.id = 'acs-project-menu';
    menu.className = 'acs-project-menu';
    menu.hidden = true;
    menu.innerHTML = `
      <div class="acs-project-menu-head">
        <strong>项目库</strong>
        <span id="acs-project-menu-count" class="acs-project-menu-count"></span>
      </div>
      <div id="acs-project-list" class="acs-project-list" role="list"></div>
      <div class="acs-project-menu-foot">
        <button id="acs-project-menu-new" class="acs-project-menu-new" type="button">
          <i class="fa-solid fa-plus" aria-hidden="true"></i>新建项目
        </button>
      </div>`;
    identity.append(menu);
}

function installStudioToolsUI() {
    const composerButtons = shell.querySelector('.acs-composer-actions > div');
    if (!shell.querySelector('#acs-preview-prompt')) {
        const previewButton = document.createElement('button');
        previewButton.id = 'acs-preview-prompt';
        previewButton.className = 'acs-button acs-prompt-preview-launch';
        previewButton.type = 'button';
        previewButton.title = '查看本轮将发送给 AI 的完整内容';
        previewButton.innerHTML = '<i class="fa-solid fa-list-check" aria-hidden="true"></i><span>查看提示词</span>';
        composerButtons.prepend(previewButton);
    }

    if (!shell.querySelector('#acs-prompt-preview')) {
        shell.insertAdjacentHTML('beforeend', PROMPT_PREVIEW_HTML);
    }

    const artifactList = shell.querySelector('#acs-artifact-list');
    if (!shell.querySelector('#acs-artifact-filters')) {
        const filters = document.createElement('div');
        filters.id = 'acs-artifact-filters';
        filters.className = 'acs-artifact-filters';
        filters.innerHTML = `
          <div class="acs-artifact-filter-scopes" role="toolbar" aria-label="筛选产物范围">
            <button class="acs-artifact-filter-button is-active" type="button" data-artifact-scope="all">全部</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="current">当前步骤</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="foundation">I 核心</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="narrative">II 叙事</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="variables">III 变量</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="production">IV 装配</button>
          </div>
          <label class="acs-artifact-search-wrap">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <span class="acs-visually-hidden">搜索产物名称或步骤</span>
            <input id="acs-artifact-search" class="acs-artifact-search" type="search" placeholder="搜索产物或步骤…" autocomplete="off">
          </label>`;
        artifactList.before(filters);
    }
}

function toggleProjectMenu(force) {
    const menu = shell.querySelector('#acs-project-menu');
    const icon = shell.querySelector('.acs-project-title-icon');
    const opened = typeof force === 'boolean' ? force : !menu.classList.contains('is-open');
    if (projectMenuCloseTimer) {
        hostWindow.clearTimeout(projectMenuCloseTimer);
        projectMenuCloseTimer = null;
    }
    icon.setAttribute('aria-expanded', String(opened));
    icon.setAttribute('title', opened ? '收起项目库' : '打开项目库');
    icon.setAttribute('aria-label', opened ? '收起项目库' : '打开项目库');
    icon.querySelector('i').className = opened ? 'fa-solid fa-folder-open' : 'fa-solid fa-folder';
    if (opened) {
        renderProjectMenu();
        menu.hidden = false;
        // 强制建立收起态，再触发 class 过渡，避免浏览器把两帧合并成突然出现。
        void menu.offsetHeight;
        menu.classList.add('is-open');
        return;
    }
    menu.classList.remove('is-open');
    projectMenuCloseTimer = hostWindow.setTimeout(() => {
        if (!menu.classList.contains('is-open')) menu.hidden = true;
        projectMenuCloseTimer = null;
    }, 220);
}

function syncEnvironmentToProject() {
    environment.presetName = project.presetName || choosePresetName(environment.presetNames);
    environment.worldbookName = project.sourceWorldbookName || chooseWorldbookName(environment.worldbookNames);
    project.presetName = environment.presetName;
    project.sourceWorldbookName = environment.worldbookName;
}

function switchProject(projectId) {
    if (isGenerating) {
        notify('warning', '请先停止当前生成，再切换项目。');
        return;
    }
    if (projectId === project.id) {
        toggleProjectMenu(false);
        return;
    }
    const nextProject = projectLibrary.projects.find(item => item.id === projectId);
    if (!nextProject) return;
    flushPendingProjectEdits();
    project = nextProject;
    projectLibrary.activeProjectId = project.id;
    syncEnvironmentToProject();
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    saveProject();
    renderEnvironmentSelectors();
    renderAll();
    toggleProjectMenu(false);
    notify('success', `已切换到“${project.name}”。`);
}

function deleteProject(projectId) {
    if (isGenerating) {
        notify('warning', '请先停止当前生成，再删除项目。');
        return;
    }
    const target = projectLibrary.projects.find(item => item.id === projectId);
    if (!target) return;
    if (!hostWindow.confirm(`删除项目“${target.name}”？\n\n本地项目内容将被永久删除，此操作无法撤销。`)) return;

    for (const timer of artifactSaveTimers.values()) hostWindow.clearTimeout(timer);
    artifactSaveTimers.clear();
    if (target.id !== project.id) saveProject();
    projectLibrary.projects = projectLibrary.projects.filter(item => item.id !== target.id);
    if (!projectLibrary.projects.length) projectLibrary.projects.push(createDefaultProject());

    if (target.id === project.id) {
        project = [...projectLibrary.projects].sort((left, right) =>
            String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')),
        )[0];
        projectLibrary.activeProjectId = project.id;
        syncEnvironmentToProject();
        if (artifactPanelExpanded) toggleArtifactPanel(false);
        renderEnvironmentSelectors();
        renderAll();
    }
    saveProjectLibrary();
    renderProjectMenu();
    notify('success', `已删除“${target.name}”。`);
}

function connectionDisplayName() {
    if (connectionSettings.mode === 'current') return '当前 ST 连接';
    return connectionSettings.model.trim() || '独立连接未完成';
}

function generationDependencyMessage() {
    if (!environment.checked) return '';
    if (!helper) return '未检测到酒馆助手，暂时不能调用 AI。';
    if (!environment.presetName) return `缺少 ${FIXED_PRESET_NAME}，请先在 SillyTavern 导入该预设，然后重新打开创作台。`;
    return '';
}

function renderConnectionSettings() {
    for (const radio of shell.querySelectorAll('input[name="acs-connection-mode"]')) {
        radio.checked = radio.value === connectionSettings.mode;
    }

    const isCustom = connectionSettings.mode === 'custom';
    shell.querySelector('#acs-custom-connection').hidden = !isCustom;
    shell.querySelector('#acs-custom-source').value = connectionSettings.source;
    syncStyledSelect(shell.querySelector('#acs-custom-source'));
    shell.querySelector('#acs-custom-api-url').value = connectionSettings.apiUrl;
    shell.querySelector('#acs-custom-api-key').value = customApiKey;
    shell.querySelector('#acs-custom-model').value = connectionSettings.model;

    const summary = shell.querySelector('#acs-connection-summary');
    summary.classList.toggle('is-custom', isCustom);
    summary.textContent = isCustom
        ? (connectionSettings.model.trim() || '等待配置')
        : '跟随 SillyTavern';
}

function renderAll() {
    renderProjectFields();
    renderOverviewState();
    renderStepRail();
    renderCurrentStep();
    renderProgress();
    renderArtifacts();
    renderProjectMenu();
}

function renderOverviewState() {
    const collapsed = Boolean(project.ui.overviewCollapsed);
    const stage = shell.querySelector('.acs-stage');
    const briefPanel = shell.querySelector('#acs-brief-panel');
    const button = shell.querySelector('#acs-toggle-overview');
    const icon = button.querySelector('i');

    stage.classList.toggle('is-overview-collapsed', collapsed);
    briefPanel.hidden = collapsed;
    button.setAttribute('aria-expanded', String(!collapsed));
    button.title = collapsed ? '展开创作概览' : '收起创作概览';
    button.querySelector('span').textContent = collapsed ? '展开概览' : '收起概览';
    icon.className = collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
}

function toggleOverview() {
    project.ui.overviewCollapsed = !project.ui.overviewCollapsed;
    saveProject();
    renderOverviewState();
}

function latestAssistantResponse(stepNumber) {
    return latestAssistantTurn(stepNumber)?.turn.content || '';
}

function latestAssistantTurn(stepNumber) {
    const turns = project.steps[stepNumber]?.turns || [];
    for (let index = turns.length - 1; index >= 0; index -= 1) {
        if (turns[index].role === 'assistant') return { turn: turns[index], index };
    }
    return null;
}

function allAssistantArtifactTurns(stepNumber) {
    const state = project.steps[stepNumber];
    return [...(state?.artifactHistory || []), ...(state?.turns || [])]
        .filter(turn => turn.role === 'assistant');
}

function sanitizeMacroValue(value) {
    return String(value || '').replace(/[{}\r\n]/g, '').trim();
}

// 角色卡模板变量应进入最终产物，不能被当前 SillyTavern 会话提前展开。
function protectTemplateMacros(text) {
    return String(text || '').replace(/\{\{\s*(char|user)\s*\}\}/gi, (match, name) => (
        TEMPLATE_MACRO_SENTINELS[name.toLowerCase()]
    ));
}

function restoreTemplateMacros(text) {
    let restored = String(text || '');
    for (const [name, sentinel] of Object.entries(TEMPLATE_MACRO_SENTINELS)) {
        restored = restored.replaceAll(sentinel, `{{${name}}}`);
    }
    return restored;
}

function repairExpandedCharacterMacro(text) {
    return restoreTemplateMacros(text).replaceAll('SillyTavern System', '{{char}}');
}

// 宏处理可能递归生成新的 {{char}}；因此在酒馆助手替换之后还要再次修复并保护。
function prepareTemplateMacrosForGeneration(text) {
    return protectTemplateMacros(repairExpandedCharacterMacro(text));
}

function repairProjectTemplateMacros(projectData) {
    for (const state of Object.values(projectData.steps || {})) {
        for (const collectionName of ['turns', 'artifactHistory']) {
            if (!Array.isArray(state?.[collectionName])) continue;
            for (const turn of state[collectionName]) {
                if (turn?.role === 'assistant' && typeof turn.content === 'string') {
                    turn.content = repairExpandedCharacterMacro(turn.content);
                }
            }
        }
    }
}

function customizeSettingsPrompt(content) {
    const replacements = {
        AI_role: project.preferences.aiRole,
        creator_role: project.preferences.creatorRole,
        word_count: project.preferences.wordCount,
        language: project.preferences.language,
        person: project.preferences.person,
    };
    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
        const pattern = new RegExp(`\\{\\{setvar::${key}::[\\s\\S]*?\\}\\}`, 'g');
        result = result.replace(pattern, `{{setvar::${key}::${sanitizeMacroValue(value)}}}`);
    }
    return result;
}

function buildProjectContext(currentStep, preset) {
    const sections = [
        '<STUDIO_PROJECT_CONTEXT>',
        `项目名称: ${project.name}`,
        `创作母题:\n${project.brief || '尚未填写，请主动提出必要问题。'}`,
        `当前阶段: Step ${currentStep.number} ${currentStep.name}`,
        '',
        '# 已确认或正在迭代的前序产物',
    ];

    for (const step of STEPS) {
        if (step.number >= currentStep.number) break;
        const response = effectiveStepArtifacts(step.number);
        if (!response) continue;
        const status = project.steps[step.number].status === 'accepted' ? '已确认' : '草案';
        const promptResponse = responseForPrompt(response, preset);
        sections.push(`\n## Step ${step.number} ${step.name} [${status}]\n${promptResponse.slice(0, 22000)}`);
    }

    const currentTurns = project.steps[currentStep.number].turns || [];
    // 最新一条用户输入会通过 user_input 单独发送；这里只保留此前的修改要求，不再回传 AI 的整段说明或思考。
    const contextualTurns = currentTurns.at(-1)?.role === 'user' ? currentTurns.slice(0, -1) : currentTurns;
    const priorUserRequests = contextualTurns.filter(turn => turn.role === 'user').slice(-6);
    if (priorUserRequests.length) {
        sections.push('\n# 当前阶段的既有修改要求');
        for (const turn of priorUserRequests) {
            sections.push(`\n[用户]\n${String(turn.content || '').slice(0, 18000)}`);
        }
    }

    const currentArtifacts = effectiveStepArtifacts(currentStep.number);
    if (currentArtifacts) {
        sections.push(`\n# 当前阶段正式产物（各产物最新版）\n${responseForPrompt(currentArtifacts, preset).slice(0, 44000)}`);
    }
    sections.push('\n</STUDIO_PROJECT_CONTEXT>');

    let context = sections.join('\n');
    if (context.length > MAX_CONTEXT_CHARS) {
        context = `${context.slice(0, 180000)}\n\n[中间较早的产物因上下文长度省略]\n\n${context.slice(-(MAX_CONTEXT_CHARS - 180000))}`;
    }
    return context;
}

function buildOrderedPrompts(preset, currentStep, options = {}) {
    const includePreviewMetadata = Object.prototype.hasOwnProperty.call(options, 'previewUserInput');
    const ordered = [];
    for (const prompt of preset.prompts || []) {
        if (PLACEHOLDER_IDS.has(prompt.id)) continue;
        const isWorkflowStep = STEP_PROMPT_IDS.has(prompt.id);
        if (isWorkflowStep && prompt.id !== currentStep.promptId) continue;
        if (!isWorkflowStep && !prompt.enabled) continue;
        if (!prompt.content?.trim()) continue;

        let content = prompt.id === '0a09c911-6d52-4635-a244-b30f9aafa412'
            ? customizeSettingsPrompt(prompt.content)
            : prompt.content;
        content = protectTemplateMacros(content);
        try {
            content = helper.substitudeMacros(content);
        } catch (error) {
            console.warn(`[A.U.T.O Card Studio] 提示词宏替换失败：${prompt.name}`, error);
        }
        content = prepareTemplateMacrosForGeneration(content);
        if (content.trim()) {
            const entry = { role: prompt.role || 'system', content };
            if (includePreviewMetadata) entry.name = prompt.name || prompt.id || '预设条目';
            ordered.push(entry);
        }
    }

    const macroGuard = { role: 'system', content: TEMPLATE_MACRO_GUARD_PROMPT };
    const projectContext = { role: 'user', content: prepareTemplateMacrosForGeneration(buildProjectContext(currentStep, preset)) };
    if (includePreviewMetadata) {
        macroGuard.name = '角色卡模板变量保护';
        projectContext.name = '项目上下文（母题、正式产物与本阶段修改要求）';
    }
    ordered.unshift(macroGuard);
    ordered.push(projectContext);
    if (includePreviewMetadata) {
        ordered.push({
            role: 'user',
            name: '本轮输入',
            content: prepareTemplateMacrosForGeneration(options.previewUserInput),
        });
    } else {
        ordered.push('user_input');
    }
    return ordered;
}

function resolvedCurrentUserInput(step, state) {
    return shell.querySelector('#acs-user-input').value.trim()
        || (state.turns.length
            ? '请基于既有对话继续完善本阶段产物，并保持 A.U.T.O 规定的输出格式。'
            : `请执行 Step ${step.number}「${step.name}」。`);
}

function closePromptPreview() {
    const preview = shell?.querySelector('#acs-prompt-preview');
    if (!preview || preview.hidden) return;
    preview.hidden = true;
    preview.setAttribute('aria-hidden', 'true');
    shell.querySelector('#acs-preview-prompt')?.focus({ preventScroll: true });
}

function renderPromptPreview(messages, step) {
    promptPreviewMessages = messages;
    const renderEpoch = ++promptTokenRenderEpoch;
    const list = shell.querySelector('#acs-prompt-message-list');
    list.replaceChildren();
    shell.querySelector('#acs-prompt-preview-summary').textContent = `Step ${step.number} · ${messages.length} 条消息 · 正在统计 tokens · ${connectionDisplayName()}`;

    const currentStepIndex = messages.findIndex(message => String(message.name || '').startsWith(`Step${step.number}`));
    const initiallyOpenIndex = currentStepIndex >= 0 ? currentStepIndex : messages.length - 1;
    messages.forEach((message, index) => {
        const item = document.createElement('article');
        item.className = 'acs-prompt-message';
        item.dataset.role = message.role || 'system';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'acs-prompt-message-toggle';
        toggle.dataset.promptMessageToggle = '';
        toggle.setAttribute('aria-expanded', 'false');
        const sequence = document.createElement('span');
        sequence.className = 'acs-prompt-message-index';
        sequence.textContent = String(index + 1).padStart(2, '0');
        const role = document.createElement('span');
        role.className = 'acs-prompt-message-role';
        role.textContent = String(message.role || 'system').toUpperCase();
        const name = document.createElement('span');
        name.className = 'acs-prompt-message-name';
        name.textContent = message.name || `预设消息 ${index + 1}`;
        const size = document.createElement('span');
        size.className = 'acs-prompt-message-size';
        size.dataset.promptTokenIndex = String(index);
        size.textContent = '统计中…';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down';
        icon.setAttribute('aria-hidden', 'true');
        toggle.append(sequence, role, name, size, icon);

        const body = document.createElement('div');
        body.className = 'acs-prompt-message-body';
        body.hidden = true;
        const content = document.createElement('pre');
        content.textContent = repairExpandedCharacterMacro(message.content);
        body.append(content);
        item.append(toggle, body);
        list.append(item);

        if (index === initiallyOpenIndex) setPromptMessageOpen(item, true, false);
    });

    void Promise.all(messages.map(message => measureTokenCount(message.content))).then(metrics => {
        if (renderEpoch !== promptTokenRenderEpoch || !shell) return;
        let total = 0;
        let approximate = false;
        metrics.forEach((metric, index) => {
            total += metric.count;
            approximate ||= metric.approximate;
            const target = shell.querySelector(`[data-prompt-token-index="${index}"]`);
            if (!target) return;
            target.textContent = formatTokenMetric(metric);
            target.title = metric.approximate
                ? '当前 tokenizer 暂不可用，这是估算值'
                : '按 SillyTavern 当前 tokenizer 统计';
        });
        const totalMetric = formatTokenMetric({ count: total, approximate });
        shell.querySelector('#acs-prompt-preview-summary').textContent = `Step ${step.number} · ${messages.length} 条消息 · ${totalMetric} · ${connectionDisplayName()}`;
    });
}

function setPromptMessageOpen(item, open, scroll = true) {
    if (!item) return;
    const toggle = item.querySelector('[data-prompt-message-toggle]');
    const body = item.querySelector('.acs-prompt-message-body');
    item.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (body) body.hidden = !open;
    if (open && scroll) {
        const reducedMotion = hostWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        hostWindow.requestAnimationFrame(() => item.scrollIntoView({
            block: 'nearest',
            behavior: reducedMotion ? 'auto' : 'smooth',
        }));
    }
}

function togglePromptMessage(toggle) {
    const item = toggle.closest('.acs-prompt-message');
    const willOpen = !item.classList.contains('is-open');
    for (const other of shell.querySelectorAll('.acs-prompt-message.is-open')) {
        if (other !== item) setPromptMessageOpen(other, false, false);
    }
    setPromptMessageOpen(item, willOpen);
}

function openPromptPreview() {
    const preset = getAutoPresetSafe();
    if (!preset) {
        notify('warning', '未找到固定的 A.U.T.O v2.0 预设，暂时无法组装提示词。');
        return;
    }
    const step = STEPS[project.currentStep - 1];
    const state = project.steps[step.number];
    const userInput = resolvedCurrentUserInput(step, state);
    const messages = buildOrderedPrompts(preset, step, { previewUserInput: userInput });
    renderPromptPreview(messages, step);
    toggleProjectMenu(false);
    closeStyledSelects();

    const preview = shell.querySelector('#acs-prompt-preview');
    preview.hidden = false;
    preview.setAttribute('aria-hidden', 'false');
    preview.querySelector('button[data-prompt-preview-close]')?.focus({ preventScroll: true });
}

async function copyPromptPreview() {
    if (!promptPreviewMessages.length) return;
    const text = promptPreviewMessages.map((message, index) => (
        `===== ${String(index + 1).padStart(2, '0')} · ${String(message.role || 'system').toUpperCase()} · ${message.name || '预设消息'} =====\n${repairExpandedCharacterMacro(message.content)}`
    )).join('\n\n');
    try {
        await copyText(text);
        notify('success', '本轮发送内容已复制。');
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 复制提示词失败', error);
        notify('error', '复制失败，请展开消息后手动复制。');
    }
}

function presetGenerationOptions(preset) {
    const settings = preset.settings || {};
    const customApi = {};
    const assignNumber = (key, value) => {
        if (Number.isFinite(value)) customApi[key] = value;
    };
    assignNumber('max_tokens', settings.max_completion_tokens);
    assignNumber('temperature', settings.temperature);
    assignNumber('frequency_penalty', settings.frequency_penalty);
    assignNumber('presence_penalty', settings.presence_penalty);
    assignNumber('top_p', settings.top_p);
    assignNumber('top_k', settings.top_k);

    if (connectionSettings.mode === 'custom') {
        customApi.apiurl = connectionSettings.apiUrl.trim();
        customApi.model = connectionSettings.model.trim();
        customApi.source = connectionSettings.source;
        if (customApiKey.trim()) customApi.key = customApiKey.trim();
    }
    return customApi;
}

function customConnectionError() {
    if (connectionSettings.mode !== 'custom') return null;
    const apiUrl = connectionSettings.apiUrl.trim();
    if (!apiUrl) return { message: '请先填写独立连接的接口地址。', selector: '#acs-custom-api-url' };
    try {
        const parsed = new URL(apiUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    } catch {
        return { message: '接口地址格式不正确，请填写以 http:// 或 https:// 开头的完整地址。', selector: '#acs-custom-api-url' };
    }
    if (!connectionSettings.model.trim()) {
        return { message: '请填写模型名称，或点击“获取模型”后选择。', selector: '#acs-custom-model' };
    }
    return null;
}

async function fetchCustomModels() {
    const apiUrl = connectionSettings.apiUrl.trim();
    if (!apiUrl) {
        notify('warning', '请先填写接口地址，再获取模型列表。');
        shell.querySelector('#acs-custom-api-url').focus();
        return;
    }
    if (!helper?.getModelList) {
        notify('error', '当前酒馆助手版本不支持获取模型列表，请手动填写模型名称。');
        return;
    }

    const button = shell.querySelector('#acs-fetch-models');
    const originalMarkup = button.innerHTML;
    button.disabled = true;
    button.textContent = '正在获取…';
    try {
        const models = await helper.getModelList({
            apiurl: apiUrl,
            ...(customApiKey.trim() ? { key: customApiKey.trim() } : {}),
        });
        const uniqueModels = [...new Set((models || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const options = shell.querySelector('#acs-custom-model-options');
        options.replaceChildren(...uniqueModels.map(model => new Option(model, model)));
        notify('success', uniqueModels.length
            ? `已获取 ${uniqueModels.length} 个模型，可以在“模型名称”中选择。`
            : '连接成功，但接口没有返回可选模型，请手动填写模型名称。');
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 获取模型列表失败', error);
        notify('error', `获取模型失败：${String(error?.message || error)}`);
    } finally {
        button.disabled = false;
        button.innerHTML = originalMarkup;
    }
}

function prepareGeneration() {
    if (isGenerating) return;
    if (!helper) {
        notify('error', '未检测到酒馆助手，无法调用 A.U.T.O 生成。');
        return null;
    }
    if (!environment.presetName) {
        notify('error', `没有找到 ${FIXED_PRESET_NAME}。请先在 SillyTavern 导入该预设，然后重新打开创作台。`);
        switchInspectorTab('settings');
        return null;
    }
    if (!project.brief.trim() && project.currentStep === 1) {
        // 母题收起时先自动展开，避免提示用户后却无法看到输入框。
        project.ui.overviewCollapsed = false;
        saveProject();
        renderOverviewState();
        notify('warning', '请先写下一两句创作母题，再开始第一阶段。');
        shell.querySelector('#acs-project-brief').focus();
        return null;
    }

    const connectionError = customConnectionError();
    if (connectionError) {
        notify('warning', connectionError.message);
        switchInspectorTab('settings');
        shell.querySelector(connectionError.selector).focus();
        return null;
    }

    const step = STEPS[project.currentStep - 1];
    const state = project.steps[step.number];
    return { step, state };
}

async function runStepGeneration(step, state, userInput, { appendUserTurn = true, retried = false } = {}) {
    if (appendUserTurn) {
        state.turns.push({ role: 'user', content: userInput, createdAt: new Date().toISOString() });
    }
    state.status = 'draft';
    saveProject();
    shell.querySelector('#acs-user-input').value = '';
    setGenerating(true);
    renderCurrentStep();
    renderStepRail();

    let succeeded = false;
    try {
        const preset = helper.getPreset(environment.presetName);
        activeGenerationId = `auto-card-studio-${project.id}-${step.number}-${Date.now()}`;
        const result = await helper.generateRaw({
            generation_id: activeGenerationId,
            user_input: prepareTemplateMacrosForGeneration(userInput),
            should_stream: false,
            should_silence: false,
            ordered_prompts: buildOrderedPrompts(preset, step),
            custom_api: presetGenerationOptions(preset),
        });
        const rawResponse = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        const response = repairExpandedCharacterMacro(rawResponse);
        state.turns.push({ role: 'assistant', content: response, createdAt: new Date().toISOString() });
        state.status = 'draft';
        state.updatedAt = new Date().toISOString();
        saveProject();
        succeeded = true;
        notify('success', retried
            ? `Step ${step.number}「${step.name}」已重新生成。`
            : `Step ${step.number}「${step.name}」草案已生成。`);
    } catch (error) {
        const message = String(error?.message || error);
        const stopped = /abort|stop|停止|中断/i.test(message);
        if (!stopped) {
            console.error('[A.U.T.O Card Studio] 生成失败', error);
            notify('error', `生成失败：${message}`);
        } else {
            notify('info', '本次生成已停止。');
        }
    } finally {
        activeGenerationId = null;
        setGenerating(false);
        renderAll();
    }
    return succeeded;
}

async function generateCurrentStep() {
    const prepared = prepareGeneration();
    if (!prepared) return;
    const { step, state } = prepared;
    const userInput = resolvedCurrentUserInput(step, state);

    await runStepGeneration(step, state, userInput);
}

async function retryLatestUserInput(turnIndex) {
    const prepared = prepareGeneration();
    if (!prepared) return;
    const { step, state } = prepared;
    let latestUserIndex = -1;
    for (let index = state.turns.length - 1; index >= 0; index -= 1) {
        if (state.turns[index].role === 'user') {
            latestUserIndex = index;
            break;
        }
    }
    if (latestUserIndex < 0 || turnIndex !== latestUserIndex) {
        notify('info', '这条输入已不是最新消息，请重试当前最后一条输入。');
        renderCurrentStep();
        return;
    }

    const userInput = state.turns[latestUserIndex].content;
    const previousTail = state.turns.slice(latestUserIndex + 1);
    const previousStatus = state.status;
    state.turns = state.turns.slice(0, latestUserIndex + 1);
    const succeeded = await runStepGeneration(step, state, userInput, { appendUserTurn: false, retried: true });
    if (succeeded && previousTail.length) {
        // 重试替换掉的旧回复不再占据对话区，但继续作为产物历史供查看和恢复。
        state.artifactHistory = [
            ...(state.artifactHistory || []),
            ...previousTail.filter(turn => turn.role === 'assistant'),
        ];
        saveProject();
        renderAll();
    } else if (!succeeded && previousTail.length) {
        state.turns.push(...previousTail);
        state.status = previousStatus;
        saveProject();
        renderAll();
        notify('info', '重试未完成，已恢复原来的回复。');
    }
}

function setGenerating(value) {
    isGenerating = value;
    const generateButton = shell.querySelector('#acs-generate');
    const stopButton = shell.querySelector('#acs-stop-generation');
    generateButton.disabled = value || Boolean(generationDependencyMessage());
    generateButton.innerHTML = value
        ? '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> A.U.T.O 正在构筑'
        : '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> 生成阶段草案';
    stopButton.hidden = !value;
    shell.querySelector('#acs-accept-step').disabled = value || !latestAssistantResponse(project.currentStep);
}

function stopGeneration() {
    if (!activeGenerationId || !helper?.stopGenerationById) return;
    helper.stopGenerationById(activeGenerationId);
}

function acceptCurrentStep() {
    const step = STEPS[project.currentStep - 1];
    if (!latestAssistantResponse(step.number)) return;
    project.steps[step.number].status = 'accepted';
    project.steps[step.number].updatedAt = new Date().toISOString();
    if (project.currentStep < STEPS.length) {
        project.currentStep += 1;
        revealStepPhase(project.currentStep);
    }
    saveProject();
    renderAll();
    shell.querySelector('#acs-user-input').focus();
}

function extractXmlBlocks(text) {
    const source = String(text || '');
    const blocks = [];
    const stacks = new Map();
    const pattern = /<(\/)?([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)(?:\s[^>]*)?>/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        const closing = Boolean(match[1]);
        const tag = match[2];
        if (!closing) {
            if (!stacks.has(tag)) stacks.set(tag, []);
            stacks.get(tag).push(match.index);
            continue;
        }
        const starts = stacks.get(tag);
        if (!starts?.length) continue;
        const start = starts.pop();
        const end = match.index + match[0].length;
        blocks.push({ tag, content: source.slice(start, end), start, end });
    }
    // 同时保留外层与内层结构化标签，避免容器标签把真正产物遮住。
    return blocks.sort((left, right) => left.start - right.start || left.end - right.end);
}

function extractFencedBlocks(text) {
    const source = String(text || '');
    const blocks = [];
    const pattern = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        const language = match[1].trim().split(/\s+/)[0].toLowerCase();
        const rawContent = match[2];
        const leading = rawContent.match(/^\s*/)?.[0].length || 0;
        const trailing = rawContent.match(/\s*$/)?.[0].length || 0;
        const contentStart = match.index + match[0].indexOf(rawContent) + leading;
        const contentEnd = contentStart + Math.max(0, rawContent.length - leading - trailing);
        blocks.push({
            tag: language || 'code',
            language,
            content: source.slice(contentStart, contentEnd),
            start: contentStart,
            end: contentEnd,
        });
    }
    return blocks;
}

function statusbarFenceTag(block) {
    if (block.language) return '';
    if (/<body\b/i.test(block.content) && /<\/body>/i.test(block.content)) return 'STATUSBAR_HTML';
    if (/<SOURCE_statusbar_data_guide\b/.test(block.content)) return 'SOURCE_statusbar_data_guide';
    if (/<STATUSBAR_DATA>/.test(block.content) && /<\/STATUSBAR_DATA>/.test(block.content)) return 'STATUSBAR_REGEX';
    return '';
}

function schemaRootIdentity(content) {
    const match = String(content || '').match(/^\s*([^#\s][^:\r\n]*?)\s*:\s*z\.object\s*\(/m);
    return match?.[1]?.trim() || '';
}

function resolveArtifactIdentity(stepNumber, block, siblingBlocks = []) {
    if (Number(stepNumber) === 18 && block.tag === 'schema') {
        const currentBlock = siblingBlocks.find(item => item.tag.startsWith('WORLD_current_'));
        const rootName = currentBlock?.tag.slice('WORLD_current_'.length) || schemaRootIdentity(block.content);
        return rootName ? `schema_${rootName}` : 'schema';
    }
    return block.tag;
}

function extractArtifactBlocks(text, stepNumber) {
    const rules = STEP_ARTIFACT_RULES[Number(stepNumber)];
    if (!rules) return [];

    const xmlBlocks = extractXmlBlocks(text).filter(block => (
        rules.tags?.includes(block.tag)
        || rules.prefixes?.some(prefix => block.tag.startsWith(prefix))
    ));
    const fencedBlocks = extractFencedBlocks(text).filter(block => rules.fences?.includes(block.language));

    if (rules.statusbarFences) {
        for (const block of extractFencedBlocks(text)) {
            const tag = statusbarFenceTag(block);
            if (tag) fencedBlocks.push({ ...block, tag });
        }
    }

    return [...xmlBlocks, ...fencedBlocks].sort((left, right) => left.start - right.start || left.end - right.end);
}

function blockMatchesMapping(block, mapping) {
    if (mapping.tags?.includes(block.tag)) return true;
    if (mapping.prefixes?.some(prefix => block.tag.startsWith(prefix))) return true;
    if (mapping.suffixes?.some(suffix => block.tag.endsWith(suffix))) return true;
    if (mapping.sourcePrefixes?.some(prefix => block.tag.startsWith(prefix) && block.tag.endsWith('_状态'))) return true;
    return false;
}

function extractMappedContent(response, mapping) {
    if (!response) return '';
    const blocks = extractXmlBlocks(response);
    const selected = blocks.filter(block => blockMatchesMapping(block, mapping));
    return selected.length ? selected.map(block => block.content).join('\n\n') : response;
}

function latestMappedContent(stepNumber, mapping) {
    const hasSelectors = Boolean(mapping.tags || mapping.prefixes || mapping.suffixes || mapping.sourcePrefixes);
    if (!hasSelectors) return latestAssistantResponse(stepNumber);

    // 同一标签只保留最后一次出现；不同标签仍按首次出现顺序组合。
    const latestByTag = new Map();
    for (const turn of allAssistantArtifactTurns(stepNumber)) {
        for (const block of extractXmlBlocks(turn.content)) {
            if (blockMatchesMapping(block, mapping)) latestByTag.set(block.tag, block.content);
        }
    }
    return [...latestByTag.values()].join('\n\n');
}

function effectiveStepArtifacts(stepNumber) {
    // 与右侧产物栏共用正式产物提取规则；每个身份只发送最新版，彻底排除说明、思考、评分和追问。
    const latestArtifacts = new Map();
    for (const turn of allAssistantArtifactTurns(stepNumber)) {
        const blocks = extractArtifactBlocks(turn.content, stepNumber);
        for (const block of blocks) {
            latestArtifacts.set(resolveArtifactIdentity(stepNumber, block, blocks), block.content);
        }
    }
    return [...latestArtifacts.values()].join('\n\n');
}

function entryDisplayName(entry) {
    return String(entry.name || entry.comment || '');
}

function buildOutputWorldbook(template) {
    const worldbook = typeof structuredClone === 'function'
        ? structuredClone(template)
        : JSON.parse(JSON.stringify(template));

    for (const mapping of WORLD_ENTRY_MAPPINGS) {
        if (project.steps[mapping.step]?.status !== 'accepted') continue;
        const response = latestMappedContent(mapping.step, mapping);
        if (!response) continue;
        const entry = worldbook.find(item => entryDisplayName(item).includes(mapping.needle));
        if (!entry) {
            console.warn(`[A.U.T.O Card Studio] 世界书模板中没有找到条目：${mapping.needle}`);
            continue;
        }
        const content = extractMappedContent(response, mapping);
        if (mapping.append && entry.content?.trim()) {
            if (!entry.content.includes(content)) entry.content = `${entry.content}\n\n${content}`;
        } else {
            entry.content = content;
        }
    }
    return worldbook;
}

function extractOpeningMessage() {
    const response = effectiveStepArtifacts(30);
    if (!response) return `欢迎来到「${project.name}」。`;
    const wanted = extractXmlBlocks(response).filter(block => [
        'NARRATIVE',
        'NARRATIVE_parallel',
        'CONTEXT_options',
        'CONTEXT_summary',
        'CONTEXT_hidden_summary',
        'UpdateVariable',
        'STATUSBAR_DATA',
    ].includes(block.tag));
    return wanted.length ? wanted.map(block => block.content).join('\n\n') : response;
}

function defaultOutputWorldbookName() {
    return `${project.name || '未命名世界'} · 世界书`;
}

async function publishProject() {
    if (!helper) {
        notify('error', '未检测到酒馆助手，无法写入角色卡。');
        return;
    }
    if (!environment.worldbookName) {
        notify('error', '请先在“设置”中选择 A.U.T.O 世界书模板。');
        return;
    }

    const characterName = shell.querySelector('#acs-character-name').value.trim();
    const worldbookName = shell.querySelector('#acs-output-worldbook').value.trim() || defaultOutputWorldbookName();
    if (!characterName) {
        notify('warning', '请填写角色卡名称。');
        shell.querySelector('#acs-character-name').focus();
        return;
    }

    const existingCharacters = helper.getCharacterNames?.() || [];
    const existingWorldbooks = helper.getWorldbookNames?.() || [];
    const overwritten = [];
    if (existingCharacters.includes(characterName)) overwritten.push(`角色卡“${characterName}”`);
    if (existingWorldbooks.includes(worldbookName)) overwritten.push(`世界书“${worldbookName}”`);
    const message = overwritten.length
        ? `将更新${overwritten.join('和')}。已有头像与扩展数据会尽量保留，是否继续？`
        : `将创建角色卡“${characterName}”及世界书“${worldbookName}”，是否继续？`;
    if (!hostWindow.confirm(message)) return;

    const button = shell.querySelector('#acs-publish');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> 正在装配角色卡';
    try {
        const template = await helper.getWorldbook(environment.worldbookName);
        const outputWorldbook = buildOutputWorldbook(template);
        await helper.createOrReplaceWorldbook(worldbookName, outputWorldbook, { render: 'immediate' });

        let existing = {};
        if (existingCharacters.includes(characterName)) {
            existing = await helper.getCharacter(characterName);
        }
        const creatorNotes = [
            `由 A.U.T.O 角色卡创作台生成`,
            `项目: ${project.name}`,
            `更新时间: ${new Date().toLocaleString('zh-CN')}`,
            '',
            project.brief,
        ].join('\n');
        const character = {
            ...existing,
            creator: project.preferences.creatorRole,
            creator_notes: creatorNotes,
            description: existing.description || `# ${project.name}\n\n${project.brief}`,
            first_messages: [extractOpeningMessage()],
            worldbook: worldbookName,
            extensions: existing.extensions || {
                regex_scripts: [],
                tavern_helper: { scripts: [], variables: {} },
            },
        };
        await helper.createOrReplaceCharacter(characterName, character, { render: 'immediate' });

        project.output.characterName = characterName;
        project.output.worldbookName = worldbookName;
        saveProject();
        shell.querySelector('#acs-publish-note').textContent = `已创建：${characterName} · ${worldbookName}`;
        notify('success', '角色卡与世界书已写入 SillyTavern。');
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 发布失败', error);
        notify('error', `发布失败：${error?.message || error}`);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-feather-pointed" aria-hidden="true"></i> 创建角色卡与世界书';
    }
}

function projectDossier() {
    const lines = [
        `# ${project.name}`,
        '',
        '## 创作母题',
        '',
        project.brief || '未填写',
        '',
        '## 创作设置',
        '',
        `- A.U.T.O 预设：${environment.presetName || '未选择'}`,
        `- 世界书模板：${environment.worldbookName || '未选择'}`,
        `- 创作者：${project.preferences.creatorRole}`,
        `- 输出语言：${project.preferences.language}`,
        `- 叙事人称：${project.preferences.person}`,
    ];
    for (const step of STEPS) {
        const response = effectiveStepArtifacts(step.number);
        if (!response) continue;
        const status = project.steps[step.number].status === 'accepted' ? '已确认' : '草案';
        lines.push('', `## Step ${step.number} · ${step.name}（${status}）`, '', response);
    }
    return lines.join('\n');
}

function safeFileName(value) {
    return String(value || 'AUTO项目').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 90);
}

function downloadBlob(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProjectJson() {
    downloadBlob(
        JSON.stringify(project, null, 2),
        `${safeFileName(project.name)}.auto-card-studio.json`,
        'application/json;charset=utf-8',
    );
}

function downloadDossier() {
    downloadBlob(projectDossier(), `${safeFileName(project.name)}-创作档案.md`, 'text/markdown;charset=utf-8');
}

function newProject() {
    if (isGenerating) {
        notify('warning', '请先停止当前生成，再新建项目。');
        return;
    }
    flushPendingProjectEdits();
    project = createDefaultProject();
    projectLibrary.projects.push(project);
    projectLibrary.activeProjectId = project.id;
    syncEnvironmentToProject();
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    saveProject();
    renderEnvironmentSelectors();
    renderAll();
    toggleProjectMenu(false);
    shell.querySelector('#acs-project-name').focus();
    shell.querySelector('#acs-project-name').select();
    notify('success', '已新建项目，原项目仍保存在项目库中。');
}

function selectStep(number) {
    if (number < 1 || number > STEPS.length || isGenerating) return;
    project.currentStep = number;
    revealStepPhase(number);
    saveProject();
    renderStepRail();
    renderCurrentStep();
    if (artifactFilterScope === 'current') renderArtifacts();
}

function switchInspectorTab(name) {
    if (name !== 'structure' && artifactPanelExpanded) toggleArtifactPanel(false);
    for (const tab of shell.querySelectorAll('[data-acs-tab]')) {
        const active = tab.dataset.acsTab === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
    }
    for (const panel of shell.querySelectorAll('[data-acs-panel]')) {
        const active = panel.dataset.acsPanel === name;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
    }
}

function toggleMobileInspector() {
    const inspector = shell.querySelector('.acs-inspector');
    const button = shell.querySelector('#acs-inspector-toggle');
    const opened = inspector.classList.toggle('is-mobile-open');
    button.setAttribute('aria-expanded', String(opened));
    button.title = opened ? '关闭项目检查器' : '打开项目检查器';
}

function captureTourWorkspace() {
    const inspector = shell.querySelector('.acs-inspector');
    return {
        currentStep: project.currentStep,
        collapsedPhases: [...(project.ui.collapsedPhases || [])],
        overviewCollapsed: Boolean(project.ui.overviewCollapsed),
        inspectorTab: shell.querySelector('[data-acs-tab].is-active')?.dataset.acsTab || 'structure',
        projectMenuOpen: shell.querySelector('#acs-project-menu')?.classList.contains('is-open') || false,
        mobileInspectorOpen: inspector?.classList.contains('is-mobile-open') || false,
        artifactPanelExpanded,
        stepRailScrollTop: shell.querySelector('#acs-step-rail')?.scrollTop || 0,
        conversationScrollTop: shell.querySelector('.acs-conversation')?.scrollTop || 0,
        inspectorScrollTop: inspector?.scrollTop || 0,
    };
}

function setTourMobileInspector(open) {
    const inspector = shell.querySelector('.acs-inspector');
    const button = shell.querySelector('#acs-inspector-toggle');
    inspector.classList.toggle('is-mobile-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.title = open ? '关闭项目检查器' : '打开项目检查器';
}

function restoreTourWorkspace() {
    if (!tourRestoreState) return;
    const previous = tourRestoreState;
    tourRestoreState = null;
    project.currentStep = previous.currentStep;
    project.ui.collapsedPhases = [...previous.collapsedPhases];
    project.ui.overviewCollapsed = previous.overviewCollapsed;
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    renderAll();
    switchInspectorTab(previous.inspectorTab);
    setTourMobileInspector(previous.mobileInspectorOpen);
    if (previous.artifactPanelExpanded) toggleArtifactPanel(true);
    toggleProjectMenu(previous.projectMenuOpen);
    hostWindow.requestAnimationFrame(() => {
        shell.querySelector('#acs-step-rail').scrollTop = previous.stepRailScrollTop;
        shell.querySelector('.acs-conversation').scrollTop = previous.conversationScrollTop;
        shell.querySelector('.acs-inspector').scrollTop = previous.inspectorScrollTop;
    });
}

function ensureTourInspectorVisible() {
    if (hostWindow.matchMedia?.('(max-width: 860px)').matches) setTourMobileInspector(true);
}

function applyTourScene(step) {
    closePromptPreview();
    closeStyledSelects();
    if (step.scene !== 'projects') toggleProjectMenu(false);

    switch (step.scene) {
        case 'projects':
            setTourMobileInspector(false);
            toggleProjectMenu(true);
            break;
        case 'brief':
            setTourMobileInspector(false);
            project.ui.overviewCollapsed = false;
            renderOverviewState();
            break;
        case 'route':
            setTourMobileInspector(false);
            project.currentStep = 1;
            project.ui.collapsedPhases = PHASES.slice(1).map(phase => phase.id);
            renderStepRail();
            renderCurrentStep();
            renderProgress();
            break;
        case 'station':
            setTourMobileInspector(false);
            project.currentStep = 1;
            project.ui.overviewCollapsed = false;
            renderStepRail();
            renderCurrentStep();
            renderOverviewState();
            break;
        case 'compose':
        case 'prompt':
            setTourMobileInspector(false);
            project.ui.overviewCollapsed = true;
            renderOverviewState();
            break;
        case 'artifacts':
            ensureTourInspectorVisible();
            switchInspectorTab('structure');
            shell.querySelector('.acs-inspector').scrollTop = 0;
            break;
        case 'settings':
            ensureTourInspectorVisible();
            switchInspectorTab('settings');
            shell.querySelector('.acs-inspector').scrollTop = 0;
            break;
        case 'publish':
            ensureTourInspectorVisible();
            switchInspectorTab('publish');
            shell.querySelector('.acs-inspector').scrollTop = 0;
            break;
        case 'controls':
            setTourMobileInspector(false);
            break;
        default:
            setTourMobileInspector(false);
            break;
    }
}

function currentTourTarget(step) {
    const primary = shell?.querySelector(step.selector);
    if (primary) {
        const rect = primary.getBoundingClientRect();
        if (rect.width > 4 && rect.height > 4) return primary;
    }
    return step.fallbackSelector ? shell?.querySelector(step.fallbackSelector) : null;
}

function positionTourStep() {
    if (!tourActive || !shell?.isConnected) return;
    const step = TOUR_STEPS[tourStepIndex];
    const target = currentTourTarget(step);
    const spotlight = shell.querySelector('#acs-tour-spotlight');
    const card = shell.querySelector('#acs-tour-card');
    if (!target || !spotlight || !card) return;

    const targetRect = target.getBoundingClientRect();
    const padding = 8;
    const left = Math.max(8, targetRect.left - padding);
    const top = Math.max(8, targetRect.top - padding);
    const width = Math.min(hostWindow.innerWidth - left - 8, targetRect.width + padding * 2);
    const height = Math.min(hostWindow.innerHeight - top - 8, targetRect.height + padding * 2);
    spotlight.style.left = `${left}px`;
    spotlight.style.top = `${top}px`;
    spotlight.style.width = `${Math.max(18, width)}px`;
    spotlight.style.height = `${Math.max(18, height)}px`;

    const cardRect = card.getBoundingClientRect();
    const gap = 18;
    let cardLeft = targetRect.left;
    let cardTop = targetRect.bottom + gap;
    if (step.placement === 'right') {
        cardLeft = targetRect.right + gap;
        cardTop = targetRect.top + Math.min(36, targetRect.height * 0.16);
    } else if (step.placement === 'left') {
        cardLeft = targetRect.left - cardRect.width - gap;
        cardTop = targetRect.top + Math.min(36, targetRect.height * 0.16);
    } else if (step.placement === 'top') {
        cardLeft = targetRect.left + (targetRect.width - cardRect.width) / 2;
        cardTop = targetRect.top - cardRect.height - gap;
    } else {
        cardLeft = targetRect.left + (targetRect.width - cardRect.width) / 2;
    }
    card.style.left = `${Math.max(16, Math.min(cardLeft, hostWindow.innerWidth - cardRect.width - 16))}px`;
    card.style.top = `${Math.max(16, Math.min(cardTop, hostWindow.innerHeight - cardRect.height - 16))}px`;
}

function renderTourStep() {
    if (!tourActive) return;
    const step = TOUR_STEPS[tourStepIndex];
    const card = shell.querySelector('#acs-tour-card');
    applyTourScene(step);
    shell.querySelector('#acs-tour-eyebrow').textContent = step.eyebrow;
    shell.querySelector('#acs-tour-title').textContent = step.title;
    shell.querySelector('#acs-tour-description').textContent = step.description;
    shell.querySelector('#acs-tour-progress').textContent = `${tourStepIndex + 1} / ${TOUR_STEPS.length}`;
    shell.querySelector('#acs-tour-previous').disabled = tourStepIndex === 0;
    shell.querySelector('#acs-tour-next span').textContent = tourStepIndex === TOUR_STEPS.length - 1 ? '完成引导' : '下一步';
    shell.querySelector('#acs-tour-next i').className = tourStepIndex === TOUR_STEPS.length - 1
        ? 'fa-solid fa-check'
        : 'fa-solid fa-arrow-right';

    let points = shell.querySelector('#acs-tour-points');
    let actionNote = shell.querySelector('#acs-tour-action-note');
    if (!points) {
        points = document.createElement('ul');
        points.id = 'acs-tour-points';
        points.className = 'acs-tour-points';
        shell.querySelector('#acs-tour-description').after(points);
    }
    if (!actionNote) {
        actionNote = document.createElement('p');
        actionNote.id = 'acs-tour-action-note';
        actionNote.className = 'acs-tour-action-note';
        points.after(actionNote);
    }
    points.replaceChildren(...(step.points || []).map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
    }));
    points.hidden = !step.points?.length;
    actionNote.textContent = step.actionNote || '';
    actionNote.hidden = !step.actionNote;

    const dots = shell.querySelector('#acs-tour-dots');
    dots.replaceChildren(...TOUR_STEPS.map((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'acs-tour-dot';
        dot.classList.toggle('is-active', index === tourStepIndex);
        dot.classList.toggle('is-past', index < tourStepIndex);
        return dot;
    }));

    card.classList.remove('is-refreshing');
    void card.offsetWidth;
    card.classList.add('is-refreshing');
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    if (tourSceneTimer) hostWindow.clearTimeout(tourSceneTimer);
    tourAnimationFrame = hostWindow.requestAnimationFrame(() => {
        const target = currentTourTarget(step);
        target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        tourAnimationFrame = hostWindow.requestAnimationFrame(() => {
            positionTourStep();
            shell.querySelector('#acs-tour-next').focus({ preventScroll: true });
            tourAnimationFrame = null;
        });
    });
    // 项目抽屉等区域带有展开动画，动画结束后再次对齐聚光框。
    tourSceneTimer = hostWindow.setTimeout(() => {
        positionTourStep();
        tourSceneTimer = null;
    }, 320);
}

function startTour() {
    if (!shell?.classList.contains('is-open') || tourActive) return;
    flushPendingProjectEdits();
    tourRestoreState = captureTourWorkspace();
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    toggleProjectMenu(false);
    closeStyledSelects();
    tourStepIndex = 0;
    tourActive = true;
    const overlay = shell.querySelector('#acs-tour-overlay');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    shell.classList.add('is-touring');
    renderTourStep();
}

function closeTour(completed = false) {
    if (!tourActive) return;
    tourActive = false;
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    tourAnimationFrame = null;
    if (tourSceneTimer) hostWindow.clearTimeout(tourSceneTimer);
    tourSceneTimer = null;
    const overlay = shell?.querySelector('#acs-tour-overlay');
    if (overlay) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
    }
    shell?.classList.remove('is-touring');
    restoreTourWorkspace();
    if (completed) {
        localStorage.setItem(TOUR_COMPLETED_KEY, new Date().toISOString());
        notify('success', '新手引导已完成。之后仍可从标题旁再次打开。');
    }
    shell?.querySelector('#acs-tour-launch')?.focus({ preventScroll: true });
}

function moveTour(direction) {
    const nextIndex = tourStepIndex + direction;
    if (nextIndex >= TOUR_STEPS.length) {
        closeTour(true);
        return;
    }
    tourStepIndex = Math.max(0, nextIndex);
    renderTourStep();
}

function handleTourKeydown(event) {
    if (!tourActive) return;
    if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveTour(1);
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveTour(-1);
    }
}

function handleTourResize() {
    if (!tourActive) return;
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    tourAnimationFrame = hostWindow.requestAnimationFrame(() => {
        positionTourStep();
        tourAnimationFrame = null;
    });
}

function bindStudioEvents() {
    for (const close of shell.querySelectorAll('[data-acs-close]')) close.addEventListener('click', closeStudio);
    shell.querySelector('#acs-step-rail').addEventListener('click', event => {
        const phaseToggle = event.target.closest('[data-phase-toggle]');
        if (phaseToggle) {
            togglePhase(phaseToggle.dataset.phaseToggle);
            return;
        }
        const button = event.target.closest('[data-step]');
        if (button) selectStep(Number(button.dataset.step));
    });
    shell.querySelector('#acs-toggle-overview').addEventListener('click', toggleOverview);
    shell.querySelector('#acs-turns').addEventListener('click', event => {
        const retry = event.target.closest('[data-retry-turn]');
        if (retry) retryLatestUserInput(Number(retry.dataset.retryTurn));
    });
    shell.querySelector('#acs-generate').addEventListener('click', generateCurrentStep);
    shell.querySelector('#acs-preview-prompt').addEventListener('click', openPromptPreview);
    shell.querySelector('#acs-copy-prompt-preview').addEventListener('click', copyPromptPreview);
    shell.querySelector('#acs-prompt-message-list').addEventListener('click', event => {
        const toggle = event.target.closest('[data-prompt-message-toggle]');
        if (toggle) togglePromptMessage(toggle);
    });
    for (const close of shell.querySelectorAll('[data-prompt-preview-close]')) {
        close.addEventListener('click', closePromptPreview);
    }
    shell.querySelector('#acs-stop-generation').addEventListener('click', stopGeneration);
    shell.querySelector('#acs-accept-step').addEventListener('click', acceptCurrentStep);
    shell.querySelector('#acs-publish').addEventListener('click', publishProject);
    shell.querySelector('#acs-download-dossier').addEventListener('click', downloadDossier);
    shell.querySelector('#acs-save-project').addEventListener('click', exportProjectJson);
    shell.querySelector('#acs-check-update').addEventListener('click', checkForUpdatesManually);
    shell.querySelector('#acs-tour-launch').addEventListener('click', startTour);
    shell.querySelector('#acs-tour-skip').addEventListener('click', () => closeTour(false));
    shell.querySelector('#acs-tour-previous').addEventListener('click', () => moveTour(-1));
    shell.querySelector('#acs-tour-next').addEventListener('click', () => moveTour(1));
    shell.querySelector('#acs-tour-overlay').addEventListener('keydown', handleTourKeydown);
    shell.querySelector('#acs-inspector-toggle').addEventListener('click', toggleMobileInspector);
    shell.querySelector('#acs-new-project').addEventListener('click', newProject);
    shell.querySelector('#acs-fetch-models').addEventListener('click', fetchCustomModels);
    shell.querySelector('#acs-expand-artifacts').addEventListener('click', () => toggleArtifactPanel());

    const projectIcon = shell.querySelector('.acs-project-title-icon');
    const projectMenu = shell.querySelector('#acs-project-menu');
    projectIcon.addEventListener('click', event => {
        event.stopPropagation();
        toggleProjectMenu();
    });
    projectIcon.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleProjectMenu();
    });
    projectMenu.addEventListener('click', event => {
        event.stopPropagation();
        const deleteButton = event.target.closest('[data-delete-project]');
        if (deleteButton) {
            deleteProject(deleteButton.dataset.deleteProject);
            return;
        }
        const switchButton = event.target.closest('[data-project-id]');
        if (switchButton) {
            switchProject(switchButton.dataset.projectId);
            return;
        }
        if (event.target.closest('#acs-project-menu-new')) newProject();
    });
    shell.addEventListener('click', event => {
        if (!event.target.closest('.acs-project-identity')) toggleProjectMenu(false);
        if (!event.target.closest('.acs-styled-select')) closeStyledSelects();
    });

    const artifactList = shell.querySelector('#acs-artifact-list');
    shell.querySelector('#acs-artifact-filters').addEventListener('click', event => {
        const button = event.target.closest('[data-artifact-scope]');
        if (!button) return;
        artifactFilterScope = button.dataset.artifactScope;
        renderArtifacts();
    });
    shell.querySelector('#acs-artifact-search').addEventListener('input', event => {
        artifactFilterQuery = event.target.value;
        renderArtifacts();
    });
    artifactList.addEventListener('click', event => {
        const historyButton = event.target.closest('[data-artifact-history]');
        if (historyButton) {
            moveArtifactHistory(historyButton);
            return;
        }
        const restoreButton = event.target.closest('[data-restore-artifact]');
        if (restoreButton) {
            restoreArtifactVersion(restoreButton);
            return;
        }
        const copyButton = event.target.closest('[data-copy-artifact]');
        if (copyButton) copyArtifact(copyButton);
    });
    artifactList.addEventListener('input', event => {
        if (event.target.matches('.acs-artifact-content')) scheduleArtifactSave(event.target);
    });
    artifactList.addEventListener('focusout', event => {
        if (event.target.matches('.acs-artifact-content')) saveArtifactEdit(event.target);
    });
    artifactList.addEventListener('keydown', event => {
        if (!event.target.matches('.acs-artifact-content')) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveArtifactEdit(event.target);
        }
    });

    for (const radio of shell.querySelectorAll('input[name="acs-connection-mode"]')) {
        radio.addEventListener('change', event => {
            if (!event.target.checked) return;
            connectionSettings.mode = event.target.value === 'custom' ? 'custom' : 'current';
            saveConnectionSettings();
            renderConnectionSettings();
            renderCurrentStep();
        });
    }
    shell.querySelector('#acs-custom-source').addEventListener('change', event => {
        connectionSettings.source = event.target.value;
        saveConnectionSettings();
    });
    shell.querySelector('#acs-custom-api-url').addEventListener('input', event => {
        connectionSettings.apiUrl = event.target.value;
        saveConnectionSettings();
    });
    shell.querySelector('#acs-custom-api-key').addEventListener('input', event => {
        customApiKey = event.target.value;
    });
    shell.querySelector('#acs-custom-model').addEventListener('input', event => {
        connectionSettings.model = event.target.value;
        saveConnectionSettings();
        shell.querySelector('#acs-connection-summary').textContent = event.target.value.trim() || '等待配置';
        renderCurrentStep();
    });

    shell.querySelector('#acs-project-name').addEventListener('input', event => {
        const previousDefault = defaultOutputWorldbookName();
        project.name = event.target.value || '未命名世界';
        if (!project.output.worldbookName || project.output.worldbookName === previousDefault) {
            project.output.worldbookName = defaultOutputWorldbookName();
            shell.querySelector('#acs-output-worldbook').value = project.output.worldbookName;
        }
        saveProject();
        renderProjectMenu();
    });
    shell.querySelector('#acs-project-brief').addEventListener('input', event => {
        project.brief = event.target.value;
        saveProject();
    });

    const preferenceFields = {
        '#acs-ai-role': 'aiRole',
        '#acs-creator-role': 'creatorRole',
        '#acs-word-count': 'wordCount',
        '#acs-language': 'language',
        '#acs-person': 'person',
    };
    for (const [selector, key] of Object.entries(preferenceFields)) {
        shell.querySelector(selector).addEventListener('change', event => {
            project.preferences[key] = event.target.value;
            saveProject();
            renderCurrentStep();
        });
    }

    shell.querySelector('#acs-worldbook-select').addEventListener('change', event => {
        environment.worldbookName = event.target.value;
        project.sourceWorldbookName = event.target.value;
        saveProject();
    });
    shell.querySelector('#acs-character-name').addEventListener('input', event => {
        project.output.characterName = event.target.value;
        saveProject();
    });
    shell.querySelector('#acs-output-worldbook').addEventListener('input', event => {
        project.output.worldbookName = event.target.value;
        saveProject();
    });
    for (const tab of shell.querySelectorAll('[data-acs-tab]')) {
        tab.addEventListener('click', () => switchInspectorTab(tab.dataset.acsTab));
    }
    shell.querySelector('#acs-user-input').addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            generateCurrentStep();
        }
    });
}

function ensureStudioStyle() {
    if (document.querySelector(`#${SCRIPT_STYLE_ID}`)) return;
    const style = document.createElement('style');
    style.id = SCRIPT_STYLE_ID;
    style.textContent = `${STUDIO_CSS}\n${PROJECT_LIBRARY_CSS}\n${ARTIFACT_HISTORY_CSS}\n${PROMPT_INSPECTOR_CSS}\n${INTERACTIVE_TOUR_CSS}`;
    document.head.append(style);
}

async function ensureStudioLoaded() {
    if (shell?.isConnected) return;

    const existing = document.querySelector('#auto-card-studio');
    if (existing && existing.dataset.acsRuntime !== SCRIPT_RUNTIME_MARK) {
        // 删除旧插件留在当前页面中的隐藏界面，脚本版随后接管。
        existing.remove();
        document.querySelector('#auto-card-studio-launch')?.remove();
        document.body.classList.remove('acs-no-scroll');
    }

    ensureStudioStyle();
    const container = document.createElement('div');
    container.innerHTML = STUDIO_HTML;
    shell = container.querySelector('#auto-card-studio');
    shell.dataset.acsRuntime = SCRIPT_RUNTIME_MARK;
    document.body.append(shell);
    installProjectLibraryUI();
    installStudioToolsUI();
    installStyledSelects();
    bindStudioEvents();
    renderAll();
    await inspectEnvironment();
}

function showStudioRuntimeError(error) {
    try {
        ensureStudioStyle();
        if (!shell?.isConnected) {
            const container = document.createElement('div');
            container.innerHTML = STUDIO_HTML;
            shell = container.querySelector('#auto-card-studio');
            shell.dataset.acsRuntime = SCRIPT_RUNTIME_MARK;
            document.body.append(shell);
        }
        shell.classList.add('is-open');
        shell.setAttribute('aria-hidden', 'false');
        document.body.classList.add('acs-no-scroll');
        let banner = shell.querySelector('#acs-runtime-error');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'acs-runtime-error';
            banner.style.cssText = 'position:absolute;z-index:20;left:50%;top:92px;transform:translateX(-50%);max-width:min(760px,80vw);padding:14px 18px;border:1px solid #d9847f;border-radius:12px;background:#3a2926;color:#f4ddd8;box-shadow:0 12px 32px #0008;font:14px/1.6 sans-serif;';
            shell.querySelector('.acs-window')?.append(banner);
        }
        banner.textContent = `创作台初始化失败：${error?.message || error}。请把这段提示发给开发者。`;
    } catch (fallbackError) {
        console.error('[A.U.T.O Card Studio] 错误提示界面创建失败', fallbackError);
    }
}

async function openStudio() {
    try {
        await ensureStudioLoaded();
        shell.classList.add('is-open');
        shell.setAttribute('aria-hidden', 'false');
        document.body.classList.add('acs-no-scroll');
        renderAll();
        const initialFocus = project.ui.overviewCollapsed
            ? shell.querySelector('#acs-user-input')
            : shell.querySelector('#acs-project-brief');
        initialFocus.focus();
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 打开失败', error);
        showStudioRuntimeError(error);
        notify('error', `无法打开创作台：${error?.message || error}`);
    }
}

function closeStudio() {
    if (!shell || isGenerating) {
        if (isGenerating) notify('warning', '请先停止当前生成，再关闭创作台。');
        return;
    }
    if (tourActive) closeTour(false);
    closePromptPreview();
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    toggleProjectMenu(false);
    closeStyledSelects();
    shell.classList.remove('is-open');
    shell.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('acs-no-scroll');
}

function handleHostKeydown(event) {
    if (event.key !== 'Escape' || !shell?.classList.contains('is-open')) return;
    if (!shell.querySelector('#acs-prompt-preview')?.hidden) {
        closePromptPreview();
        return;
    }
    if (tourActive) {
        closeTour(false);
        return;
    }
    if (shell.querySelector('.acs-styled-select.is-open')) {
        closeStyledSelects();
        return;
    }
    if (!shell.querySelector('#acs-project-menu')?.hidden) {
        toggleProjectMenu(false);
        return;
    }
    if (artifactPanelExpanded) {
        toggleArtifactPanel(false);
        return;
    }
    closeStudio();
}

function cleanupScriptRuntime() {
    document.removeEventListener('keydown', handleHostKeydown);
    hostWindow.removeEventListener('resize', handleTourResize);
    if (launcherInstallTimer) hostWindow.clearInterval(launcherInstallTimer);
    if (projectMenuCloseTimer) hostWindow.clearTimeout(projectMenuCloseTimer);
    if (updateFeedbackTimer) hostWindow.clearTimeout(updateFeedbackTimer);
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    if (tourSceneTimer) hostWindow.clearTimeout(tourSceneTimer);
    document.querySelector('#auto-card-studio-wand-launcher')?.remove();
    document.body.classList.remove('acs-no-scroll');
    if (shell?.dataset.acsRuntime === SCRIPT_RUNTIME_MARK) shell.remove();
    document.querySelector(`#${SCRIPT_STYLE_ID}`)?.remove();
    shell = null;
}

const TOOLBAR_LAUNCHER_NAME = '打开 A.U.T.O 创作台';

function installToolbarLauncher() {
    const buttons = Array.from(document.querySelectorAll('.qr--button'));
    const button = buttons.find(item =>
        item.dataset.autoCardStudioLauncher === 'true'
        || item.textContent?.trim() === TOOLBAR_LAUNCHER_NAME,
    );
    if (!button) return false;

    button.dataset.autoCardStudioLauncher = 'true';
    button.title = '打开 A.U.T.O 角色卡创作台';
    button.setAttribute('aria-label', '打开 A.U.T.O 角色卡创作台');
    // 工具栏仅保留一个清晰的小图标，完整名称通过悬停提示和菜单入口提供。
    button.replaceChildren(Object.assign(document.createElement('i'), {
        className: 'fa-solid fa-hammer',
    }));
    return true;
}

function installWandLauncher() {
    const menu = document.querySelector('#extensionsMenu');
    if (!menu) return false;

    let item = menu.querySelector('#auto-card-studio-wand-launcher');
    if (!item) {
        item = document.createElement('div');
        item.id = 'auto-card-studio-wand-launcher';
        item.className = 'list-group-item flex-container flexGap5';
        item.title = '打开 A.U.T.O 角色卡创作台';
        item.innerHTML = `
            <div class="fa-fw fa-solid fa-hammer extensionsMenuExtensionButton" aria-hidden="true"></div>
            <span>A.U.T.O 角色卡创作台</span>
        `;
        item.addEventListener('click', openStudio);
        menu.append(item);
    }
    return true;
}

function installStudioLaunchers() {
    const syncLaunchers = () => {
        const toolbarReady = installToolbarLauncher();
        const wandReady = installWandLauncher();
        if (toolbarReady && wandReady && launcherInstallTimer) {
            hostWindow.clearInterval(launcherInstallTimer);
            launcherInstallTimer = null;
        }
    };

    syncLaunchers();
    if (!launcherInstallTimer) launcherInstallTimer = hostWindow.setInterval(syncLaunchers, 500);
    // 防止异常页面持续保留轮询；正常情况下两个入口会在首次检查时完成安装。
    hostWindow.setTimeout(() => {
        if (!launcherInstallTimer) return;
        hostWindow.clearInterval(launcherInstallTimer);
        launcherInstallTimer = null;
    }, 15000);
}

function compareVersions(left, right) {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);
    for (let index = 0; index < 3; index += 1) {
        if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
    }
    return 0;
}

async function getLatestPublishedVersion(forceRefresh = false) {
    try {
        const cached = JSON.parse(localStorage.getItem(UPDATE_CACHE_KEY) || 'null');
        if (
            !forceRefresh
            &&
            cached
            && /^\d+\.\d+\.\d+$/.test(String(cached.version || ''))
            && Date.now() - Number(cached.checkedAt || 0) < UPDATE_CHECK_INTERVAL
        ) {
            return cached.version;
        }
    } catch {
        // 缓存损坏时直接重新检查，不影响创作台启动。
    }

    const response = await hostWindow.fetch(UPDATE_CATALOG_URL, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github.raw+json' },
    });
    if (!response.ok) throw new Error(`更新索引请求失败：HTTP ${response.status}`);
    const catalog = await response.json();
    const entries = catalog?.categories?.['character-creation'];
    const entry = Array.isArray(entries) ? entries.find(item => item?.id === 'auto-card-studio') : null;
    const version = String(entry?.version || '').trim();
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('更新索引中的版本号无效');
    localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify({ version, checkedAt: Date.now() }));
    return version;
}

function showUpdateFeedback(message, state = '', duration = 3200) {
    const button = shell?.querySelector('#acs-check-update');
    const feedback = shell?.querySelector('#acs-update-feedback');
    if (!button || !feedback) return;

    button.classList.remove('is-checking', 'is-current', 'is-error');
    if (state) button.classList.add(`is-${state}`);
    feedback.textContent = message;
    feedback.hidden = false;
    button.title = message;
    if (updateFeedbackTimer) hostWindow.clearTimeout(updateFeedbackTimer);
    if (duration > 0) {
        updateFeedbackTimer = hostWindow.setTimeout(() => {
            feedback.hidden = true;
            button.classList.remove('is-current', 'is-error');
            button.title = `检查更新（当前 v${AUTO_CARD_STUDIO_VERSION}）`;
            updateFeedbackTimer = null;
        }, duration);
    }
}

async function checkForUpdatesManually() {
    if (isCheckingForUpdate) return;
    const button = shell?.querySelector('#acs-check-update');
    if (!button) return;

    isCheckingForUpdate = true;
    button.disabled = true;
    showUpdateFeedback('正在检查新版本…', 'checking', 0);
    try {
        // 手动检查明确绕过六小时缓存，保证用户看到远端最新结果。
        const latestVersion = await getLatestPublishedVersion(true);
        if (compareVersions(latestVersion, AUTO_CARD_STUDIO_VERSION) <= 0) {
            showUpdateFeedback(`已是最新版 v${AUTO_CARD_STUDIO_VERSION}`, 'current');
            notify('success', `当前已是最新版 v${AUTO_CARD_STUDIO_VERSION}。`);
            return;
        }

        const scriptResponse = await hostWindow.fetch(VERSIONED_SCRIPT_URL(latestVersion), { cache: 'no-store' });
        if (!scriptResponse.ok) throw new Error(`新版脚本尚未就绪：HTTP ${scriptResponse.status}`);
        showUpdateFeedback(`发现 v${latestVersion}，正在更新…`, 'checking', 0);
        notify('info', `发现新版本 v${latestVersion}，即将刷新并重新打开创作台。`);
        hostWindow.sessionStorage.setItem(UPDATE_REOPEN_KEY, latestVersion);
        hostWindow.setTimeout(() => hostWindow.location.reload(), 650);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 手动检查更新失败', error);
        showUpdateFeedback('检查失败，请稍后重试', 'error', 5000);
        notify('error', `检查更新失败：${error?.message || error}`);
    } finally {
        isCheckingForUpdate = false;
        if (button.isConnected) button.disabled = false;
    }
}

function startStudioRuntime() {
    document.addEventListener('keydown', handleHostKeydown);
    hostWindow.addEventListener('resize', handleTourResize);
    appendInexistentScriptButtons([{ name: TOOLBAR_LAUNCHER_NAME, visible: true }]);
    eventOn(getButtonEvent(TOOLBAR_LAUNCHER_NAME), openStudio);
    installStudioLaunchers();
    window.addEventListener('pagehide', cleanupScriptRuntime, { once: true });
    if (hostWindow.sessionStorage.getItem(UPDATE_REOPEN_KEY)) {
        hostWindow.sessionStorage.removeItem(UPDATE_REOPEN_KEY);
        hostWindow.setTimeout(openStudio, 0);
    }
}

async function startStudioWithAutoUpdate() {
    try {
        const latestVersion = await getLatestPublishedVersion();
        if (compareVersions(latestVersion, AUTO_CARD_STUDIO_VERSION) > 0) {
            console.info(`[A.U.T.O Card Studio] 发现新版本 ${latestVersion}，正在从 ${AUTO_CARD_STUDIO_VERSION} 自动更新。`);
            try {
                await import(VERSIONED_SCRIPT_URL(latestVersion));
                return;
            } catch (error) {
                // 新版本加载失败时继续启动当前版本，保证创作台仍然可用。
                console.warn(`[A.U.T.O Card Studio] 新版本 ${latestVersion} 加载失败，回退到 ${AUTO_CARD_STUDIO_VERSION}。`, error);
            }
        }
    } catch (error) {
        // GitHub 暂时不可用时不阻塞创作台，只跳过本次更新检查。
        console.warn(`[A.U.T.O Card Studio] 自动更新检查失败，继续使用 ${AUTO_CARD_STUDIO_VERSION}。`, error);
    }
    startStudioRuntime();
}

void startStudioWithAutoUpdate();
