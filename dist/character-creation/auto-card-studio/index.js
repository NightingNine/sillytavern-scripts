// A.U.T.O 角色卡创作台 v0.6.25 · 酒馆助手脚本核心包（内置自动更新器）

// 酒馆助手脚本运行在隐藏 iframe 中；界面需要挂载到 SillyTavern 主页面。
const hostWindow = window.parent;
const document = hostWindow.document;
const localStorage = hostWindow.localStorage;
const Option = hostWindow.Option;
const STUDIO_HTML = "<div id=\"auto-card-studio\" class=\"acs-shell\" aria-hidden=\"true\">\n  <div class=\"acs-backdrop\" data-acs-close></div>\n\n  <section class=\"acs-window\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"acs-title\">\n    <header class=\"acs-topbar\">\n      <div class=\"acs-brand\">\n        <span class=\"acs-brand-mark\" aria-hidden=\"true\">\n          <span class=\"acs-orbit\"></span>\n          <span class=\"acs-core\"></span>\n        </span>\n        <div>\n          <p class=\"acs-eyebrow\">L3 / CHARACTER FORGE</p>\n          <h1 id=\"acs-title\">A.U.T.O 角色卡创作台</h1>\n        </div>\n        <button id=\"acs-tour-launch\" class=\"acs-tour-launch\" type=\"button\" title=\"打开新手引导\">\n          <i class=\"fa-solid fa-compass\" aria-hidden=\"true\"></i>\n          <span>新手引导</span>\n        </button>\n      </div>\n\n      <div class=\"acs-topbar-actions\">\n        <div id=\"acs-dependency-status\" class=\"acs-dependency\" aria-live=\"polite\">\n          <span class=\"acs-status-dot\"></span>\n          <span>正在检查创作环境</span>\n        </div>\n        <div class=\"acs-update-control\">\n          <button id=\"acs-check-update\" class=\"acs-icon-button acs-update-button\" type=\"button\" title=\"检查更新（当前 v0.5.22）\" aria-label=\"检查更新\">\n            <i class=\"fa-solid fa-rotate\" aria-hidden=\"true\"></i>\n          </button>\n          <span id=\"acs-update-feedback\" class=\"acs-update-feedback\" role=\"status\" aria-live=\"polite\" hidden></span>\n        </div>\n        <button id=\"acs-save-project\" class=\"acs-icon-button\" type=\"button\" title=\"导出项目\">\n          <i class=\"fa-solid fa-box-archive\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">导出项目</span>\n        </button>\n        <button id=\"acs-inspector-toggle\" class=\"acs-icon-button\" type=\"button\" title=\"打开项目检查器\" aria-expanded=\"false\">\n          <i class=\"fa-solid fa-table-columns\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">打开项目检查器</span>\n        </button>\n        <button class=\"acs-icon-button\" type=\"button\" data-acs-close title=\"关闭创作台\">\n          <i class=\"fa-solid fa-xmark\" aria-hidden=\"true\"></i>\n          <span class=\"acs-visually-hidden\">关闭创作台</span>\n        </button>\n      </div>\n    </header>\n\n    <div class=\"acs-workspace\">\n      <aside class=\"acs-rail\" aria-label=\"创作流程\">\n        <div class=\"acs-project-identity\">\n          <div class=\"acs-project-title-field\">\n            <label for=\"acs-project-name\">当前项目</label>\n            <span class=\"acs-project-name-control\">\n              <span class=\"acs-project-title-icon\" aria-hidden=\"true\">\n                <i class=\"fa-solid fa-folder-open\"></i>\n              </span>\n              <input id=\"acs-project-name\" type=\"text\" maxlength=\"80\" placeholder=\"未命名世界\">\n              <i class=\"fa-solid fa-pen\" aria-hidden=\"true\"></i>\n            </span>\n          </div>\n          <div class=\"acs-progress-row\">\n            <span id=\"acs-progress-copy\">0 / 30</span>\n            <span id=\"acs-progress-percent\">0%</span>\n          </div>\n          <div class=\"acs-progress-track\" aria-hidden=\"true\">\n            <span id=\"acs-progress-bar\"></span>\n          </div>\n        </div>\n\n        <nav id=\"acs-step-rail\" class=\"acs-step-rail\" aria-label=\"A.U.T.O 创作步骤\"></nav>\n\n        <button id=\"acs-new-project\" class=\"acs-quiet-action\" type=\"button\">\n          <i class=\"fa-solid fa-plus\" aria-hidden=\"true\"></i>\n          新建项目\n        </button>\n      </aside>\n\n      <main class=\"acs-stage\">\n        <div class=\"acs-stage-heading\">\n          <div>\n            <p id=\"acs-step-kicker\" class=\"acs-eyebrow\">PHASE 01</p>\n            <h2 id=\"acs-step-title\">交互范式和美学纲领</h2>\n            <p id=\"acs-step-goal\" class=\"acs-step-goal\"></p>\n          </div>\n          <div class=\"acs-stage-heading-actions\">\n            <span id=\"acs-step-state\" class=\"acs-state-chip\">未开始</span>\n            <button id=\"acs-toggle-overview\" class=\"acs-overview-toggle\" type=\"button\" aria-expanded=\"true\" aria-controls=\"acs-brief-panel\" title=\"收起创作概览\">\n              <i class=\"fa-solid fa-chevron-up\" aria-hidden=\"true\"></i>\n              <span>收起概览</span>\n            </button>\n          </div>\n        </div>\n\n        <section id=\"acs-brief-panel\" class=\"acs-brief-panel\">\n          <div class=\"acs-section-label\">\n            <span>创作母题</span>\n            <span>贯穿全部 30 个阶段</span>\n          </div>\n          <textarea id=\"acs-project-brief\" rows=\"5\" placeholder=\"描述你想创作的世界、主控角色、核心体验、边界与参考作品。无需一次写完，后续可以持续补充。\"></textarea>\n        </section>\n\n        <section class=\"acs-conversation\" aria-label=\"本阶段对话\">\n          <div id=\"acs-empty-turns\" class=\"acs-empty-turns\" aria-live=\"polite\">\n            <span class=\"acs-empty-glyph\">◎</span>\n            <span id=\"acs-empty-kicker\" class=\"acs-empty-kicker\">STATION 01 · 创作航标</span>\n            <h3 id=\"acs-empty-title\">先定下这段体验的方向</h3>\n            <p id=\"acs-empty-description\">不用一次写完整套设定。先告诉 A.U.T.O 玩家要体验什么，以及这段创作必须遵守的边界。</p>\n            <div class=\"acs-guide-panel\">\n              <span>可以从这些问题开始</span>\n              <ol id=\"acs-empty-prompts\" class=\"acs-guide-prompts\"></ol>\n            </div>\n          </div>\n          <div id=\"acs-turns\" class=\"acs-turns\" aria-live=\"polite\"></div>\n        </section>\n\n        <section class=\"acs-composer\" aria-label=\"向 A.U.T.O 补充说明\">\n          <label id=\"acs-user-input-label\" for=\"acs-user-input\">本轮补充 · 交互范式和美学纲领</label>\n          <textarea id=\"acs-user-input\" rows=\"3\" placeholder=\"可以留空直接生成；也可以指出偏好、修改方向或要求 A.U.T.O 接续未完成内容。\"></textarea>\n          <div class=\"acs-composer-actions\">\n            <p id=\"acs-generation-hint\">将使用配套预设与当前步骤提示词</p>\n            <div>\n              <button id=\"acs-stop-generation\" class=\"acs-button acs-button-danger\" type=\"button\" hidden>\n                <i class=\"fa-solid fa-stop\" aria-hidden=\"true\"></i>\n                停止\n              </button>\n              <button id=\"acs-generate\" class=\"acs-button acs-button-primary\" type=\"button\">\n                <i class=\"fa-solid fa-wand-magic-sparkles\" aria-hidden=\"true\"></i>\n                生成阶段草案\n              </button>\n              <button id=\"acs-accept-step\" class=\"acs-button acs-button-confirm\" type=\"button\" disabled>\n                确认并前往下一站\n                <i class=\"fa-solid fa-arrow-right\" aria-hidden=\"true\"></i>\n              </button>\n            </div>\n          </div>\n        </section>\n      </main>\n\n      <aside class=\"acs-inspector\" aria-label=\"项目检查器\">\n        <div class=\"acs-tabs\" role=\"tablist\" aria-label=\"检查器标签\">\n          <button class=\"acs-tab is-active\" type=\"button\" role=\"tab\" aria-selected=\"true\" data-acs-tab=\"structure\">产物</button>\n          <button class=\"acs-tab\" type=\"button\" role=\"tab\" aria-selected=\"false\" data-acs-tab=\"settings\">设置</button>\n          <button class=\"acs-tab\" type=\"button\" role=\"tab\" aria-selected=\"false\" data-acs-tab=\"publish\">发布</button>\n        </div>\n\n        <div class=\"acs-tab-panel is-active\" data-acs-panel=\"structure\">\n          <div class=\"acs-inspector-intro\">\n            <div>\n              <span>结构解析</span>\n              <strong id=\"acs-block-count\">0 个区块</strong>\n            </div>\n            <button id=\"acs-expand-artifacts\" class=\"acs-inspector-action\" type=\"button\" title=\"放大产物工作区\" aria-pressed=\"false\">\n              <i class=\"fa-solid fa-expand\" aria-hidden=\"true\"></i>\n              <span>放大</span>\n            </button>\n          </div>\n          <p class=\"acs-inspector-help\">仅显示 A.U.T.O 预设规定的最终产物；同名产物默认显示最新版，可切换历史并恢复。</p>\n          <div id=\"acs-artifact-list\" class=\"acs-artifact-list\"></div>\n        </div>\n\n        <div class=\"acs-tab-panel\" data-acs-panel=\"settings\" hidden>\n          <section class=\"acs-connection-section\" aria-labelledby=\"acs-connection-title\">\n            <div class=\"acs-settings-heading\">\n              <div>\n                <span id=\"acs-connection-title\">模型连接</span>\n                <small>决定创作台从哪里调用 AI</small>\n              </div>\n              <strong id=\"acs-connection-summary\">跟随 SillyTavern</strong>\n            </div>\n\n            <div class=\"acs-connection-options\" role=\"radiogroup\" aria-label=\"模型连接方式\">\n              <label class=\"acs-connection-choice\">\n                <input type=\"radio\" name=\"acs-connection-mode\" value=\"current\" checked>\n                <span>\n                  <strong>使用当前连接</strong>\n                  <small>跟随 SillyTavern 当前选择的接口和模型</small>\n                </span>\n              </label>\n              <label class=\"acs-connection-choice\">\n                <input type=\"radio\" name=\"acs-connection-mode\" value=\"custom\">\n                <span>\n                  <strong>单独配置</strong>\n                  <small>只让这个创作台使用另一套接口和模型</small>\n                </span>\n              </label>\n            </div>\n\n            <div id=\"acs-custom-connection\" class=\"acs-custom-connection\" hidden>\n              <div class=\"acs-field-stack\">\n                <label>\n                  <span>接口类型</span>\n                  <select id=\"acs-custom-source\">\n                    <option value=\"openai\">OpenAI / OpenAI 兼容接口</option>\n                    <option value=\"openrouter\">OpenRouter</option>\n                    <option value=\"claude\">Anthropic Claude</option>\n                    <option value=\"makersuite\">Google AI Studio / Gemini</option>\n                    <option value=\"deepseek\">DeepSeek</option>\n                    <option value=\"mistralai\">Mistral AI</option>\n                    <option value=\"groq\">Groq</option>\n                    <option value=\"xai\">xAI</option>\n                    <option value=\"custom\">SillyTavern Custom</option>\n                  </select>\n                </label>\n                <label>\n                  <span>接口地址</span>\n                  <input id=\"acs-custom-api-url\" type=\"url\" inputmode=\"url\" spellcheck=\"false\" placeholder=\"例如：https://api.example.com/v1\">\n                </label>\n                <label>\n                  <span>API 密钥（可以留空）</span>\n                  <input id=\"acs-custom-api-key\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"仅在当前页面中保留\">\n                </label>\n                <div class=\"acs-model-field\">\n                  <label for=\"acs-custom-model\">模型名称</label>\n                  <div class=\"acs-model-picker\">\n                    <input id=\"acs-custom-model\" type=\"text\" list=\"acs-custom-model-options\" spellcheck=\"false\" placeholder=\"例如：gpt-4.1-mini\">\n                    <button id=\"acs-fetch-models\" class=\"acs-button acs-button-compact\" type=\"button\">\n                      <i class=\"fa-solid fa-rotate\" aria-hidden=\"true\"></i>\n                      获取模型\n                    </button>\n                  </div>\n                  <datalist id=\"acs-custom-model-options\"></datalist>\n                </div>\n              </div>\n              <p class=\"acs-security-note\">\n                <i class=\"fa-solid fa-shield-halved\" aria-hidden=\"true\"></i>\n                密钥不会写入项目、导出文件或长期存储；刷新页面后需要重新填写。\n              </p>\n            </div>\n          </section>\n\n          <p class=\"acs-settings-section-label\">创作流程</p>\n          <div class=\"acs-field-stack\">\n            <div id=\"acs-preset-lock\" class=\"acs-fixed-resource\" aria-live=\"polite\">\n              <div class=\"acs-fixed-resource-icon\" aria-hidden=\"true\">\n                <i class=\"fa-solid fa-lock\"></i>\n              </div>\n              <div class=\"acs-fixed-resource-copy\">\n                <span>固定预设</span>\n                <strong id=\"acs-preset-name\">正在查找 A.U.T.O v2.0</strong>\n                <small>创作台始终读取这份预设，不跟随主界面当前选择。</small>\n              </div>\n              <span class=\"acs-fixed-resource-badge\">已锁定</span>\n            </div>\n            <label>\n              <span>世界书模板</span>\n              <select id=\"acs-worldbook-select\"></select>\n            </label>\n            <div class=\"acs-field-grid\">\n              <label>\n                <span>助手称呼</span>\n                <input id=\"acs-ai-role\" type=\"text\" value=\"A.U.T.O.\">\n              </label>\n              <label>\n                <span>创作者</span>\n                <input id=\"acs-creator-role\" type=\"text\" value=\"创作者\">\n              </label>\n              <label>\n                <span>目标字数</span>\n                <input id=\"acs-word-count\" type=\"text\" value=\"3000\">\n              </label>\n              <label>\n                <span>输出语言</span>\n                <input id=\"acs-language\" type=\"text\" value=\"中文\">\n              </label>\n            </div>\n            <label>\n              <span>叙事人称</span>\n              <select id=\"acs-person\">\n                <option value=\"第三人称\">第三人称</option>\n                <option value=\"第一人称\">第一人称</option>\n                <option value=\"第二人称\">第二人称</option>\n              </select>\n            </label>\n          </div>\n        </div>\n\n        <div class=\"acs-tab-panel\" data-acs-panel=\"publish\" hidden>\n          <div class=\"acs-publish-copy\">\n            <p class=\"acs-eyebrow\">HANDOFF</p>\n            <h3>交付到 SillyTavern</h3>\n            <p>创建一份项目世界书，并把它绑定到角色卡。若名称已存在，会在最终确认后更新。</p>\n          </div>\n          <div class=\"acs-field-stack\">\n            <label>\n              <span>角色卡名称</span>\n              <input id=\"acs-character-name\" type=\"text\" placeholder=\"例如：雾港来客\">\n            </label>\n            <label>\n              <span>世界书名称</span>\n              <input id=\"acs-output-worldbook\" type=\"text\" placeholder=\"自动跟随项目名称\">\n            </label>\n          </div>\n          <button id=\"acs-publish\" class=\"acs-button acs-button-publish\" type=\"button\">\n            <i class=\"fa-solid fa-feather-pointed\" aria-hidden=\"true\"></i>\n            创建角色卡与世界书\n          </button>\n          <button id=\"acs-download-dossier\" class=\"acs-button acs-button-secondary\" type=\"button\">\n            <i class=\"fa-solid fa-file-arrow-down\" aria-hidden=\"true\"></i>\n            下载创作档案\n          </button>\n          <p id=\"acs-publish-note\" class=\"acs-publish-note\">建议至少完成 Step 1、Step 5 与 Step 30 后发布。</p>\n        </div>\n      </aside>\n    </div>\n  </section>\n\n  <div id=\"acs-tour-overlay\" class=\"acs-tour-overlay\" aria-hidden=\"true\" hidden>\n    <div id=\"acs-tour-spotlight\" class=\"acs-tour-spotlight\" aria-hidden=\"true\"></div>\n    <section id=\"acs-tour-card\" class=\"acs-tour-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"acs-tour-title\">\n      <header class=\"acs-tour-card-head\">\n        <span id=\"acs-tour-progress\" class=\"acs-tour-progress\">1 / 6</span>\n        <button id=\"acs-tour-skip\" class=\"acs-tour-skip\" type=\"button\">跳过引导</button>\n      </header>\n      <p id=\"acs-tour-eyebrow\" class=\"acs-tour-eyebrow\">PROJECT 01</p>\n      <h2 id=\"acs-tour-title\">从一个项目开始</h2>\n      <p id=\"acs-tour-description\" class=\"acs-tour-description\"></p>\n      <div id=\"acs-tour-dots\" class=\"acs-tour-dots\" aria-hidden=\"true\"></div>\n      <footer class=\"acs-tour-actions\">\n        <button id=\"acs-tour-previous\" class=\"acs-tour-nav acs-tour-previous\" type=\"button\">\n          <i class=\"fa-solid fa-arrow-left\" aria-hidden=\"true\"></i>\n          上一步\n        </button>\n        <button id=\"acs-tour-next\" class=\"acs-tour-nav acs-tour-next\" type=\"button\">\n          <span>下一步</span>\n          <i class=\"fa-solid fa-arrow-right\" aria-hidden=\"true\"></i>\n        </button>\n      </footer>\n    </section>\n  </div>\n</div>\n\n<input id=\"acs-import-project\" type=\"file\" accept=\"application/json,.json\" hidden>\n";
const STUDIO_CSS = ":root {\n  --acs-void: #1e1c19;\n  --acs-ink: #2b2925;\n  --acs-panel: #302e29;\n  --acs-panel-raised: #38352f;\n  --acs-line: #59534b;\n  --acs-line-soft: rgba(232, 224, 212, 0.12);\n  --acs-text: #e8e2d8;\n  --acs-text-soft: #d0c8bd;\n  --acs-muted: #aba297;\n  --acs-cyan: #d97757;\n  --acs-cyan-soft: rgba(217, 119, 87, 0.14);\n  --acs-violet: #b7a3cf;\n  --acs-gold: #d3ad72;\n  --acs-green: #93bd91;\n  --acs-red: #d9847f;\n  --acs-shadow: 0 28px 80px rgba(10, 9, 8, 0.42);\n  --acs-display: \"Iowan Old Style\", \"Noto Serif SC\", \"Songti SC\", Georgia, serif;\n  --acs-body: Inter, \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif;\n  --acs-mono: \"JetBrains Mono\", \"Cascadia Code\", Consolas, monospace;\n}\n\n#auto-card-studio,\n#auto-card-studio * {\n  box-sizing: border-box;\n}\n\n.acs-shell {\n  position: fixed;\n  inset: 0;\n  z-index: 10001;\n  display: none;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  isolation: isolate;\n}\n\n.acs-shell.is-open {\n  display: block;\n}\n\n.acs-shell [hidden] {\n  display: none !important;\n}\n\n.acs-backdrop {\n  position: absolute;\n  inset: 0;\n  background: rgba(17, 15, 13, 0.72);\n  backdrop-filter: blur(14px);\n}\n\n.acs-window {\n  position: absolute;\n  inset: 2.2vh 1.6vw;\n  display: grid;\n  grid-template-rows: 72px minmax(0, 1fr);\n  overflow: hidden;\n  border: 1px solid rgba(217, 202, 182, 0.22);\n  border-radius: 22px;\n  background:\n    radial-gradient(circle at 88% 8%, rgba(183, 163, 207, 0.08), transparent 27%),\n    radial-gradient(circle at 10% 84%, rgba(217, 119, 87, 0.07), transparent 25%),\n    var(--acs-ink);\n  box-shadow: var(--acs-shadow);\n}\n\n.acs-window::before {\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  background-image:\n    linear-gradient(rgba(232, 224, 212, 0.025) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(232, 224, 212, 0.025) 1px, transparent 1px);\n  background-size: 42px 42px;\n  content: \"\";\n  mask-image: linear-gradient(to bottom, black, transparent 72%);\n  pointer-events: none;\n}\n\n.acs-topbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-width: 0;\n  padding: 0 22px 0 26px;\n  border-bottom: 1px solid var(--acs-line-soft);\n  background: rgba(43, 41, 37, 0.96);\n  box-shadow: 0 5px 22px rgba(10, 9, 8, 0.14);\n}\n\n.acs-brand,\n.acs-topbar-actions,\n.acs-progress-row,\n.acs-stage-heading,\n.acs-composer-actions,\n.acs-composer-actions > div,\n.acs-inspector-intro,\n.acs-artifact-head {\n  display: flex;\n  align-items: center;\n}\n\n.acs-brand {\n  min-width: 0;\n  gap: 15px;\n}\n\n.acs-brand h1 {\n  margin: 1px 0 0;\n  overflow: hidden;\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: clamp(20px, 2vw, 27px);\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  line-height: 1.05;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-tour-launch {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  min-height: 31px;\n  padding: 6px 11px;\n  border: 1px solid rgba(211, 173, 114, 0.3);\n  border-radius: 999px;\n  background: rgba(211, 173, 114, 0.07);\n  color: #d6bd95;\n  cursor: pointer;\n  font-size: 10px;\n  font-weight: 650;\n  white-space: nowrap;\n  transition: border-color 150ms ease, background 150ms ease, color 150ms ease, transform 150ms ease;\n}\n\n.acs-tour-launch:hover {\n  border-color: rgba(211, 173, 114, 0.58);\n  background: rgba(211, 173, 114, 0.13);\n  color: #ecd4ae;\n  transform: translateY(-1px);\n}\n\n.acs-tour-launch i {\n  color: var(--acs-gold);\n  font-size: 11px;\n}\n\n.acs-tour-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 10060;\n  overflow: hidden;\n  pointer-events: auto;\n}\n\n.acs-tour-spotlight {\n  position: fixed;\n  z-index: 0;\n  border: 1px solid rgba(229, 174, 111, 0.9);\n  border-radius: 13px;\n  background: transparent;\n  box-shadow: 0 0 0 9999px rgba(18, 16, 13, 0.76), 0 0 0 5px rgba(217, 119, 87, 0.12), 0 0 28px rgba(229, 174, 111, 0.28);\n  pointer-events: none;\n  transition: left 340ms cubic-bezier(0.22, 1, 0.36, 1), top 340ms cubic-bezier(0.22, 1, 0.36, 1), width 340ms cubic-bezier(0.22, 1, 0.36, 1), height 340ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n\n.acs-tour-spotlight::after {\n  position: absolute;\n  inset: -6px;\n  border: 1px solid rgba(229, 174, 111, 0.38);\n  border-radius: 17px;\n  content: \"\";\n  animation: acs-tour-breathe 1.8s ease-in-out infinite;\n}\n\n.acs-tour-card {\n  position: fixed;\n  z-index: 1;\n  width: min(344px, calc(100vw - 32px));\n  padding: 18px;\n  border: 1px solid rgba(217, 176, 124, 0.34);\n  border-radius: 15px;\n  background: linear-gradient(145deg, #3b3730, #302d28 72%);\n  box-shadow: 0 22px 60px rgba(8, 7, 6, 0.48);\n  color: var(--acs-text);\n  transition: left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n\n.acs-tour-card.is-refreshing {\n  animation: acs-tour-card-in 260ms ease-out;\n}\n\n.acs-tour-card-head,\n.acs-tour-actions {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.acs-tour-progress {\n  color: var(--acs-gold);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n}\n\n.acs-tour-skip {\n  padding: 3px 0;\n  border: 0;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 10px;\n}\n\n.acs-tour-skip:hover {\n  color: var(--acs-text);\n}\n\n.acs-tour-eyebrow {\n  margin: 18px 0 5px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.17em;\n}\n\n.acs-tour-card h2 {\n  margin: 0;\n  font-family: var(--acs-display);\n  font-size: 22px;\n  font-weight: 550;\n  line-height: 1.25;\n}\n\n.acs-tour-description {\n  min-height: 68px;\n  margin: 10px 0 15px;\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-tour-dots {\n  display: flex;\n  gap: 5px;\n  margin-bottom: 15px;\n}\n\n.acs-tour-dot {\n  width: 16px;\n  height: 3px;\n  border-radius: 999px;\n  background: rgba(232, 224, 212, 0.16);\n  transition: width 180ms ease, background 180ms ease;\n}\n\n.acs-tour-dot.is-past {\n  background: rgba(211, 173, 114, 0.42);\n}\n\n.acs-tour-dot.is-active {\n  width: 28px;\n  background: var(--acs-cyan);\n}\n\n.acs-tour-actions {\n  gap: 10px;\n  padding-top: 13px;\n  border-top: 1px solid var(--acs-line-soft);\n}\n\n.acs-tour-nav {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  min-height: 34px;\n  padding: 7px 11px;\n  border: 1px solid var(--acs-line);\n  border-radius: 8px;\n  background: #3b3832;\n  color: var(--acs-text-soft);\n  cursor: pointer;\n  font-size: 10px;\n  font-weight: 650;\n}\n\n.acs-tour-nav:disabled {\n  cursor: default;\n  opacity: 0.32;\n}\n\n.acs-tour-next {\n  margin-left: auto;\n  border-color: rgba(217, 119, 87, 0.48);\n  background: rgba(217, 119, 87, 0.14);\n  color: #f0d8cd;\n}\n\n@keyframes acs-tour-breathe {\n  0%, 100% { opacity: 0.45; transform: scale(0.995); }\n  50% { opacity: 1; transform: scale(1.012); }\n}\n\n@keyframes acs-tour-card-in {\n  from { opacity: 0.55; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.acs-eyebrow {\n  margin: 0;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.18em;\n  line-height: 1.4;\n  text-transform: uppercase;\n}\n\n.acs-brand-mark {\n  position: relative;\n  flex: 0 0 auto;\n  width: 38px;\n  height: 38px;\n}\n\n.acs-orbit,\n.acs-orbit::before {\n  position: absolute;\n  inset: 4px;\n  border: 1px solid var(--acs-cyan);\n  border-radius: 50%;\n  content: \"\";\n  transform: rotate(-26deg) scaleY(0.52);\n}\n\n.acs-orbit::before {\n  inset: -5px;\n  border-color: rgba(183, 163, 207, 0.62);\n  transform: rotate(68deg) scaleY(0.65);\n}\n\n.acs-core {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--acs-gold);\n  box-shadow: 0 0 16px rgba(211, 173, 114, 0.34);\n  transform: translate(-50%, -50%);\n}\n\n.acs-topbar-actions {\n  gap: 10px;\n}\n\n.acs-update-control {\n  position: relative;\n  flex: 0 0 auto;\n}\n\n.acs-update-button {\n  color: var(--acs-muted);\n}\n\n.acs-update-button:hover,\n.acs-update-button.is-current {\n  color: var(--acs-green);\n}\n\n.acs-update-button.is-error {\n  color: var(--acs-red);\n}\n\n.acs-update-button.is-checking i {\n  animation: acs-update-spin 760ms linear infinite;\n}\n\n.acs-update-feedback {\n  position: absolute;\n  top: calc(100% + 9px);\n  right: 0;\n  z-index: 12;\n  width: max-content;\n  max-width: min(260px, 70vw);\n  padding: 7px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 9px;\n  color: var(--acs-text-soft);\n  background: #35322d;\n  box-shadow: 0 10px 28px rgba(10, 9, 8, 0.32);\n  font-size: 11px;\n  line-height: 1.4;\n  white-space: nowrap;\n}\n\n.acs-update-feedback::before {\n  position: absolute;\n  top: -5px;\n  right: 12px;\n  width: 8px;\n  height: 8px;\n  border-top: 1px solid var(--acs-line);\n  border-left: 1px solid var(--acs-line);\n  background: #35322d;\n  content: \"\";\n  transform: rotate(45deg);\n}\n\n@keyframes acs-update-spin {\n  to { transform: rotate(360deg); }\n}\n\n.acs-dependency {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  max-width: 280px;\n  padding: 7px 11px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  background: rgba(56, 53, 47, 0.72);\n  font-size: 12px;\n  white-space: nowrap;\n}\n\n.acs-status-dot {\n  flex: 0 0 auto;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--acs-gold);\n  box-shadow: 0 0 10px currentColor;\n}\n\n.acs-dependency.is-ready .acs-status-dot {\n  background: var(--acs-green);\n}\n\n.acs-dependency.is-error .acs-status-dot {\n  background: var(--acs-red);\n}\n\n.acs-icon-button,\n.acs-button,\n.acs-tab,\n.acs-quiet-action,\n.acs-step-button {\n  color: inherit;\n  font: inherit;\n}\n\n.acs-icon-button {\n  display: grid;\n  width: 36px;\n  height: 36px;\n  padding: 0;\n  border: 1px solid transparent;\n  border-radius: 50%;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  place-items: center;\n}\n\n.acs-icon-button:hover,\n.acs-icon-button:focus-visible {\n  border-color: var(--acs-line);\n  background: var(--acs-panel-raised);\n  color: var(--acs-text);\n}\n\n.acs-workspace {\n  display: grid;\n  grid-template-columns: minmax(220px, 16vw) minmax(440px, 1fr) minmax(300px, 21vw);\n  min-height: 0;\n}\n\n.acs-rail,\n.acs-stage,\n.acs-inspector {\n  min-width: 0;\n  min-height: 0;\n}\n\n.acs-rail {\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var(--acs-line-soft);\n  background: #292722;\n}\n\n.acs-project-identity {\n  padding: 16px 14px 15px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-composer > label,\n.acs-field-stack label > span {\n  display: block;\n  margin-bottom: 7px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n}\n\n.acs-project-title-field {\n  display: block;\n}\n\n.acs-project-title-icon {\n  display: grid;\n  width: 32px;\n  height: 32px;\n  border: 0;\n  border-radius: 11px;\n  background: rgba(217, 119, 87, 0.13);\n  color: var(--acs-cyan);\n  font-size: 11px;\n  place-items: center;\n}\n\n.acs-project-title-field label {\n  display: block;\n  margin: 0 0 7px 4px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.11em;\n  text-transform: uppercase;\n}\n\n.acs-project-name-control {\n  display: grid;\n  grid-template-columns: 32px minmax(0, 1fr) 28px;\n  gap: 4px;\n  align-items: center;\n  min-height: 48px;\n  padding: 6px 7px;\n  border: 1px solid rgba(232, 224, 212, 0.14);\n  border-radius: 16px;\n  background: #38352f;\n  box-shadow: 0 7px 20px rgba(10, 9, 8, 0.18);\n  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;\n}\n\n.acs-project-name-control input {\n  width: 100%;\n  min-width: 0;\n  padding: 4px 8px;\n  border: 0;\n  border-radius: 10px;\n  outline: 0;\n  background: transparent !important;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 15px;\n  font-weight: 700;\n}\n\n.acs-project-name-control > i {\n  display: grid;\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: #45413a;\n  color: var(--acs-muted);\n  font-size: 9px;\n  opacity: 0.8;\n  place-items: center;\n}\n\n.acs-project-name-control:focus-within {\n  border-color: rgba(217, 119, 87, 0.58);\n  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1), 0 9px 24px rgba(10, 9, 8, 0.22);\n  transform: translateY(-1px);\n}\n\n.acs-project-title-field:focus-within .acs-project-name-control > i {\n  color: var(--acs-cyan);\n  opacity: 1;\n}\n\n.acs-progress-row {\n  justify-content: space-between;\n  margin-top: 12px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-progress-track {\n  height: 2px;\n  margin-top: 7px;\n  overflow: hidden;\n  background: var(--acs-line);\n}\n\n.acs-progress-track span {\n  display: block;\n  width: 0;\n  height: 100%;\n  background: linear-gradient(90deg, var(--acs-cyan), var(--acs-violet));\n  transition: width 260ms ease;\n}\n\n.acs-step-rail {\n  flex: 1 1 auto;\n  overflow: auto;\n  padding: 12px 8px 24px;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-phase-group + .acs-phase-group {\n  margin-top: 7px;\n}\n\n.acs-phase-toggle {\n  position: relative;\n  z-index: 1;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto 13px;\n  gap: 7px;\n  align-items: center;\n  width: 100%;\n  min-height: 32px;\n  padding: 6px 8px 6px 12px;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  text-align: left;\n}\n\n.acs-phase-toggle:hover,\n.acs-phase-toggle:focus-visible {\n  border-color: var(--acs-line-soft);\n  background: rgba(56, 53, 47, 0.82);\n  color: var(--acs-text);\n}\n\n.acs-phase-title {\n  overflow: hidden;\n  letter-spacing: 0.1em;\n  text-overflow: ellipsis;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n\n.acs-phase-progress {\n  padding: 2px 5px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 999px;\n  font-size: 7px;\n  letter-spacing: 0;\n}\n\n.acs-phase-toggle i {\n  font-size: 8px;\n  text-align: center;\n  transition: transform 160ms ease;\n}\n\n.acs-phase-group.is-collapsed .acs-phase-toggle i {\n  transform: rotate(-90deg);\n}\n\n.acs-phase-steps {\n  position: relative;\n  padding: 2px 0 4px 10px;\n}\n\n.acs-phase-steps::before {\n  position: absolute;\n  top: 3px;\n  bottom: 5px;\n  left: 20px;\n  width: 1px;\n  background: linear-gradient(var(--acs-cyan), var(--acs-line) 28%, var(--acs-line) 78%, var(--acs-violet));\n  content: \"\";\n  opacity: 0.38;\n}\n\n.acs-step-button {\n  position: relative;\n  z-index: 1;\n  display: grid;\n  grid-template-columns: 27px minmax(0, 1fr) 15px;\n  align-items: center;\n  width: 100%;\n  min-height: 37px;\n  padding: 4px 7px 4px 0;\n  border: 0;\n  border-radius: 9px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  text-align: left;\n}\n\n.acs-step-button:hover {\n  color: var(--acs-text);\n}\n\n.acs-step-button.is-active {\n  background: linear-gradient(90deg, rgba(217, 119, 87, 0.18), rgba(56, 53, 47, 0.28));\n  color: var(--acs-text);\n}\n\n.acs-step-node {\n  display: grid;\n  width: 15px;\n  height: 15px;\n  margin-left: 6px;\n  border: 1px solid var(--acs-line);\n  border-radius: 50%;\n  background: var(--acs-ink);\n  color: transparent;\n  font-size: 7px;\n  place-items: center;\n}\n\n.acs-step-button.is-active .acs-step-node {\n  border-color: var(--acs-cyan);\n  background: var(--acs-cyan);\n  box-shadow: 0 0 0 4px rgba(217, 119, 87, 0.1), 0 4px 12px rgba(217, 119, 87, 0.22);\n}\n\n.acs-step-button.is-complete .acs-step-node {\n  border-color: var(--acs-green);\n  background: var(--acs-green);\n  color: var(--acs-void);\n}\n\n.acs-step-button.is-draft .acs-step-node {\n  border-color: var(--acs-gold);\n  background: var(--acs-gold);\n}\n\n.acs-step-name {\n  overflow: hidden;\n  font-size: 12px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-step-number {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  text-align: right;\n}\n\n.acs-quiet-action {\n  flex: 0 0 auto;\n  margin: 8px 14px 14px;\n  padding: 10px;\n  border: 1px dashed var(--acs-line);\n  border-radius: 10px;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 12px;\n}\n\n.acs-quiet-action:hover {\n  border-color: var(--acs-cyan);\n  color: var(--acs-text);\n}\n\n.acs-stage {\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  background: #302e29;\n}\n\n.acs-stage-heading {\n  flex: 0 0 auto;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 25px 28px 18px;\n  transition: padding 160ms ease, background 160ms ease;\n}\n\n.acs-stage-heading h2 {\n  margin: 4px 0 5px;\n  font-family: var(--acs-display);\n  font-size: clamp(24px, 2.4vw, 34px);\n  font-weight: 500;\n  line-height: 1.18;\n}\n\n.acs-step-goal {\n  max-width: 760px;\n  margin: 0;\n  color: var(--acs-muted);\n  font-size: 13px;\n  line-height: 1.65;\n}\n\n.acs-stage-heading-actions {\n  display: flex;\n  flex: 0 0 auto;\n  align-items: center;\n  gap: 8px;\n}\n\n.acs-overview-toggle {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  min-height: 30px;\n  padding: 5px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  outline: 0;\n  background: #38352f;\n  color: var(--acs-muted);\n  font-family: var(--acs-body);\n  font-size: 10px;\n  cursor: pointer;\n  transition: border-color 150ms ease, color 150ms ease, background 150ms ease;\n}\n\n.acs-overview-toggle:hover,\n.acs-overview-toggle:focus-visible {\n  border-color: rgba(217, 119, 87, 0.5);\n  background: #413d36;\n  color: var(--acs-cyan);\n}\n\n.acs-overview-toggle i {\n  font-size: 9px;\n}\n\n/* 收起后保留一条“飞行条”，仍可确认当前步骤与状态。 */\n.acs-stage.is-overview-collapsed .acs-stage-heading {\n  min-height: 48px;\n  align-items: center;\n  padding: 8px 20px;\n  border-bottom: 1px solid var(--acs-line-soft);\n  background: #2b2925;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading > div:first-child {\n  display: grid;\n  min-width: 0;\n  grid-template-columns: auto minmax(0, 1fr);\n  align-items: center;\n  gap: 10px;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading .acs-eyebrow {\n  margin: 0;\n  white-space: nowrap;\n}\n\n.acs-stage.is-overview-collapsed .acs-stage-heading h2 {\n  overflow: hidden;\n  margin: 0;\n  font-family: var(--acs-body);\n  font-size: 14px;\n  font-weight: 650;\n  line-height: 1.3;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-stage.is-overview-collapsed .acs-step-goal {\n  display: none;\n}\n\n.acs-state-chip {\n  flex: 0 0 auto;\n  padding: 6px 10px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-state-chip.is-draft {\n  border-color: rgba(211, 173, 114, 0.45);\n  color: var(--acs-gold);\n}\n\n.acs-state-chip.is-complete {\n  border-color: rgba(147, 189, 145, 0.45);\n  color: var(--acs-green);\n}\n\n.acs-brief-panel {\n  flex: 0 0 auto;\n  margin: 0 28px 16px;\n  padding: 14px 16px 12px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 14px;\n  background: #38352f;\n  box-shadow: 0 6px 20px rgba(10, 9, 8, 0.12);\n}\n\n.acs-section-label {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n}\n\n.acs-section-label span:last-child {\n  color: var(--acs-muted);\n  letter-spacing: 0;\n  text-transform: none;\n}\n\n.acs-brief-panel textarea,\n.acs-composer textarea,\n.acs-field-stack input,\n.acs-field-stack select {\n  width: 100%;\n  border: 1px solid var(--acs-line);\n  outline: 0;\n  background: #34312c !important;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n}\n\n.acs-brief-panel textarea {\n  min-height: 72px;\n  padding: 0;\n  border: 0;\n  background: transparent !important;\n  font-size: 13px;\n  line-height: 1.65;\n  resize: vertical;\n}\n\n.acs-brief-panel textarea:focus,\n.acs-composer textarea:focus,\n.acs-field-stack input:focus,\n.acs-field-stack select:focus {\n  border-color: var(--acs-cyan);\n  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);\n}\n\n.acs-conversation {\n  position: relative;\n  flex: 1 1 auto;\n  min-height: 120px;\n  overflow: auto;\n  padding: 10px 28px 24px;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-empty-turns {\n  display: grid;\n  min-height: 100%;\n  padding: 30px;\n  color: var(--acs-muted);\n  text-align: center;\n  justify-items: center;\n  place-content: center;\n}\n\n.acs-empty-turns[hidden] {\n  display: none;\n}\n\n.acs-empty-glyph {\n  color: var(--acs-cyan);\n  font-size: 44px;\n  font-weight: 200;\n  line-height: 1;\n  opacity: 0.7;\n}\n\n.acs-empty-kicker {\n  margin-top: 12px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.acs-empty-turns h3 {\n  margin: 7px 0 6px;\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: 21px;\n  font-weight: 500;\n}\n\n.acs-empty-turns p {\n  max-width: 620px;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.65;\n}\n\n.acs-guide-panel {\n  width: min(100%, 680px);\n  margin-top: 22px;\n  padding-top: 14px;\n  border-top: 1px solid var(--acs-line-soft);\n  text-align: left;\n}\n\n.acs-guide-panel > span {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n}\n\n.acs-guide-prompts {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 8px;\n  margin: 9px 0 0;\n  padding: 0;\n  list-style: none;\n  counter-reset: guide-prompt;\n}\n\n.acs-guide-prompts li {\n  position: relative;\n  min-height: 64px;\n  padding: 10px 10px 10px 31px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #38352f;\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.55;\n  counter-increment: guide-prompt;\n}\n\n.acs-guide-prompts li::before {\n  position: absolute;\n  top: 10px;\n  left: 10px;\n  color: var(--acs-cyan);\n  content: counter(guide-prompt, decimal-leading-zero);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  letter-spacing: 0.05em;\n  opacity: 0.78;\n}\n\n.acs-turns {\n  display: grid;\n  gap: 14px;\n}\n\n.acs-turn {\n  position: relative;\n  max-width: min(92%, 900px);\n  padding: 14px 16px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 14px;\n  background: #38352f;\n  box-shadow: 0 6px 22px rgba(10, 9, 8, 0.12);\n}\n\n.acs-turn.is-user {\n  margin-left: auto;\n  border-color: rgba(217, 119, 87, 0.24);\n  background: #3a3330;\n}\n\n.acs-turn-label {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 8px;\n  margin-bottom: 8px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n}\n\n.acs-turn.is-user .acs-turn-label {\n  justify-content: flex-end;\n  color: var(--acs-violet);\n  text-align: right;\n}\n\n.acs-turn-retry {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  min-height: 23px;\n  padding: 2px 7px;\n  border: 1px solid transparent;\n  border-radius: 999px;\n  outline: 0;\n  background: transparent;\n  color: inherit;\n  font: 600 9px/1 var(--acs-body);\n  cursor: pointer;\n  opacity: 0.68;\n  transition: border-color 140ms ease, background 140ms ease, opacity 140ms ease;\n}\n\n.acs-turn-retry:hover,\n.acs-turn-retry:focus-visible {\n  border-color: rgba(217, 119, 87, 0.32);\n  background: rgba(217, 119, 87, 0.1);\n  opacity: 1;\n}\n\n.acs-turn-retry:disabled {\n  cursor: not-allowed;\n  opacity: 0.35;\n}\n\n.acs-turn-content {\n  margin: 0;\n  overflow: visible;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 12px;\n  line-height: 1.72;\n  word-break: break-word;\n}\n\npre.acs-turn-content {\n  white-space: pre-wrap;\n}\n\n.acs-turn-content > :first-child {\n  margin-top: 0;\n}\n\n.acs-turn-content > :last-child {\n  margin-bottom: 0;\n}\n\n.acs-turn-content details {\n  margin: 8px 0;\n  overflow: hidden;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #2f2c28;\n}\n\n.acs-turn-content summary {\n  padding: 8px 10px;\n  cursor: pointer;\n}\n\n.acs-turn-content details:not(.acs-code-block) > :not(summary) {\n  margin-right: 10px;\n  margin-left: 10px;\n}\n\n.acs-turn-content pre {\n  position: relative;\n  max-width: 100%;\n  overflow: auto;\n  margin: 12px 0;\n  padding: 34px 12px 12px;\n  border: 1px solid rgba(232, 224, 212, 0.2);\n  border-radius: 9px;\n  background: transparent;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n  white-space: pre-wrap;\n}\n\n.acs-turn-content .acs-code-block {\n  margin: 12px 0;\n  overflow: hidden;\n  border: 1px solid rgba(232, 224, 212, 0.2);\n  border-radius: 9px;\n  background: transparent;\n}\n\n.acs-turn-content .acs-code-block summary {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 30px;\n  padding: 6px 10px;\n  border: 0;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 0.12em;\n  list-style: none;\n  text-transform: uppercase;\n  transition: background 140ms ease;\n}\n\n.acs-turn-content .acs-code-block summary::-webkit-details-marker {\n  display: none;\n}\n\n.acs-turn-content .acs-code-block summary:hover,\n.acs-turn-content .acs-code-block summary:focus-visible {\n  background: rgba(217, 119, 87, 0.08);\n}\n\n.acs-turn-content .acs-code-block[open] summary {\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-turn-content .acs-code-block summary i {\n  font-size: 8px;\n  transform: rotate(-90deg);\n  transition: transform 150ms ease;\n}\n\n.acs-turn-content .acs-code-block[open] summary i {\n  transform: rotate(0deg);\n}\n\n.acs-turn-content .acs-code-block > pre.acs-code-content {\n  margin: 0;\n  padding: 12px;\n  border: 0;\n  border-radius: 0;\n  background: transparent;\n  color: var(--acs-text);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-turn-content pre > code {\n  display: block;\n  padding: 0;\n  border: 0;\n  background: transparent !important;\n  color: inherit;\n  font: inherit;\n  white-space: pre-wrap;\n}\n\n/* AUTO 的“说明和建议”原本使用代码围栏；此处按说明文字展示，避免全局 code 样式形成逐行黑底。 */\n.acs-turn-content details:not(.acs-code-block) > pre {\n  margin: 0 10px 10px;\n  padding: 10px 2px 2px;\n  border: 0;\n  border-top: 1px solid var(--acs-line-soft);\n  border-radius: 0;\n  background: transparent;\n  color: var(--acs-muted);\n  font-family: var(--acs-body);\n  font-size: 11px;\n  line-height: 1.75;\n}\n\n.acs-turn-content details > pre > code {\n  white-space: pre-wrap;\n}\n\n.acs-composer {\n  flex: 0 0 auto;\n  padding: 15px 28px 20px;\n  border-top: 1px solid var(--acs-line-soft);\n  background: #292722;\n  box-shadow: 0 -5px 20px rgba(10, 9, 8, 0.12);\n}\n\n.acs-composer textarea {\n  min-height: 58px;\n  padding: 10px 12px;\n  border-radius: 10px;\n  font-size: 12px;\n  line-height: 1.55;\n  resize: vertical;\n}\n\n.acs-composer-actions {\n  justify-content: space-between;\n  gap: 14px;\n  margin-top: 10px;\n}\n\n.acs-composer-actions > div {\n  gap: 8px;\n}\n\n.acs-composer-actions p {\n  margin: 0;\n  color: var(--acs-muted);\n  font-size: 10px;\n}\n\n.acs-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  min-height: 36px;\n  padding: 8px 13px;\n  border: 1px solid var(--acs-line);\n  border-radius: 9px;\n  background: var(--acs-panel-raised);\n  color: var(--acs-text);\n  cursor: pointer;\n  font-size: 11px;\n  font-weight: 650;\n  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;\n}\n\n.acs-button:hover:not(:disabled) {\n  border-color: var(--acs-cyan);\n  transform: translateY(-1px);\n}\n\n.acs-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.38;\n}\n\n.acs-button-primary {\n  border-color: rgba(217, 119, 87, 0.46);\n  background: var(--acs-cyan-soft);\n}\n\n.acs-button-confirm {\n  border-color: rgba(147, 189, 145, 0.42);\n  background: rgba(147, 189, 145, 0.11);\n  color: #b9d7b7;\n}\n\n.acs-button-danger {\n  border-color: rgba(217, 132, 127, 0.44);\n  background: rgba(217, 132, 127, 0.11);\n  color: #edaaa6;\n}\n\n.acs-inspector {\n  position: relative;\n  overflow: auto;\n  border-left: 1px solid var(--acs-line-soft);\n  background: #292722;\n  scrollbar-color: var(--acs-line) transparent;\n  scrollbar-width: thin;\n}\n\n.acs-inspector.is-expanded {\n  position: absolute;\n  top: 72px;\n  right: 0;\n  bottom: 0;\n  z-index: 8;\n  width: min(72vw, 1080px);\n  border-left-color: rgba(217, 119, 87, 0.24);\n  background: #2b2925;\n  box-shadow: -28px 0 70px rgba(10, 9, 8, 0.34);\n}\n\n.acs-tabs {\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  padding: 11px 14px 0;\n  background: rgba(41, 39, 34, 0.96);\n  backdrop-filter: blur(8px);\n}\n\n.acs-tab {\n  padding: 10px 5px;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  background: transparent;\n  color: var(--acs-muted);\n  cursor: pointer;\n  font-size: 11px;\n}\n\n.acs-tab.is-active {\n  border-color: var(--acs-cyan);\n  color: var(--acs-text);\n}\n\n.acs-tab-panel {\n  padding: 20px 18px 28px;\n}\n\n.acs-tab-panel[hidden] {\n  display: none;\n}\n\n#acs-inspector-toggle {\n  display: none;\n}\n\n.acs-inspector-intro {\n  justify-content: space-between;\n  gap: 12px;\n  color: var(--acs-muted);\n  font-size: 11px;\n}\n\n.acs-inspector-intro > div {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.acs-inspector-intro strong {\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n}\n\n.acs-inspector-action,\n.acs-artifact-action {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  min-height: 28px;\n  padding: 5px 8px;\n  border: 1px solid var(--acs-line);\n  border-radius: 7px;\n  background: rgba(56, 53, 47, 0.86);\n  color: var(--acs-muted);\n  cursor: pointer;\n  font: 600 9px/1 var(--acs-body);\n}\n\n.acs-inspector-action:hover,\n.acs-inspector-action.is-active,\n.acs-artifact-action:hover {\n  border-color: rgba(217, 119, 87, 0.5);\n  color: var(--acs-cyan);\n}\n\n.acs-inspector-help,\n.acs-publish-copy p,\n.acs-publish-note {\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.6;\n}\n\n.acs-artifact-list {\n  display: grid;\n  gap: 8px;\n  margin-top: 17px;\n}\n\n.acs-artifact-empty {\n  padding: 22px 10px;\n  border-top: 1px solid var(--acs-line-soft);\n  border-bottom: 1px solid var(--acs-line-soft);\n  color: var(--acs-muted);\n  font-size: 11px;\n  line-height: 1.6;\n  text-align: center;\n}\n\n.acs-artifact {\n  overflow: hidden;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 10px;\n  background: #35322d;\n}\n\n.acs-artifact summary {\n  padding: 10px 11px;\n  cursor: pointer;\n  list-style: none;\n}\n\n.acs-artifact summary::-webkit-details-marker {\n  display: none;\n}\n\n.acs-artifact-head {\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.acs-artifact-name {\n  overflow: hidden;\n  color: var(--acs-text);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-artifact-step {\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n}\n\n.acs-artifact-editor {\n  border-top: 1px solid var(--acs-line-soft);\n  background: #2d2b27;\n}\n\n.acs-artifact-toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 9px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-artifact-save-state {\n  color: var(--acs-green);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n}\n\n.acs-artifact-save-state.is-pending {\n  color: var(--acs-gold);\n}\n\n.acs-artifact-editor textarea.acs-artifact-content {\n  display: block;\n  width: 100%;\n  min-height: 260px;\n  max-height: 56vh;\n  margin: 0;\n  overflow: auto;\n  padding: 15px 16px;\n  border: 0;\n  outline: 0;\n  resize: vertical;\n  background: #302e29 !important;\n  color: #f0e9df !important;\n  caret-color: var(--acs-cyan);\n  font-family: var(--acs-body);\n  font-size: 12px;\n  font-weight: 450;\n  line-height: 1.78;\n  letter-spacing: 0.008em;\n  white-space: pre-wrap;\n  word-break: break-word;\n  tab-size: 2;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n}\n\n.acs-artifact-editor textarea.acs-artifact-content:focus {\n  background: #34312c !important;\n  box-shadow: inset 2px 0 0 rgba(217, 119, 87, 0.72);\n}\n\n.acs-artifact-editor textarea.acs-artifact-content::selection {\n  background: rgba(217, 119, 87, 0.3);\n  color: #fff8ee;\n}\n\n.acs-inspector.is-expanded .acs-artifact-content {\n  min-height: 360px;\n  max-height: 68vh;\n  font-size: 13px;\n  line-height: 1.82;\n}\n\n.acs-field-stack {\n  display: grid;\n  gap: 15px;\n}\n\n.acs-fixed-resource {\n  display: grid;\n  grid-template-columns: 34px minmax(0, 1fr) auto;\n  gap: 10px;\n  align-items: center;\n  padding: 11px;\n  border: 1px solid rgba(217, 119, 87, 0.28);\n  border-radius: 9px;\n  background: linear-gradient(110deg, rgba(217, 119, 87, 0.1), rgba(56, 53, 47, 0.82));\n}\n\n.acs-fixed-resource-icon {\n  display: grid;\n  width: 32px;\n  height: 32px;\n  place-items: center;\n  border: 1px solid rgba(217, 119, 87, 0.24);\n  border-radius: 8px;\n  color: var(--acs-cyan);\n  background: rgba(217, 119, 87, 0.1);\n  font-size: 11px;\n}\n\n.acs-fixed-resource-copy {\n  min-width: 0;\n}\n\n.acs-fixed-resource-copy > span,\n.acs-fixed-resource-copy > strong,\n.acs-fixed-resource-copy > small {\n  display: block;\n}\n\n.acs-fixed-resource-copy > span {\n  margin-bottom: 3px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n}\n\n.acs-fixed-resource-copy > strong {\n  overflow: hidden;\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  font-weight: 650;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-fixed-resource-copy > small {\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.45;\n}\n\n.acs-fixed-resource-badge {\n  padding: 4px 7px;\n  border: 1px solid rgba(217, 119, 87, 0.26);\n  border-radius: 999px;\n  color: var(--acs-cyan);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  white-space: nowrap;\n}\n\n.acs-fixed-resource.is-missing {\n  border-color: rgba(217, 132, 127, 0.42);\n  background: rgba(217, 132, 127, 0.08);\n}\n\n.acs-fixed-resource.is-missing .acs-fixed-resource-icon,\n.acs-fixed-resource.is-missing .acs-fixed-resource-badge {\n  border-color: rgba(217, 132, 127, 0.3);\n  color: var(--acs-red);\n}\n\n.acs-connection-section {\n  margin-bottom: 20px;\n  padding-bottom: 18px;\n  border-bottom: 1px solid var(--acs-line-soft);\n}\n\n.acs-settings-heading {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n\n.acs-settings-heading span,\n.acs-settings-section-label {\n  color: var(--acs-text);\n  font-family: var(--acs-display);\n  font-size: 15px;\n  font-weight: 500;\n}\n\n.acs-settings-heading small {\n  display: block;\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 10px;\n}\n\n.acs-settings-heading > strong {\n  max-width: 48%;\n  overflow: hidden;\n  padding: 5px 8px;\n  border: 1px solid var(--acs-line);\n  border-radius: 999px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 8px;\n  font-weight: 700;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.acs-settings-heading > strong.is-custom {\n  border-color: rgba(183, 163, 207, 0.38);\n  background: rgba(183, 163, 207, 0.1);\n  color: #cbb9dd;\n}\n\n.acs-connection-options {\n  display: grid;\n  gap: 8px;\n}\n\n.acs-connection-choice {\n  display: grid;\n  grid-template-columns: 18px minmax(0, 1fr);\n  gap: 9px;\n  align-items: start;\n  padding: 10px;\n  border: 1px solid var(--acs-line-soft);\n  border-radius: 9px;\n  background: #35322d;\n  cursor: pointer;\n}\n\n.acs-connection-choice:has(input:checked) {\n  border-color: rgba(217, 119, 87, 0.4);\n  background: rgba(217, 119, 87, 0.1);\n}\n\n.acs-field-stack .acs-connection-choice input,\n.acs-connection-choice input {\n  width: 14px;\n  min-height: 14px;\n  margin: 2px 0 0;\n  accent-color: var(--acs-cyan);\n}\n\n.acs-field-stack .acs-connection-choice > span,\n.acs-connection-choice > span {\n  margin: 0;\n}\n\n.acs-connection-choice strong,\n.acs-connection-choice small {\n  display: block;\n}\n\n.acs-connection-choice strong {\n  color: var(--acs-text-soft);\n  font-size: 11px;\n  font-weight: 650;\n}\n\n.acs-connection-choice small {\n  margin-top: 3px;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.45;\n}\n\n.acs-custom-connection {\n  margin-top: 10px;\n  padding: 13px;\n  border-left: 2px solid rgba(183, 163, 207, 0.5);\n  border-radius: 0 10px 10px 0;\n  background: rgba(183, 163, 207, 0.08);\n}\n\n.acs-custom-connection[hidden] {\n  display: none;\n}\n\n.acs-model-picker {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 7px;\n}\n\n.acs-model-field > label {\n  display: block;\n  margin-bottom: 7px;\n  color: var(--acs-muted);\n  font-family: var(--acs-mono);\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n}\n\n.acs-button-compact {\n  min-height: 38px;\n  padding: 7px 10px;\n  border-color: var(--acs-line);\n  background: rgba(217, 119, 87, 0.08);\n  white-space: nowrap;\n}\n\n.acs-security-note {\n  display: flex;\n  gap: 7px;\n  margin: 12px 0 0;\n  color: var(--acs-muted);\n  font-size: 9px;\n  line-height: 1.55;\n}\n\n.acs-security-note i {\n  margin-top: 2px;\n  color: var(--acs-violet);\n}\n\n.acs-settings-section-label {\n  margin: 0 0 13px;\n}\n\n.acs-field-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 12px;\n}\n\n.acs-field-stack input,\n.acs-field-stack select {\n  min-height: 38px;\n  padding: 8px 9px;\n  border-radius: 8px;\n  font-size: 11px;\n}\n\n.acs-field-stack select {\n  padding-right: 36px;\n  appearance: none;\n  color-scheme: dark;\n  background-color: #34312c !important;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='m1 1 5 5 5-5' fill='none' stroke='%23d97757' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3C/svg%3E\") !important;\n  background-repeat: no-repeat !important;\n  background-position: right 12px center !important;\n  background-size: 11px 7px !important;\n  cursor: pointer;\n  transition: border-color 140ms ease, background-color 140ms ease;\n}\n\n.acs-field-stack select:hover {\n  border-color: rgba(217, 119, 87, 0.46);\n  background-color: #3b3832 !important;\n}\n\n.acs-field-stack select option {\n  background: #2d2b27;\n  color: var(--acs-text);\n}\n\n.acs-publish-copy h3 {\n  margin: 5px 0 8px;\n  font-family: var(--acs-display);\n  font-size: 22px;\n  font-weight: 500;\n}\n\n.acs-button-publish,\n.acs-button-secondary {\n  width: 100%;\n  margin-top: 16px;\n}\n\n.acs-button-publish {\n  min-height: 43px;\n  border-color: rgba(211, 173, 114, 0.48);\n  background: rgba(211, 173, 114, 0.11);\n  color: #e2c28f;\n}\n\n.acs-button-secondary {\n  margin-top: 8px;\n  background: transparent;\n}\n\n.acs-publish-note {\n  margin-top: 14px;\n  padding-left: 10px;\n  border-left: 2px solid var(--acs-gold);\n}\n\n.acs-visually-hidden {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n\n.acs-shell button:focus-visible,\n.acs-shell input:focus-visible,\n.acs-shell textarea:focus-visible,\n.acs-shell select:focus-visible {\n  outline: 2px solid var(--acs-cyan);\n  outline-offset: 2px;\n}\n\nbody.acs-no-scroll {\n  overflow: hidden !important;\n}\n\n@media (max-width: 1120px) {\n  .acs-tour-launch {\n    width: 32px;\n    padding: 6px;\n    justify-content: center;\n  }\n\n  .acs-tour-launch span {\n    display: none;\n  }\n\n  .acs-window {\n    inset: 1vh 1vw;\n  }\n\n  .acs-workspace {\n    grid-template-columns: 205px minmax(0, 1fr) 280px;\n  }\n\n  .acs-composer-actions {\n    align-items: flex-end;\n  }\n\n  .acs-composer-actions p {\n    display: none;\n  }\n}\n\n@media (max-width: 860px) {\n  .acs-window {\n    inset: 0;\n    grid-template-rows: 64px minmax(0, 1fr);\n    border: 0;\n    border-radius: 0;\n  }\n\n  .acs-dependency {\n    display: none;\n  }\n\n  .acs-workspace {\n    grid-template-columns: 68px minmax(0, 1fr);\n  }\n\n  .acs-rail {\n    grid-column: 1;\n  }\n\n  .acs-stage {\n    grid-column: 2;\n  }\n\n  .acs-inspector {\n    position: absolute;\n    top: 64px;\n    right: 0;\n    bottom: 0;\n    z-index: 5;\n    display: none;\n    width: min(88vw, 340px);\n    box-shadow: -18px 0 50px rgba(0, 0, 0, 0.4);\n  }\n\n  .acs-inspector.is-mobile-open {\n    display: block;\n  }\n\n  .acs-inspector.is-expanded {\n    top: 64px;\n    width: min(96vw, 860px);\n  }\n\n  #acs-inspector-toggle {\n    display: grid;\n  }\n\n  .acs-project-identity {\n    padding: 12px 7px;\n  }\n\n  .acs-project-title-field,\n  .acs-progress-row,\n  .acs-step-name,\n  .acs-step-number,\n  .acs-quiet-action {\n    display: none;\n  }\n\n  .acs-progress-track {\n    margin: 0;\n  }\n\n  .acs-step-rail {\n    padding-right: 7px;\n    padding-left: 7px;\n  }\n\n  .acs-phase-toggle {\n    display: grid;\n    grid-template-columns: 1fr;\n    width: 39px;\n    min-height: 28px;\n    margin: 0 auto;\n    padding: 6px;\n  }\n\n  .acs-phase-title,\n  .acs-phase-progress {\n    display: none;\n  }\n\n  .acs-phase-steps {\n    padding-left: 0;\n  }\n\n  .acs-phase-steps::before {\n    left: 13px;\n  }\n\n  .acs-step-button {\n    grid-template-columns: 27px;\n    width: 39px;\n  }\n\n  .acs-stage-heading,\n  .acs-composer {\n    padding-right: 17px;\n    padding-left: 17px;\n  }\n\n  .acs-brief-panel {\n    margin-right: 17px;\n    margin-left: 17px;\n  }\n\n  .acs-conversation {\n    padding-right: 17px;\n    padding-left: 17px;\n  }\n\n  .acs-guide-prompts {\n    grid-template-columns: 1fr;\n  }\n\n  .acs-guide-prompts li {\n    min-height: 0;\n  }\n\n  .acs-composer-actions {\n    display: block;\n  }\n\n  .acs-composer-actions > div {\n    display: grid;\n    grid-template-columns: auto 1fr;\n  }\n\n  .acs-button-confirm {\n    grid-column: 1 / -1;\n  }\n}\n\n@media (max-width: 560px) {\n  .acs-brand h1 {\n    font-size: 17px;\n  }\n\n  .acs-brand .acs-eyebrow,\n  #acs-save-project {\n    display: none;\n  }\n\n  .acs-brand-mark {\n    width: 30px;\n    height: 30px;\n  }\n\n  .acs-topbar {\n    padding: 0 12px;\n  }\n\n  .acs-stage-heading {\n    align-items: flex-start;\n  }\n\n  .acs-state-chip {\n    display: none;\n  }\n\n  .acs-overview-toggle span {\n    display: none;\n  }\n\n  .acs-overview-toggle {\n    width: 30px;\n    padding: 5px;\n  }\n\n  .acs-stage-heading h2 {\n    font-size: 25px;\n  }\n\n  .acs-section-label span:last-child {\n    display: none;\n  }\n\n  .acs-turn {\n    max-width: 100%;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .acs-progress-track span,\n  .acs-button,\n  .acs-stage-heading,\n  .acs-overview-toggle,\n  .acs-update-button i,\n  .acs-tour-launch,\n  .acs-tour-spotlight,\n  .acs-tour-spotlight::after,\n  .acs-tour-card,\n  .acs-tour-card.is-refreshing {\n    transition: none;\n    animation: none;\n  }\n}\n";
const HTML_PREVIEW_CSS = `
.acs-code-summary-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.acs-turn-content .acs-code-preview-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 22px;
    padding: 3px 8px;
    border: 1px solid rgba(232, 224, 212, 0.16);
    border-radius: 999px;
    background: rgba(56, 53, 47, 0.72);
    color: var(--acs-muted);
    cursor: pointer;
    font-family: var(--acs-body);
    font-size: 9px;
    font-weight: 650;
    letter-spacing: 0;
    line-height: 1;
    text-transform: none;
    transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.acs-turn-content .acs-code-preview-toggle:hover,
.acs-turn-content .acs-code-preview-toggle:focus-visible,
.acs-turn-content .acs-code-preview-toggle.is-active {
    border-color: rgba(217, 119, 87, 0.52);
    background: rgba(217, 119, 87, 0.12);
    color: #f0d8cd;
}

/* 覆盖代码块折叠箭头的旋转规则，避免预览按钮内的图标跟着旋转。 */
.acs-turn-content .acs-code-block summary .acs-code-preview-toggle i {
    font-size: 9px;
    transform: none;
}

.acs-html-preview {
    min-height: 420px;
    padding: 10px;
    background:
        linear-gradient(45deg, rgba(232, 224, 212, 0.035) 25%, transparent 25%, transparent 75%, rgba(232, 224, 212, 0.035) 75%),
        linear-gradient(45deg, rgba(232, 224, 212, 0.035) 25%, transparent 25%, transparent 75%, rgba(232, 224, 212, 0.035) 75%),
        #292722;
    background-position: 0 0, 8px 8px;
    background-size: 16px 16px;
}

.acs-html-preview-frame {
    display: block;
    width: 100%;
    height: clamp(420px, 58vh, 720px);
    border: 1px solid rgba(232, 224, 212, 0.22);
    border-radius: 7px;
    background: white;
    box-shadow: 0 12px 30px rgba(10, 9, 8, 0.24);
}

@media (max-width: 560px) {
    .acs-turn-content .acs-code-preview-toggle span {
        display: none;
    }

    .acs-html-preview,
    .acs-html-preview-frame {
        min-height: 340px;
    }

    .acs-html-preview-frame {
        height: 52vh;
    }
}
`;

const OUTPUT_MODE_CSS = `
.acs-output-mode {
    margin-top: 14px;
    padding-top: 13px;
    border-top: 1px solid var(--acs-line-soft);
}

.acs-output-mode > span {
    display: block;
    margin-bottom: 8px;
    color: var(--acs-muted);
    font-family: var(--acs-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.acs-output-mode-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.acs-output-mode .acs-connection-choice {
    min-width: 0;
    padding: 9px;
}

.acs-output-mode .acs-connection-choice small {
    line-height: 1.4;
}

@media (max-width: 420px) {
    .acs-output-mode-options {
        grid-template-columns: 1fr;
    }
}
`;

const MODEL_PICKER_CSS = `
.acs-model-combobox {
  position: relative;
  min-width: 0;
}

.acs-model-combobox > input {
  width: 100%;
  padding-right: 40px;
}

.acs-model-list-toggle {
  position: absolute;
  top: 1px;
  right: 1px;
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--acs-line-soft);
  border-radius: 0 8px 8px 0;
  background: rgba(56, 53, 47, 0.72);
  color: var(--acs-cyan);
  cursor: pointer;
  place-items: center;
}

.acs-model-list-toggle:hover,
.acs-model-list-toggle:focus-visible,
.acs-model-combobox.is-open .acs-model-list-toggle {
  background: rgba(217, 119, 87, 0.12);
  color: #f0d8cd;
}

.acs-model-list-toggle i {
  font-size: 9px;
  transition: transform 150ms ease;
}

.acs-model-combobox.is-open .acs-model-list-toggle i {
  transform: rotate(180deg);
}

.acs-model-options {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 35;
  display: grid;
  gap: 3px;
  max-height: min(260px, 42vh);
  padding: 6px;
  overflow: auto;
  border: 1px solid rgba(232, 224, 212, 0.2);
  border-radius: 11px;
  background: #302d28;
  box-shadow: 0 16px 38px rgba(10, 9, 8, 0.46), 0 2px 8px rgba(10, 9, 8, 0.24);
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-model-combobox.opens-up .acs-model-options {
  top: auto;
  bottom: calc(100% + 6px);
}

.acs-model-option {
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
  cursor: pointer;
  font: 500 11px/1.45 var(--acs-body);
  text-align: left;
}

.acs-model-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-model-option:hover,
.acs-model-option:focus-visible,
.acs-model-option.is-selected {
  border-color: rgba(217, 119, 87, 0.28);
  background: rgba(217, 119, 87, 0.1);
  color: var(--acs-text);
  outline: none;
}

.acs-model-option i {
  color: var(--acs-cyan);
  font-size: 9px;
  text-align: center;
}

.acs-model-options-empty {
  margin: 0;
  padding: 13px 10px;
  color: var(--acs-muted);
  font-size: 10px;
  line-height: 1.55;
  text-align: center;
}
`;

const CONVERSATION_NAV_CSS = `
.acs-composer {
  position: relative;
}

.acs-conversation-nav {
  position: absolute;
  top: 0;
  right: 28px;
  z-index: 4;
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid rgba(232, 224, 212, 0.16);
  border-radius: 999px;
  background: rgba(43, 41, 37, 0.94);
  box-shadow: 0 8px 22px rgba(10, 9, 8, 0.28);
  backdrop-filter: blur(8px);
  transform: translateY(calc(-100% - 6px));
}

.acs-conversation-nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 27px;
  padding: 5px 9px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--acs-muted);
  cursor: pointer;
  font: 650 9px/1 var(--acs-body);
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.acs-conversation-nav-button:hover,
.acs-conversation-nav-button:focus-visible {
  outline: 0;
  background: rgba(217, 119, 87, 0.13);
  color: #f0d8cd;
  transform: translateY(-1px);
}

.acs-conversation-nav-button i {
  color: var(--acs-cyan);
  font-size: 8px;
}

@media (max-width: 860px) {
  .acs-conversation-nav {
    right: 17px;
  }
}

@media (max-width: 560px) {
  .acs-conversation-nav-button span {
    display: none;
  }

  .acs-conversation-nav-button {
    width: 27px;
    padding: 5px;
  }
}
`;

const COMPACT_STAGE_HEADER_CSS = `
/* 桌面端放大左侧阶段分类，提升名称与进度的辨识度。 */
.acs-shell:not(.acs-mobile-layout) .acs-phase-title {
  font-size: 11px;
  line-height: 1.35;
}

.acs-shell:not(.acs-mobile-layout) .acs-phase-progress {
  font-size: 8px;
}

/* 步骤标题始终保持为紧凑控制条；创作母题从其下方展开。 */
.acs-stage-heading,
.acs-shell.acs-proportional-layout .acs-stage-heading,
.acs-stage.is-overview-collapsed .acs-stage-heading,
.acs-shell.acs-proportional-layout .acs-stage.is-overview-collapsed .acs-stage-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--acs-line-soft);
  background: #2b2925;
  cursor: pointer;
}

.acs-stage-heading:hover { background: #302d28; }

.acs-stage-heading:focus-visible {
  outline: 2px solid var(--acs-cyan);
  outline-offset: -2px;
}

.acs-stage-heading > div:first-child,
.acs-stage.is-overview-collapsed .acs-stage-heading > div:first-child {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}

.acs-stage-heading .acs-eyebrow,
.acs-stage.is-overview-collapsed .acs-stage-heading .acs-eyebrow {
  margin: 0;
  font-size: 8px;
  white-space: nowrap;
}

.acs-stage-heading h2,
.acs-shell.acs-proportional-layout .acs-stage-heading h2,
.acs-stage.is-overview-collapsed .acs-stage-heading h2,
.acs-shell.acs-proportional-layout .acs-stage.is-overview-collapsed .acs-stage-heading h2 {
  overflow: hidden;
  margin: 0;
  color: var(--acs-text);
  font-family: var(--acs-body);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-stage-heading .acs-step-goal,
.acs-stage.is-overview-collapsed .acs-step-goal {
  display: block;
  min-width: 0;
  max-width: none;
  margin: 0;
  overflow: hidden;
  padding-left: 11px;
  border-left: 1px solid var(--acs-line-soft);
  color: var(--acs-muted);
  font-size: 10px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-brief-panel {
  max-height: 260px;
  overflow: hidden;
  opacity: 1;
  transform: translateY(0);
  transition: max-height 220ms ease, margin 220ms ease, padding 220ms ease, opacity 160ms ease, transform 220ms ease, border-color 160ms ease;
}

.acs-stage.is-overview-collapsed .acs-brief-panel {
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-color: transparent;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-7px);
}

@media (max-width: 860px) {
  .acs-shell.acs-mobile-layout .acs-stage-heading,
  .acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px;
    min-height: 54px;
    padding: 6px 7px 6px 9px;
  }

  .acs-shell.acs-mobile-layout .acs-stage-heading > div:first-child,
  .acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading > div:first-child {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 3px 7px;
  }

  .acs-shell.acs-mobile-layout .acs-stage-heading h2,
  .acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading h2 {
    font-size: 11px;
  }

  .acs-shell.acs-mobile-layout .acs-stage-heading .acs-step-goal,
  .acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-step-goal {
    grid-column: 1 / -1;
    padding: 0;
    border: 0;
    font-size: 8px;
    line-height: 1.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .acs-brief-panel { transition: none; }
}
`;

const CONNECTION_PROFILE_CSS = `
/* 模型连接预设沿用创作台的“档案卡”语汇，保持设置区紧凑而可辨认。 */
.acs-connection-profile-panel {
  display: grid;
  gap: 9px;
  margin-bottom: 13px;
  padding: 11px;
  border: 1px solid rgba(211, 173, 114, 0.24);
  border-radius: 10px;
  background: rgba(211, 173, 114, 0.055);
}

.acs-connection-profile-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--acs-muted);
  font: 700 9px/1.3 var(--acs-mono);
  letter-spacing: 0.06em;
}

.acs-connection-profile-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.acs-connection-profile-toggle > span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.acs-connection-profile-toggle i {
  color: var(--acs-muted);
  font-size: 8px;
  transition: transform 160ms ease;
}

.acs-connection-profile-panel.is-collapsed .acs-connection-profile-toggle i {
  transform: rotate(-90deg);
}

.acs-connection-profile-body {
  display: grid;
  gap: 9px;
}

.acs-connection-profile-panel.is-collapsed .acs-connection-profile-body {
  display: none;
}

.acs-custom-connection.is-profile-collapsed > :not(#acs-connection-profile-panel) {
  display: none !important;
}

.acs-custom-connection.is-profile-collapsed #acs-connection-profile-panel {
  margin-bottom: 0;
}

.acs-connection-profile-heading small {
  color: var(--acs-gold);
  font: 600 8px/1.3 var(--acs-body);
  letter-spacing: 0;
}

.acs-connection-profile-panel label > span {
  display: block;
  margin-bottom: 6px;
  color: var(--acs-muted);
  font: 700 9px/1.3 var(--acs-mono);
}

.acs-connection-profile-name-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 7px;
  align-items: stretch;
}

.acs-connection-profile-nameplate {
  display: grid;
  grid-template-columns: 25px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 36px;
  padding: 3px 5px 3px 6px;
  border: 1px solid rgba(232, 224, 212, 0.14);
  border-radius: 9px;
  background:
    linear-gradient(100deg, rgba(217, 119, 87, 0.08), transparent 42%),
    #302e29;
  box-shadow: inset 0 1px 0 rgba(255, 248, 238, 0.025);
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
}

.acs-connection-profile-nameplate:focus-within {
  border-color: rgba(217, 119, 87, 0.72);
  background:
    linear-gradient(100deg, rgba(217, 119, 87, 0.12), transparent 48%),
    #34312c;
  box-shadow: 0 0 0 2px rgba(217, 119, 87, 0.11), inset 0 1px 0 rgba(255, 248, 238, 0.04);
}

.acs-connection-profile-nameplate > i {
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border-radius: 7px;
  background: rgba(217, 119, 87, 0.11);
  color: var(--acs-cyan);
  font-size: 9px;
}

.acs-connection-profile-nameplate input,
.acs-connection-profile-nameplate input:hover,
.acs-connection-profile-nameplate input:focus {
  min-width: 0;
  min-height: 28px;
  padding: 3px 6px;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--acs-text);
  font: 600 11px/1.35 var(--acs-body);
}

.acs-connection-profile-nameplate input::placeholder {
  color: rgba(171, 162, 151, 0.7);
  font-weight: 500;
}

.acs-connection-profile-action {
  display: inline-grid;
  min-width: 34px;
  min-height: 34px;
  padding: 7px 9px;
  place-items: center;
  border: 1px solid var(--acs-line);
  border-radius: 9px;
  background: rgba(56, 53, 47, 0.88);
  color: var(--acs-text-soft);
  cursor: pointer;
}

#acs-save-connection-profile {
  border-color: rgba(211, 173, 114, 0.3);
  background: rgba(211, 173, 114, 0.09);
  color: var(--acs-gold);
}

#acs-delete-connection-profile:not(:disabled) {
  color: var(--acs-muted);
}

.acs-connection-profile-action:hover:not(:disabled) {
  border-color: rgba(211, 173, 114, 0.52);
  color: var(--acs-gold);
}

.acs-connection-profile-action:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.acs-model-parameter-section {
  margin-top: 3px;
  padding-top: 10px;
  border-top: 1px solid var(--acs-line-soft);
}

.acs-model-parameter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.acs-model-parameter-heading span {
  color: var(--acs-muted);
  font: 700 9px/1.3 var(--acs-mono);
}

.acs-model-parameter-reset {
  padding: 3px 6px;
  border: 0;
  background: transparent;
  color: var(--acs-gold);
  cursor: pointer;
  font: 600 8px/1.3 var(--acs-body);
}

.acs-model-parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.acs-model-parameter-grid label > span {
  margin-bottom: 4px;
  font-size: 8px;
}

.acs-model-parameter-grid input {
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 10px;
}

.acs-model-parameter-note {
  margin: 7px 0 0;
  color: var(--acs-muted);
  font-size: 8px;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .acs-connection-profile-panel { padding: 9px; }
  .acs-connection-profile-name-row { grid-template-columns: minmax(0, 1fr) 34px 34px; }
}
`;

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
/* 检查器采用固定工具区 + 独立内容滚动，长产物不会带走筛选控件。 */
.acs-inspector {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.acs-tabs {
  position: relative;
  top: auto;
}

.acs-tab-panel {
  min-height: 0;
  overflow: auto;
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-tab-panel[data-acs-panel="structure"] {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  overflow: hidden;
  padding: 20px 0 0;
}

.acs-tab-panel[data-acs-panel="structure"][hidden] {
  display: none;
}

.acs-tab-panel[data-acs-panel="structure"] > .acs-inspector-intro,
.acs-tab-panel[data-acs-panel="structure"] > .acs-inspector-help,
.acs-tab-panel[data-acs-panel="structure"] > .acs-artifact-filters {
  margin-right: 18px;
  margin-left: 18px;
}

.acs-tab-panel[data-acs-panel="structure"] > .acs-artifact-list {
  grid-auto-rows: max-content;
  min-height: 0;
  margin-top: 12px;
  overflow-x: hidden;
  overflow-y: scroll;
  padding: 0 18px 28px;
  align-content: start;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-artifact-name {
  font-family: var(--acs-body);
  font-size: 11px;
  font-weight: 650;
}

.acs-artifact-toggle-icon {
  flex: 0 0 auto;
  color: var(--acs-muted);
  font-size: 8px;
  transform: rotate(-90deg);
  transition: transform 150ms ease, color 150ms ease;
}

.acs-artifact[open] .acs-artifact-toggle-icon {
  color: var(--acs-cyan);
  transform: rotate(0deg);
}

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

@media (max-width: 860px) {
  .acs-inspector {
    display: none;
  }

  .acs-inspector.is-mobile-open {
    display: grid;
  }
}

/*
 * 窄视口与浏览器高倍缩放时使用完整设计画布统一缩放。
 * 这些规则显式撤销旧的分栏重排，避免各区域在不同断点分别变形。
 */
.acs-shell.acs-proportional-layout .acs-window {
  grid-template-rows: 72px minmax(0, 1fr);
  border: 1px solid rgba(217, 202, 182, 0.22);
  border-radius: 22px;
  transform-origin: center;
}

.acs-shell.acs-proportional-layout .acs-topbar {
  padding: 0 22px 0 26px;
}

.acs-shell.acs-proportional-layout .acs-brand h1 {
  font-size: 27px;
}

.acs-shell.acs-proportional-layout .acs-brand .acs-eyebrow,
.acs-shell.acs-proportional-layout #acs-save-project,
.acs-shell.acs-proportional-layout .acs-dependency,
.acs-shell.acs-proportional-layout .acs-project-title-field,
.acs-shell.acs-proportional-layout .acs-progress-row,
.acs-shell.acs-proportional-layout .acs-step-name,
.acs-shell.acs-proportional-layout .acs-step-number,
.acs-shell.acs-proportional-layout .acs-quiet-action,
.acs-shell.acs-proportional-layout .acs-phase-title,
.acs-shell.acs-proportional-layout .acs-phase-progress,
.acs-shell.acs-proportional-layout .acs-state-chip,
.acs-shell.acs-proportional-layout .acs-overview-toggle span,
.acs-shell.acs-proportional-layout .acs-section-label span:last-child,
.acs-shell.acs-proportional-layout .acs-composer-actions p {
  display: initial;
}

.acs-shell.acs-proportional-layout .acs-dependency,
.acs-shell.acs-proportional-layout .acs-progress-row,
.acs-shell.acs-proportional-layout .acs-composer-actions,
.acs-shell.acs-proportional-layout .acs-composer-actions > div {
  display: flex;
}

.acs-shell.acs-proportional-layout #acs-save-project {
  display: grid;
}

.acs-shell.acs-proportional-layout .acs-project-title-field,
.acs-shell.acs-proportional-layout .acs-step-name,
.acs-shell.acs-proportional-layout .acs-step-number,
.acs-shell.acs-proportional-layout .acs-quiet-action,
.acs-shell.acs-proportional-layout .acs-phase-title,
.acs-shell.acs-proportional-layout .acs-phase-progress,
.acs-shell.acs-proportional-layout .acs-composer-actions p {
  display: block;
}

.acs-shell.acs-proportional-layout .acs-state-chip {
  display: inline-block;
}

.acs-shell.acs-proportional-layout .acs-overview-toggle span,
.acs-shell.acs-proportional-layout .acs-section-label span:last-child {
  display: inline;
}

.acs-shell.acs-proportional-layout .acs-tour-launch {
  width: auto;
  padding: 6px 11px;
  justify-content: center;
}

.acs-shell.acs-proportional-layout .acs-tour-launch span {
  display: inline;
}

.acs-shell.acs-proportional-layout .acs-brand-mark {
  width: 38px;
  height: 38px;
}

.acs-shell.acs-proportional-layout .acs-workspace {
  grid-template-columns: 240px minmax(0, 1fr) 320px;
}

.acs-shell.acs-proportional-layout .acs-rail,
.acs-shell.acs-proportional-layout .acs-stage {
  grid-column: auto;
}

.acs-shell.acs-proportional-layout .acs-inspector,
.acs-shell.acs-proportional-layout .acs-inspector.is-mobile-open {
  position: relative;
  inset: auto;
  z-index: auto;
  display: grid;
  width: auto;
  box-shadow: none;
}

.acs-shell.acs-proportional-layout .acs-inspector.is-expanded {
  position: absolute;
  top: 72px;
  right: 0;
  bottom: 0;
  left: auto;
  z-index: 8;
  width: min(72%, 1080px);
  box-shadow: -28px 0 70px rgba(10, 9, 8, 0.34);
}

.acs-shell.acs-proportional-layout #acs-inspector-toggle {
  display: none;
}

.acs-shell.acs-proportional-layout .acs-project-identity {
  padding: 16px 14px 15px;
}

.acs-shell.acs-proportional-layout .acs-progress-track {
  margin-top: 7px;
}

.acs-shell.acs-proportional-layout .acs-step-rail {
  padding: 12px 8px 24px;
}

.acs-shell.acs-proportional-layout .acs-phase-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 13px;
  width: 100%;
  min-height: 32px;
  margin: 0;
  padding: 6px 8px 6px 12px;
}

.acs-shell.acs-proportional-layout .acs-phase-steps {
  padding: 2px 0 4px 10px;
}

.acs-shell.acs-proportional-layout .acs-phase-steps::before {
  left: 20px;
}

.acs-shell.acs-proportional-layout .acs-step-button {
  grid-template-columns: 27px minmax(0, 1fr) 15px;
  width: 100%;
}

.acs-shell.acs-proportional-layout .acs-stage-heading,
.acs-shell.acs-proportional-layout .acs-composer {
  padding-right: 28px;
  padding-left: 28px;
}

.acs-shell.acs-proportional-layout .acs-stage-heading {
  align-items: center;
}

.acs-shell.acs-proportional-layout .acs-stage-heading h2 {
  font-size: 34px;
}

.acs-shell.acs-proportional-layout .acs-stage.is-overview-collapsed .acs-stage-heading {
  align-items: center;
  padding: 8px 20px;
}

.acs-shell.acs-proportional-layout .acs-stage.is-overview-collapsed .acs-stage-heading h2 {
  font-size: 14px;
}

.acs-shell.acs-proportional-layout .acs-brief-panel {
  margin-right: 28px;
  margin-left: 28px;
}

.acs-shell.acs-proportional-layout .acs-conversation {
  padding-right: 28px;
  padding-left: 28px;
}

.acs-shell.acs-proportional-layout .acs-guide-prompts {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.acs-shell.acs-proportional-layout .acs-composer-actions {
  align-items: center;
}

.acs-shell.acs-proportional-layout .acs-composer-actions > div {
  grid-template-columns: none;
}

.acs-shell.acs-proportional-layout .acs-button-confirm {
  grid-column: auto;
}

.acs-shell.acs-proportional-layout .acs-overview-toggle {
  width: auto;
  padding: 5px 10px;
}

.acs-shell.acs-proportional-layout .acs-turn {
  max-width: min(88%, 860px);
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
  display: grid;
  grid-template-columns: repeat(15, minmax(0, 1fr));
  gap: 4px;
  overflow: hidden;
}

.acs-tour-dot {
  width: 100%;
  max-width: none;
}

.acs-tour-dot.is-active {
  width: 100%;
  transform: scaleY(1.7);
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
const AUTO_CARD_STUDIO_VERSION = '0.6.25';
const UPDATE_CATALOG_URL = 'https://api.github.com/repos/NightingNine/sillytavern-scripts/contents/catalog.json?ref=main';
const UPDATE_CACHE_KEY = 'auto-card-studio:update-state:v1';
const UPDATE_REOPEN_KEY = 'auto-card-studio:reopen-after-update:v1';
const TOUR_COMPLETED_KEY = 'auto-card-studio:tour-completed:v1';
// 测试分支不参与正式版版本号比较；手动更新直接重新拉取本分支的最新脚本。
const TEST_BRANCH_UPDATE_MODE = false;
const TEST_BRANCH_UPDATE_KEY = 'auto-card-studio:reload-test-branch:v1';
const TEST_BRANCH_PIN_KEY = 'auto-card-studio:test-branch-pin:v1';
const TEST_BRANCH_API_URL = 'https://api.github.com/repos/NightingNine/sillytavern-scripts/branches/auto-card-studio-mobile-test';
const TEST_BRANCH_BUILD_LABEL = '测试版 2026.07.20-27';
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const VERSIONED_SCRIPT_URL = version => `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-v${version}/dist/character-creation/auto-card-studio/index.js`;
const TEST_SCRIPT_URL_BY_REF = ref => `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@${ref}/dist/character-creation/auto-card-studio/index.js`;
const UPDATE_NOTES_URL_BY_REF = ref => `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@${ref}/dist/character-creation/auto-card-studio/updates.json`;
const TEST_BRANCH_COMPARE_URL = (from, to) => `https://api.github.com/repos/NightingNine/sillytavern-scripts/compare/${from}...${to}`;
const STUDIO_DESIGN_MIN_WIDTH = 1360;
const STUDIO_DESIGN_MIN_HEIGHT = 760;
const STUDIO_VIEWPORT_MARGIN = 24;


const STORAGE_KEY = 'auto-card-studio:project:v1';
const PROJECT_LIBRARY_KEY = 'auto-card-studio:projects:v1';
const PROJECT_LIBRARY_VERSION = 1;
const CONNECTION_STORAGE_KEY = 'auto-card-studio:connection:v1';
const CONNECTION_PROFILES_STORAGE_KEY = 'auto-card-studio:connection-profiles:v1';
const RESOURCE_DATABASE_NAME = 'auto-card-studio-resources';
const RESOURCE_DATABASE_VERSION = 1;
const RESOURCE_STORE_NAME = 'resources';
const RESOURCE_DOCK_POSITION_KEY = 'auto-card-studio:resource-dock-position:v1';
const PROJECT_VERSION = 1;
const MAX_CONTEXT_CHARS = 420000;
const TEMPLATE_MACRO_SENTINELS = Object.freeze({
    char: '__AUTO_LITERAL_CHAR_MACRO_7F3A__',
    user: '__AUTO_LITERAL_USER_MACRO_7F3A__',
});
const TEMPLATE_MACRO_GUARD_PROMPT = `模板变量保护规则：
- __AUTO_LITERAL_CHAR_MACRO_7F3A__ 是角色卡中的角色变量，输出时必须保持原样。
- __AUTO_LITERAL_USER_MACRO_7F3A__ 是角色扮演中玩家身份的变量，输出时必须保持原样。
- 正式角色卡产物中凡是指代玩家在世界内的身份，都必须使用 __AUTO_LITERAL_USER_MACRO_7F3A__，不得写成普通文本“用户”。
- “用户”只可用于解释创作操作、输入要求等过程性说明，不能作为正式产物中的角色称呼。
- 不得把以上占位符改写成人名、系统名或当前聊天参与者名称。`;

const DEFAULT_CONNECTION_SETTINGS = Object.freeze({
    mode: 'current',
    source: 'openai',
    apiUrl: '',
    model: '',
    outputMode: 'complete',
    apiKey: '',
    profileId: '',
    modelParameters: null,
    modelParametersCustomized: false,
});

const MODEL_PARAMETER_FIELDS = Object.freeze([
    ['max_completion_tokens', '最大回复 Token', 1, 200000],
    ['temperature', '温度', 0, 2],
    ['top_p', 'Top P', 0, 1],
    ['top_k', 'Top K', 0, 1000],
    ['frequency_penalty', '频率惩罚', -2, 2],
    ['presence_penalty', '存在惩罚', -2, 2],
]);

// 依据 A.U.T.O 教程整理的步骤说明。这里解释步骤在整套制卡结构中的作用，
// 不复制预设提示词，也不会改变实际发送给模型的内容。
const STEP_TUTORIAL_NOTES = Object.freeze([
    ['体验锚定', '先界定玩家与 AI 的互动关系，再确定希望持续获得的审美体验。作者将其视为整个 AIRP 最核心的内容。', '检查 AI 能做什么、不能做什么、何时可以推进或代行玩家行动，以及叙事视角、信息边界和体验重点是否准确。', '交互范式与美学纲领。两者通常会进入最终世界书。', '不要用“精确、真实”等空泛词代替体验描述；它们可能把描写带向冷感。'],
    ['概念补强', '当美学纲领不足以支撑复杂体验时，补充让核心体验成立的世界机制；也可以把它当作灵感发生器。', '从 Step 1 的目标反推必须存在的规则、资源、冲突与反馈，反复生成后只保留真正必要的部分。', '一个或多个实现机制。简单世界可选择不交付。', '这一步并非强制；如果交互范式和美学纲领已经足够，就不要为了完整而堆设定。'],
    ['长线推演', '为单线长剧情识别阶段变化与关键转折，主要用于指导后续设计，而不是直接塞进运行中的角色卡。', '先给出起点、终点和不可违背的转折，再检查阶段是否能连续推进。', '弧光框架，默认作为设计参考。', '它只适合单线且消耗较多上下文；开放世界或多线结构可以跳过。'],
    ['世界全景', '从核心感觉出发描摹世界的整体面貌，是实体内容设计的第一张全景图。', '先写结构与主要矛盾，再决定哪些局部值得在后续步骤展开。', '世界蓝图。对世界观要求不高时，它本身就可以够用。', '先抓核心、再画全局、最后补局部；不要一开始陷进百科细节。'],
    ['角色原型', '设计适合变量更新和异步改写的主要角色结构，而不只是写一篇静态人物小传。', '同时检查角色原点、可见画像与当前状态，让后续变量能够找到稳定落点。', '每名主要角色的原点、画像和状态。', '如果对人物结构不满意，可在生成规则和具体实例步骤进一步设计，不必在此一次定死。'],
    ['关系索引', '把角色与势力组织成可导航、可扩展的关系目录。目录里放人物、组织或其他实体都可以。', '确定节点、上下级与关键连线，并说明关系变化会牵动什么。', '关系图谱。', '它首先是结构工具，不必把所有关系都写成固定剧情。'],
    ['生成模板', '为需要批量或运行时生成的内容建立模板，让新内容仍遵守同一世界逻辑。', '选择要生成的对象，规定共同字段、变化范围、禁区与因果约束。', '一个或多个生成规则。', '模板既可用于游玩时实时生成，也可只用于指导下一步制作实例。'],
    ['落地实例', '按生成规则制作世界中真实存在的角色、地点、组织或物品，也允许不依赖模板直接生成。', '优先制作会立刻参与剧情的实例，用它们反向检验规则是否可执行。', '一个或多个具体实例。', '默认思路偏向“实际存在的东西”；抽象制度和历史更适合 Step 9。'],
    ['抽象知识', '补充习俗、历史、经济、制度等不易被当作实体实例表达的世界知识。', '只写会影响角色判断和行动的知识，并标明不同群体是否有不同认知。', '一个或多个世界知识条目。', '不要把世界书写成百科全书；优先保留游玩中真的会被用到的部分。'],
    ['状态空间', '判断世界需要哪些状态机，并规划地图、剧情阶段、关系等级、天气等状态群之间的联动。', '只保留确实存在互斥状态与迁移关系的对象，说明各状态机职责及彼此影响。', '空间规划设计。', 'AI 容易过度规划；不要把可留到变量层或普通设定中的内容强行状态化。'],
    ['状态机拓扑', '“情节图谱”是历史名称，本质上用于设计任意单个状态机内部的拓扑结构。', '建立节点、线形／树形／环形／网状关系、允许与禁止迁移，以及进入退出条件。', '一个或多个情节图谱。', '它不只设计剧情，也可设计地图、关系阶段、职业等级等状态机。'],
    ['状态内容', '为已经划分的每个状态或维度填写实际可用内容。', '逐一补充该维度独有的人物、规则、冲突、入口与出口。', '一个或多个维度内容。', '只有结构而没有内容时，状态机无法游玩；反过来也避免重复已经存在的通用设定。'],
    ['叙事总则', '把交互范式和美学纲领落实为叙述者在实际写作中的稳定做法。', '确定镜头距离、信息边界、主动性、节奏和不同场景的处理原则。', '叙事指南核心。', '这一层追求可执行的写法，不擅长复刻某位具体作者的文风。'],
    ['特殊语言', '设计规则明确、需要稳定复现的刻板语言模式，例如咒语、口癖、符号语法或群体表达规范。', '规定词根、词缀、句式、符号、适用角色和触发场景，并控制使用范围。', '一个或多个语料库。', '作者不推荐单纯堆普通语料，因为容易诱导 AI 照抄并让所有角色共享同一种腔调。'],
    ['场景方法', '为高频、关键或特殊场景设计可复用的描写策略。', '说明每类场景的感官焦点、节奏、变化来源和结束信号。', '一个或多个场景策略集。', '策略应能随状态变化，不能只是复制固定段落。'],
    ['变量盘点', '在变量化前整理所有已设计信息，区分动态数据、条件内容和静态设定。', '检查哪些信息会变化、是否影响后续，以及是否值得占用变量。', '待变量化清单与待条件化清单。', '变量不是越多越好；不变化或不影响游玩的信息应继续留在普通设定中。'],
    ['体系规划', '把变量分成职责清晰的簇，并规划层级和依赖，避免后面出现一棵无法维护的变量树。', '按角色、世界、任务和界面等维度分组，注明更新频率与依赖。', '变量体系规划。', '先规划结构再命名字段；这一阶段关注组织方式，不急于写完整初值。'],
    ['字段实现', '逐块设计变量，并同时处理 MVU Schema、供 AI 读取的 WORLD_current 与可能存在的条件地图。', '核对 Schema 和当前变量树是否对齐，每个字段的类型、初值、范围、联动和显示引用是否正确。', '当前变量、条件映射与变量 Schema。', '若当前变量出现 null 而非正确的 MVU 宏，应检查酒馆助手宏设置；初值必须与开局事实一致。'],
    ['更新路由', '汇总变量结构，规定剧情信息如何路由到正确字段，并判断由主 AI 还是 AutoTask 维护。', '按事件类型检查相关变量簇，定义更新顺序、条件显示关系和最小变更原则。', '变量更新指南与条件显示规划。', '变量约 20–40 个时可考虑异步更新，规模更大时宜按变量块拆成多个任务。'],
    ['条件配置', '把现有 XML 内容改造成按变量条件显示的世界书内容，降低无关上下文占用。', '为每段内容设置明确条件，检查多个条件之间是同时满足还是任一满足。', '经过条件化配置的世界内容。', '适合地点、阶段、人物状态等同一时刻只需显示一部分的内容。'],
    ['条件补充', '在变量体系完成后，补写只有满足特定条件才应出现的彩蛋、事件或知识。', '先定义较严格的交叉条件，再写条件成立时模型需要知道的实际内容。', '条件触发的世界内容。', '条件可以涉及不在场事件；不要让彩蛋因为条件过松而变成必然剧情。'],
    ['根目录', '为大量 XML 和世界书条目建立运行时目录，让 AI 知道信息在哪里。', '先清理同名或重复 XML，再按内容域编制索引并安排在世界书前部。', '世界根目录。', '目录只负责导航，不要复制所有正文；重复标签会让索引失真。'],
    ['状态栏输出', '设计玩家最终看到的状态界面，并规定它读取哪些变量或临时输出。', '先定形态、移动端布局和信息优先级，再生成 HTML 与捕获正则。', '状态栏界面、数据说明与局部正则。', '状态栏可以只读已设计变量，也可以配合回复格式读取 AI 临时输出；长内容可从断点续写。'],
    ['回复装配', '规定游玩时每轮回复的分区结构，让构思、叙事、摘要、副叙事、选项、隐藏摘要、变量与状态栏数据各归其位。', '叙事区必有；其余逐区决定是否启用、谁可见、标签与顺序，并核对与 AutoTask、MVU 和状态栏的数据依赖。', '最终回复格式。', '由 AutoTask 负责摘要或变量时可关闭对应主回复区；临时状态栏内容则必须启用 STATUSBAR_DATA。'],
    ['任务拆分', '找出适合交给更快、更便宜副 AI 的独立任务，释放主 AI 的叙事能力。', '区分摘要、变量更新和普通任务，并为每项任务确定定期／周期／变量触发、读取资料、输出位置和失败处理。', '副 AI 任务清单。', '适合摘要、变量更新和世界书改写；即时叙事判断仍应留给主 AI。'],
    ['世界书任务', '为需要新增或改写聊天世界书条目的副 AI 任务编写专用提示词。', '严格限定参考条目、事实来源、写回标签和允许修改的范围。', '一个或多个世界书任务提示词。', '副 AI 会读取它被允许看到的条目；同一条目中的条件内容可能无法再被细分隔离。'],
    ['变量任务', '为一个或一组变量编写独立更新提示词，使变量更新可以拆分运行。', '要求只依据已发生剧情、校验字段类型，并输出最小合法变更。', '一个或多个变量更新任务提示词。', '专用变量任务按独立间隔运行，不进入普通周期；需要周期位置时应改用普通任务更新变量。'],
    ['交付结构', '设计最终世界书条目与完整 AutoTask 配置，控制主 AI 和每个副任务分别能看见什么。', '规划条目/XML、关键词、位置、激活方式，并为任务指定参考条目、提示词、输出条目、捕获 XML、更新模式、同名禁用与 API。', '条目规划与 AutoTask 配置。', '这是自动重组前的设计稿；条目边界首先服务权限隔离、读取与维护。'],
    ['启动场景', '生成独立开局，用第一幕启动前面设计的世界、角色、变量和核心体验。', '确定时间地点、即时矛盾和玩家可知信息；无变量时只写开场，有变量时再给出完整且一致的初始树。', '正式开场白与变量初始值。', '它是单独开局而非通用设定；不同开局可以重复生成并保留版本。'],
].map(([stage, purpose, workflow, deliverable, caution]) => ({ stage, purpose, workflow, deliverable, caution })));

const STEP_HELP_CSS = `
.acs-step-name { display:flex; align-items:center; gap:6px; min-width:0; }
.acs-step-name-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.acs-core-step-badge { flex:0 0 auto; padding:2px 5px; border:1px solid rgba(211,173,114,.32); border-radius:999px; background:rgba(211,173,114,.08); color:#d6bd95; font-family:var(--acs-mono); font-size:7px; font-weight:700; letter-spacing:.04em; line-height:1.2; }
.acs-step-button.is-core-step .acs-step-node { border-color:rgba(211,173,114,.62); }
.acs-step-button.is-core-step.is-active .acs-step-node { border-color:var(--acs-cyan); }
.acs-step-title-line { display:flex; align-items:center; gap:10px; min-width:0; }
.acs-step-help-button { display:grid; width:27px; height:27px; flex:0 0 auto; place-items:center; padding:0; border:1px solid rgba(211,173,114,.34); border-radius:999px; background:rgba(211,173,114,.08); color:var(--acs-gold); cursor:pointer; transition:transform 140ms ease, background 140ms ease, border-color 140ms ease; }
.acs-step-help-button:hover { transform:translateY(-1px); border-color:rgba(211,173,114,.62); background:rgba(211,173,114,.15); }
.acs-clear-step-button { display:inline-flex; align-items:center; gap:6px; min-height:30px; padding:5px 9px; border:1px solid var(--acs-line); border-radius:999px; background:transparent; color:var(--acs-muted); cursor:pointer; font:600 9px/1 var(--acs-body); }
.acs-clear-step-button:hover:not(:disabled) { border-color:rgba(217,132,127,.48); background:rgba(217,132,127,.08); color:var(--acs-red); }
.acs-clear-step-button:disabled { cursor:default; opacity:.34; }
.acs-artifact-delete:hover { border-color:rgba(217,132,127,.48); color:var(--acs-red); }
.acs-step-help-overlay { position:absolute; inset:0; z-index:35; display:grid; padding:clamp(14px,4vh,42px); place-items:center; background:rgba(18,16,14,.76); backdrop-filter:blur(10px); }
.acs-step-help-dialog { width:min(720px,94vw); max-height:min(780px,90vh); overflow:auto; border:1px solid rgba(211,173,114,.34); border-radius:18px; background:#2b2925; box-shadow:0 30px 90px rgba(10,9,8,.58); scrollbar-width:thin; scrollbar-color:var(--acs-line) transparent; }
.acs-step-help-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding:22px 24px 18px; border-bottom:1px solid var(--acs-line-soft); background:linear-gradient(120deg,rgba(217,119,87,.09),transparent 52%); }
.acs-step-help-kicker { margin:0 0 7px; color:var(--acs-cyan); font:700 9px/1 var(--acs-mono); letter-spacing:.16em; }
.acs-step-help-head h2 { margin:0; font:500 27px/1.2 var(--acs-display); }
.acs-step-help-head small { display:block; margin-top:7px; color:var(--acs-muted); font-size:10px; }
.acs-step-help-close { display:grid; width:34px; height:34px; flex:0 0 auto; place-items:center; border:1px solid var(--acs-line); border-radius:9px; background:transparent; color:var(--acs-muted); cursor:pointer; }
.acs-step-help-body { display:grid; gap:12px; padding:20px 24px 24px; }
.acs-step-help-lead { margin:0; color:var(--acs-text); font:500 14px/1.75 var(--acs-body); }
.acs-step-help-section { padding:14px 15px; border:1px solid var(--acs-line-soft); border-radius:11px; background:#34312c; }
.acs-step-help-section span { display:block; margin-bottom:7px; color:var(--acs-gold); font:700 9px/1 var(--acs-mono); letter-spacing:.12em; }
.acs-step-help-section p { margin:0; color:var(--acs-text-soft); font-size:11px; line-height:1.72; }
.acs-step-help-section.is-caution { border-left:2px solid var(--acs-cyan); }
@media (max-width:560px) { .acs-step-help-overlay{padding:0}.acs-step-help-dialog{width:100%;max-height:100%;border-radius:0}.acs-step-help-head,.acs-step-help-body{padding-left:17px;padding-right:17px}.acs-step-title-line{gap:7px}.acs-step-help-button{width:25px;height:25px}.acs-clear-step-button span{display:none}.acs-clear-step-button{width:30px;padding:5px;justify-content:center} }
`;

const RESOURCE_MANAGER_CSS = `
.acs-resource-import-card { display:grid; gap:10px; padding:12px; border:1px solid var(--acs-line-soft); border-radius:10px; background:#35322d; }
.acs-resource-import-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.acs-resource-import-head strong { color:var(--acs-text); font-size:11px; }
.acs-resource-import-head small { color:var(--acs-muted); font:700 8px/1 var(--acs-mono); }
.acs-resource-import-actions { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
.acs-resource-import-actions .acs-button { min-height:34px; padding:6px 9px; font-size:9px; }
.acs-resource-dock-tab { position:absolute; top:48%; right:0; z-index:17; display:block; width:25px; min-height:104px; padding:9px 5px; touch-action:none; user-select:none; border:1px solid rgba(217,119,87,.42); border-right:0; border-radius:9px 0 0 9px; background:#38352f; color:var(--acs-cyan); cursor:ns-resize; font:700 9px/1.45 var(--acs-body); writing-mode:vertical-rl; letter-spacing:.08em; box-shadow:-8px 8px 24px rgba(10,9,8,.24); }
.acs-resource-dock-tab:hover,.acs-resource-dock-tab:focus-visible{border-color:rgba(217,119,87,.72);background:#403b34}
.acs-resource-dock-tab.is-dragging{cursor:grabbing;box-shadow:-10px 10px 30px rgba(10,9,8,.38)}
.acs-settings-fold{margin-bottom:12px;border:1px solid var(--acs-line-soft);border-radius:11px;background:#302e29;overflow:hidden}.acs-settings-fold.acs-connection-section{padding:0;border-bottom:1px solid var(--acs-line-soft)}
.acs-settings-fold-toggle{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border:0;background:#35322d;color:var(--acs-text);cursor:pointer;text-align:left}.acs-settings-fold-toggle:hover{background:#3a3731}.acs-settings-fold-toggle>span:first-child{min-width:0}.acs-settings-fold-toggle strong{display:block;color:var(--acs-text);font:500 15px/1.25 var(--acs-display)}.acs-settings-fold-toggle small{display:block;margin-top:3px;color:var(--acs-muted);font:500 9px/1.4 var(--acs-body)}.acs-settings-fold-toggle>.acs-settings-fold-meta{display:flex;min-width:0;align-items:center;gap:8px}.acs-settings-fold-toggle>.acs-settings-fold-meta>strong{max-width:110px;overflow:hidden;padding:5px 8px;border:1px solid var(--acs-line);border-radius:999px;color:var(--acs-muted);font:700 8px/1 var(--acs-mono);text-overflow:ellipsis;white-space:nowrap}.acs-settings-fold-toggle i{color:var(--acs-cyan);font-size:9px;transition:transform 160ms ease}.acs-settings-fold-toggle[aria-expanded="false"] i{transform:rotate(-90deg)}
.acs-settings-fold-body{padding:13px}.acs-settings-fold-body[hidden]{display:none!important}
.acs-resource-drawer-scrim { position:absolute; inset:72px 0 0; z-index:17; border:0; background:rgba(18,16,14,.16); backdrop-filter:blur(1px); cursor:default; }
.acs-resource-drawer { position:absolute; top:72px; right:0; bottom:0; z-index:18; display:grid; grid-template-rows:auto auto minmax(0,1fr); width:min(430px,88vw); border-left:1px solid rgba(217,119,87,.32); background:#2b2925; box-shadow:-24px 0 60px rgba(10,9,8,.45); transform:translateX(102%); transition:transform 220ms ease; }
.acs-resource-drawer.is-open { transform:translateX(0); }
.acs-resource-drawer-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; padding:18px 19px 14px; border-bottom:1px solid var(--acs-line-soft); }
.acs-resource-drawer-head p,.acs-resource-drawer-head h2 { margin:0; }.acs-resource-drawer-head p{color:var(--acs-cyan);font:700 8px/1 var(--acs-mono);letter-spacing:.15em}.acs-resource-drawer-head h2{margin-top:6px;font:500 21px/1.2 var(--acs-display)}
.acs-resource-drawer-close { display:grid; width:31px; height:31px; place-items:center; border:1px solid var(--acs-line); border-radius:8px; background:transparent; color:var(--acs-muted); cursor:pointer; }
.acs-resource-drawer-tabs { display:grid; grid-template-columns:1fr 1fr; padding:0 16px; border-bottom:1px solid var(--acs-line-soft); }
.acs-resource-drawer-tab { padding:11px 8px; border:0; border-bottom:2px solid transparent; background:transparent; color:var(--acs-muted); cursor:pointer; font-size:10px; }.acs-resource-drawer-tab.is-active{border-color:var(--acs-cyan);color:var(--acs-text)}
.acs-resource-list { min-height:0; overflow:auto; padding:13px 16px 20px; scrollbar-width:thin; scrollbar-color:var(--acs-line) transparent; }
.acs-resource-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:10px 11px; border:1px solid var(--acs-line-soft); border-radius:9px; background:#34312c; transition:border-color 140ms ease,background 140ms ease,transform 140ms ease; }.acs-resource-item+.acs-resource-item{margin-top:7px}
.acs-resource-item.is-editable { cursor:pointer; }.acs-resource-item.is-editable:hover{border-color:rgba(217,119,87,.38);background:#3a3731;transform:translateX(-2px)}.acs-resource-item.is-empty .acs-resource-item-copy strong{color:var(--acs-muted);font-style:italic}.acs-resource-item.is-empty .acs-resource-item-copy small{color:var(--acs-gold)}
.acs-resource-item-copy{min-width:0}.acs-resource-item-copy strong,.acs-resource-item-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acs-resource-item-copy strong{color:var(--acs-text-soft);font-size:10px}.acs-resource-item-copy small{margin-top:4px;color:var(--acs-muted);font:700 8px/1 var(--acs-mono)}
.acs-resource-switch { position:relative; width:34px; height:18px; }.acs-resource-switch input{position:absolute;opacity:0}.acs-resource-switch span{position:absolute;inset:0;border:1px solid var(--acs-line);border-radius:999px;background:#2b2925;cursor:pointer}.acs-resource-switch span::after{position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:var(--acs-muted);content:"";transition:transform 140ms ease,background 140ms ease}.acs-resource-switch input:checked+span{border-color:rgba(147,189,145,.48);background:rgba(147,189,145,.1)}.acs-resource-switch input:checked+span::after{transform:translateX(16px);background:var(--acs-green)}
.acs-resource-empty { padding:24px 12px; color:var(--acs-muted); font-size:10px; line-height:1.65; text-align:center; }
.acs-resource-editor-overlay,.acs-update-notes-overlay{position:absolute;inset:0;z-index:70;display:grid;padding:clamp(12px,4vh,42px);place-items:center;background:rgba(18,16,14,.76);backdrop-filter:blur(10px)}
.acs-resource-editor-dialog,.acs-update-notes-dialog{display:grid;width:min(820px,94vw);max-height:min(820px,90vh);overflow:hidden;border:1px solid rgba(217,119,87,.36);border-radius:18px;background:#302e29;box-shadow:0 30px 90px rgba(10,9,8,.62);animation:acs-confirm-in 160ms ease-out}
.acs-resource-editor-dialog{grid-template-rows:auto minmax(0,1fr) auto}
.acs-resource-editor-head,.acs-update-notes-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px 17px;border-bottom:1px solid var(--acs-line-soft);background:linear-gradient(120deg,rgba(217,119,87,.09),transparent 58%)}
.acs-resource-editor-head p,.acs-resource-editor-head h2,.acs-update-notes-head p,.acs-update-notes-head h2{margin:0}.acs-resource-editor-head p,.acs-update-notes-head p{color:var(--acs-cyan);font:700 8px/1 var(--acs-mono);letter-spacing:.15em}.acs-resource-editor-head h2,.acs-update-notes-head h2{margin-top:7px;color:var(--acs-text);font:500 23px/1.25 var(--acs-display)}
.acs-resource-editor-close,.acs-update-notes-close{display:grid;width:34px;height:34px;flex:0 0 auto;place-items:center;border:1px solid var(--acs-line);border-radius:9px;background:transparent;color:var(--acs-muted);cursor:pointer}
.acs-resource-editor-body{display:grid;min-height:0;padding:18px 22px}.acs-resource-editor-body textarea{width:100%;min-height:360px;resize:vertical;padding:15px;border:1px solid var(--acs-line);border-radius:11px;background:#292722;color:var(--acs-text);font-family:var(--acs-body);font-size:12px;font-weight:450;line-height:1.78;letter-spacing:.008em;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;scrollbar-width:thin;scrollbar-color:var(--acs-line) transparent}
.acs-resource-editor-actions,.acs-update-notes-actions{display:flex;justify-content:flex-end;gap:8px;padding:13px 18px;border-top:1px solid var(--acs-line-soft);background:#292722}.acs-update-notes-actions{justify-content:center}
.acs-update-notes-actions{align-items:center}.acs-update-notes-actions .acs-button{width:auto;min-width:104px;min-height:36px;margin:0;padding:7px 14px;white-space:nowrap}.acs-update-notes-actions .acs-button-publish{width:auto;margin-top:0}
.acs-update-notes-dialog{grid-template-rows:auto minmax(0,1fr) auto;width:min(680px,94vw)}
.acs-update-notes-summary{display:block;margin-top:7px;color:var(--acs-muted);font:700 9px/1.4 var(--acs-mono)}
.acs-update-notes-list{min-height:0;overflow:auto;padding:16px 22px 22px;scrollbar-width:thin;scrollbar-color:var(--acs-line) transparent}
.acs-update-note{position:relative;padding:14px 15px 14px 18px;border:1px solid var(--acs-line-soft);border-radius:11px;background:#34312c}.acs-update-note+.acs-update-note{margin-top:10px}.acs-update-note::before{position:absolute;top:17px;left:-4px;width:7px;height:7px;border-radius:50%;background:var(--acs-cyan);box-shadow:0 0 0 4px #302e29;content:""}.acs-update-note strong{display:block;color:var(--acs-text);font-size:12px}.acs-update-note small{display:block;margin-top:4px;color:var(--acs-cyan);font:700 8px/1 var(--acs-mono)}.acs-update-note ul{margin:10px 0 0;padding-left:18px;color:var(--acs-text-soft);font-size:10px;line-height:1.65}.acs-update-note li+li{margin-top:4px}
@media(max-width:860px){.acs-resource-drawer{top:64px;width:min(420px,94vw)}.acs-resource-drawer-scrim{inset:64px 0 0}.acs-resource-dock-tab{top:44%}}
@media(max-width:560px){.acs-resource-editor-overlay,.acs-update-notes-overlay{padding:0}.acs-resource-editor-dialog,.acs-update-notes-dialog{width:100%;height:100vh;height:100dvh;max-height:none;border:0;border-radius:0}.acs-resource-editor-head,.acs-update-notes-head{padding-top:max(18px,env(safe-area-inset-top,0px));padding-right:17px;padding-left:17px}.acs-resource-editor-body{padding:14px 13px}.acs-resource-editor-body textarea{min-height:100%;resize:none;font-size:13px}.acs-resource-editor-actions,.acs-update-notes-actions{padding-bottom:max(13px,env(safe-area-inset-bottom,0px))}.acs-update-notes-actions{padding-right:13px;padding-left:13px}.acs-update-notes-actions .acs-button{min-width:0}.acs-update-notes-list{padding-right:14px;padding-left:14px}}
@media(prefers-reduced-motion:reduce){.acs-resource-drawer,.acs-resource-switch span::after,.acs-settings-fold-toggle i{transition:none}}
`;

const PHASES = [
    { id: 'foundation', label: 'I · 核心与世界', range: [1, 9] },
    { id: 'narrative', label: 'II · 叙事与体验', range: [10, 15] },
    { id: 'variables', label: 'III · 变量化系统', range: [16, 21] },
    { id: 'production', label: 'IV · 装配设计', range: [22, 24] },
    { id: 'autotask', label: 'V · AutoTask 配置', range: [25, 28] },
    { id: 'delivery', label: 'VI · 启动与交付', range: [29, 29] },
];

const DELIVERY_DIALOG_CSS = `
.acs-delivery-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  padding: clamp(16px, 4vh, 44px);
  place-items: center;
  background: rgba(18, 16, 14, 0.78);
  backdrop-filter: blur(10px);
}

.acs-delivery-dialog {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  width: min(900px, 94vw);
  max-height: min(820px, 90vh);
  overflow: hidden;
  border: 1px solid rgba(217, 119, 87, 0.34);
  border-radius: 18px;
  background: #2b2925;
  box-shadow: 0 30px 90px rgba(10, 9, 8, 0.6);
}

.acs-delivery-head,
.acs-delivery-toolbar,
.acs-delivery-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.acs-delivery-head {
  justify-content: space-between;
  border-bottom: 1px solid var(--acs-line-soft);
}

.acs-delivery-title p,
.acs-delivery-title h2 {
  margin: 0;
}

.acs-delivery-title p {
  color: var(--acs-cyan);
  font: 700 9px/1 var(--acs-mono);
  letter-spacing: 0.16em;
}

.acs-delivery-title h2 {
  margin-top: 6px;
  font: 500 25px/1.2 var(--acs-display);
}

.acs-delivery-title small {
  display: block;
  margin-top: 7px;
  color: var(--acs-muted);
  font-size: 10px;
}

.acs-delivery-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--acs-line);
  border-radius: 9px;
  background: transparent;
  color: var(--acs-muted);
  cursor: pointer;
}

.acs-delivery-toolbar {
  justify-content: space-between;
  border-bottom: 1px solid var(--acs-line-soft);
  background: #302e29;
}

.acs-delivery-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.acs-delivery-preset {
  padding: 6px 9px;
  border: 1px solid var(--acs-line);
  border-radius: 999px;
  background: transparent;
  color: var(--acs-muted);
  cursor: pointer;
  font: 650 9px/1 var(--acs-body);
}

.acs-delivery-preset:hover {
  border-color: var(--acs-cyan);
  color: var(--acs-text);
}

.acs-delivery-count {
  color: var(--acs-gold);
  font: 700 9px/1 var(--acs-mono);
  white-space: nowrap;
}

.acs-delivery-reorg-status {
  flex: 1 1 210px;
  color: var(--acs-muted);
  font-size: 9px;
  line-height: 1.35;
  text-align: right;
}

.acs-delivery-reorg-status.is-active { color: var(--acs-green); }
.acs-delivery-reorg-status.is-warning { color: var(--acs-gold); }

.acs-delivery-list {
  display: grid;
  gap: 8px;
  min-height: 150px;
  overflow: auto;
  padding: 14px 20px 20px;
  scrollbar-color: var(--acs-line) transparent;
  scrollbar-width: thin;
}

.acs-delivery-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid var(--acs-line-soft);
  border-radius: 11px;
  background: #35322d;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.acs-delivery-item:hover {
  border-color: rgba(217, 119, 87, 0.42);
  transform: translateY(-1px);
}

.acs-delivery-item:has(input:checked) {
  border-color: rgba(217, 119, 87, 0.5);
  background: rgba(217, 119, 87, 0.09);
}

.acs-delivery-item input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--acs-cyan);
}

.acs-delivery-item-copy {
  min-width: 0;
}

.acs-delivery-item-copy strong,
.acs-delivery-item-copy small {
  display: block;
}

.acs-delivery-item-copy strong {
  overflow: hidden;
  color: var(--acs-text);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-delivery-item-copy small {
  margin-top: 4px;
  overflow: hidden;
  color: var(--acs-muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-delivery-item-meta {
  display: grid;
  justify-items: end;
  gap: 4px;
  color: var(--acs-muted);
  font: 700 8px/1 var(--acs-mono);
}

.acs-delivery-item-meta span:first-child {
  color: var(--acs-green);
}

.acs-delivery-item.is-draft .acs-delivery-item-meta span:first-child {
  color: var(--acs-gold);
}

.acs-delivery-footer {
  justify-content: space-between;
  border-top: 1px solid var(--acs-line-soft);
  background: #292722;
}

.acs-delivery-footer p {
  max-width: 58%;
  margin: 0;
  color: var(--acs-muted);
  font-size: 9px;
  line-height: 1.5;
}

.acs-delivery-actions {
  display: flex;
  gap: 8px;
}

/* 交付窗口内的主按钮保持紧凑，不继承发布页的整行宽度。 */
.acs-delivery-actions .acs-button-publish {
  width: auto;
  margin-top: 0;
}

@media (max-width: 620px) {
  .acs-delivery-overlay { padding: 0; }
  .acs-delivery-dialog { width: 100%; max-height: 100%; border-radius: 0; }
  .acs-delivery-toolbar, .acs-delivery-footer { align-items: stretch; flex-direction: column; }
  .acs-delivery-footer p { max-width: none; }
  .acs-delivery-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .acs-delivery-item { grid-template-columns: 22px minmax(0, 1fr); }
  .acs-delivery-item-meta { grid-column: 2; grid-auto-flow: column; justify-content: start; }
}
`;

const CONFIRM_DIALOG_CSS = `
.acs-confirm-overlay { position:absolute; inset:0; z-index:60; display:grid; padding:18px; place-items:center; background:rgba(18,16,14,.74); backdrop-filter:blur(9px); }
.acs-confirm-dialog { width:min(430px,calc(100vw - 32px)); overflow:hidden; border:1px solid rgba(217,119,87,.38); border-radius:17px; background:#302e29; box-shadow:0 28px 80px rgba(10,9,8,.62); animation:acs-confirm-in 160ms ease-out; }
.acs-confirm-body { display:grid; grid-template-columns:38px minmax(0,1fr); gap:13px; padding:21px 21px 18px; }
.acs-confirm-icon { display:grid; width:38px; height:38px; place-items:center; border:1px solid rgba(217,119,87,.3); border-radius:11px; background:rgba(217,119,87,.1); color:var(--acs-cyan); }
.acs-confirm-copy h2 { margin:1px 0 7px; color:var(--acs-text); font:500 20px/1.25 var(--acs-display); }
.acs-confirm-copy p { margin:0; color:var(--acs-text-soft); font-size:11px; line-height:1.7; white-space:pre-line; }
.acs-confirm-actions { display:flex; justify-content:flex-end; gap:8px; padding:13px 18px; border-top:1px solid var(--acs-line-soft); background:#292722; }
.acs-confirm-actions .acs-button { min-width:84px; }
.acs-confirm-actions .acs-button-publish { width:auto; margin-top:0; }
.acs-confirm-dialog.is-danger { border-color:rgba(217,132,127,.42); }
.acs-confirm-dialog.is-danger .acs-confirm-icon { border-color:rgba(217,132,127,.32); background:rgba(217,132,127,.1); color:var(--acs-red); }
@keyframes acs-confirm-in { from { opacity:0; transform:translateY(8px) scale(.985); } to { opacity:1; transform:none; } }
@media(max-width:560px){.acs-confirm-overlay{padding:10px}.acs-confirm-body{padding:18px 17px 16px}.acs-confirm-actions{padding:12px 15px}}
@media(prefers-reduced-motion:reduce){.acs-confirm-dialog{animation:none}}
`;

const MOBILE_ADAPTATION_CSS = `
/* 手机端使用真正的单栏工作区；步骤和检查器分别作为左右抽屉。 */
/* 所有文字输入框沿用对话与产物区的清晰排版，覆盖宿主主题的输入样式。 */
.acs-shell textarea,
.acs-shell input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),
.acs-shell select {
  font-family: var(--acs-body) !important;
  font-weight: 450;
  letter-spacing: 0.008em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* 锁住宿主页面的横向溢出，避免创作台底部出现浏览器滚动条。 */
html.acs-no-scroll,
body.acs-no-scroll {
  overflow: hidden !important;
  overscroll-behavior: none;
}

#auto-card-studio.acs-shell {
  overflow: clip;
}

/* SillyTavern 手机端会对根页面施加变换，fixed 容器不能再依赖百分比高度。 */
#auto-card-studio.acs-shell.acs-mobile-layout {
  width: 100vw !important;
  height: 100dvh !important;
  min-height: 100dvh !important;
  overflow: hidden !important;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

.acs-mobile-flow-toggle,
.acs-mobile-scrim {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-window {
  inset: 0 !important;
  width: 100% !important;
  height: 100dvh !important;
  border: 0;
  border-radius: 0;
  transform: none !important;
  grid-template-rows: calc(50px + env(safe-area-inset-top, 0px)) minmax(0, 1fr);
}

.acs-shell.acs-mobile-layout .acs-topbar {
  min-width: 0;
  padding: env(safe-area-inset-top, 0px) 6px 0 8px;
}

.acs-shell.acs-mobile-layout .acs-brand {
  min-width: 0;
  gap: 4px;
}

.acs-shell.acs-mobile-layout .acs-brand-mark {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-brand > div {
  min-width: 0;
}

.acs-shell.acs-mobile-layout .acs-brand h1 {
  overflow: hidden;
  max-width: 27vw;
  font-size: 14px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acs-shell.acs-mobile-layout .acs-brand .acs-eyebrow,
.acs-shell.acs-mobile-layout .acs-dependency,
.acs-shell.acs-mobile-layout .acs-update-feedback {
  display: none !important;
}

.acs-shell.acs-mobile-layout .acs-topbar-actions {
  flex: 0 0 auto;
  gap: 1px;
}

.acs-shell.acs-mobile-layout .acs-icon-button,
.acs-shell.acs-mobile-layout .acs-tour-launch,
.acs-shell.acs-mobile-layout .acs-mobile-flow-toggle {
  display: grid;
  width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  place-items: center;
  border-radius: 10px;
}

.acs-shell.acs-mobile-layout #acs-save-project,
.acs-shell.acs-mobile-layout #acs-tour-launch,
.acs-shell.acs-mobile-layout #acs-step-help {
  flex: 0 0 auto;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* 手机端保留导出和检查更新入口；窄屏时均使用紧凑图标。 */
.acs-shell.acs-mobile-layout #acs-save-project,
.acs-shell.acs-mobile-layout #acs-check-update {
  display: grid;
}

.acs-shell.acs-mobile-layout .acs-update-control {
  display: block;
  flex: 0 0 auto;
}

.acs-shell.acs-mobile-layout .acs-tour-launch span {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-mobile-flow-toggle {
  border: 1px solid var(--acs-line);
  background: rgba(56, 53, 47, 0.84);
  color: var(--acs-muted);
  cursor: pointer;
}

.acs-shell.acs-mobile-layout .acs-mobile-flow-toggle i {
  display: block;
  color: currentColor;
  font-size: 15px;
  line-height: 1;
}

.acs-shell.acs-mobile-layout .acs-mobile-flow-toggle[aria-expanded="true"],
.acs-shell.acs-mobile-layout #acs-inspector-toggle[aria-expanded="true"] {
  border-color: rgba(217, 119, 87, 0.52);
  background: var(--acs-cyan-soft);
  color: var(--acs-cyan);
}

.acs-shell.acs-mobile-layout .acs-workspace {
  position: relative;
  display: block;
  min-width: 0;
  overflow: hidden;
}

.acs-shell.acs-mobile-layout .acs-stage {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  min-width: 0;
}

.acs-shell.acs-mobile-layout .acs-rail,
.acs-shell.acs-mobile-layout .acs-inspector {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 16;
  display: grid;
  height: auto;
  box-shadow: 0 0 46px rgba(10, 9, 8, 0.5);
  transition: transform 220ms cubic-bezier(.2,.75,.25,1);
}

.acs-shell.acs-mobile-layout .acs-rail {
  left: 0;
  width: min(86vw, 340px);
  transform: translateX(-104%);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-rail {
  transform: translateX(0);
}

.acs-shell.acs-mobile-layout .acs-inspector,
.acs-shell.acs-mobile-layout .acs-inspector.is-expanded {
  right: 0;
  left: auto;
  width: min(94vw, 420px);
  background: #292722;
  transform: translateX(104%);
}

.acs-shell.acs-mobile-layout .acs-inspector.is-mobile-open,
.acs-shell.acs-mobile-layout .acs-inspector.is-expanded {
  display: grid;
  transform: translateX(0);
}

.acs-shell.acs-mobile-layout .acs-mobile-scrim {
  position: absolute;
  inset: calc(50px + env(safe-area-inset-top, 0px)) 0 0;
  z-index: 15;
  border: 0;
  background: rgba(15, 13, 11, 0.58);
  backdrop-filter: blur(3px);
}

.acs-shell.acs-mobile-layout.is-mobile-panel-open .acs-mobile-scrim {
  display: block;
}

.acs-shell.acs-mobile-layout #acs-tour-overlay,
.acs-shell.acs-mobile-layout #acs-step-help-overlay,
.acs-shell.acs-mobile-layout #acs-prompt-preview {
  position: fixed;
  inset: 0;
  z-index: 10090;
  padding: max(12px, env(safe-area-inset-top, 0px)) 12px max(12px, env(safe-area-inset-bottom, 0px));
  overscroll-behavior: contain;
}

.acs-shell.acs-mobile-layout #acs-tour-overlay {
  overflow: auto;
}

.acs-shell.acs-mobile-layout .acs-tour-card,
.acs-shell.acs-mobile-layout .acs-step-help-dialog {
  max-width: 100%;
  max-height: min(76dvh, 620px);
  overscroll-behavior: contain;
}

.acs-shell.acs-mobile-layout .acs-step-help-dialog {
  width: 100%;
}

/* 说明在手机端改为完整页面，标题和关闭按钮不会被内容滚出屏幕。 */
.acs-shell.acs-mobile-layout #acs-step-help-overlay {
  display: block;
  padding: 0;
}

.acs-shell.acs-mobile-layout #acs-step-help-overlay .acs-step-help-dialog {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  max-height: none;
  border: 0;
  border-radius: 0;
  overscroll-behavior: contain;
}

.acs-shell.acs-mobile-layout #acs-step-help-overlay .acs-step-help-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-top: max(18px, env(safe-area-inset-top, 0px));
  background: #2b2925;
}

.acs-shell.acs-mobile-layout #acs-step-help-overlay .acs-step-help-body {
  padding-bottom: max(28px, calc(18px + env(safe-area-inset-bottom, 0px)));
}

.acs-shell.acs-mobile-layout .acs-project-identity {
  padding: 14px 13px 12px;
}

.acs-shell.acs-mobile-layout .acs-project-title-field,
.acs-shell.acs-mobile-layout .acs-progress-row,
.acs-shell.acs-mobile-layout .acs-step-name,
.acs-shell.acs-mobile-layout .acs-step-number,
.acs-shell.acs-mobile-layout .acs-quiet-action,
.acs-shell.acs-mobile-layout .acs-phase-title,
.acs-shell.acs-mobile-layout .acs-phase-progress {
  display: block;
}

.acs-shell.acs-mobile-layout .acs-progress-row {
  display: flex;
}

.acs-shell.acs-mobile-layout .acs-step-rail {
  padding: 10px 8px calc(18px + env(safe-area-inset-bottom, 0px));
}

.acs-shell.acs-mobile-layout .acs-phase-toggle {
  grid-template-columns: minmax(0, 1fr) auto 13px;
  width: 100%;
  min-height: 38px;
  margin: 0;
  padding: 7px 9px 7px 12px;
}

.acs-shell.acs-mobile-layout .acs-phase-steps {
  padding-left: 10px;
}

.acs-shell.acs-mobile-layout .acs-phase-steps::before {
  left: 20px;
}

.acs-shell.acs-mobile-layout .acs-step-button {
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  width: 100%;
  min-height: 43px;
}

.acs-shell.acs-mobile-layout .acs-stage-heading {
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px 7px;
}

.acs-shell.acs-mobile-layout .acs-stage-heading h2 {
  font-size: clamp(18px, 5.3vw, 22px);
  line-height: 1.14;
}

.acs-shell.acs-mobile-layout .acs-stage-heading-actions {
  gap: 5px;
}

.acs-shell.acs-mobile-layout .acs-state-chip,
.acs-shell.acs-mobile-layout .acs-overview-toggle span,
.acs-shell.acs-mobile-layout .acs-clear-step-button span {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-overview-toggle,
.acs-shell.acs-mobile-layout .acs-clear-step-button,
.acs-shell.acs-mobile-layout .acs-step-help-button {
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  justify-content: center;
}

.acs-shell.acs-mobile-layout .acs-step-goal {
  margin-top: 4px;
  font-size: 9px;
  line-height: 1.4;
}

.acs-shell.acs-mobile-layout .acs-brief-panel {
  margin: 0 10px 7px;
  padding: 8px;
}

.acs-shell.acs-mobile-layout .acs-brief-panel textarea {
  min-height: 58px;
  max-height: 21vh;
  font-size: 11px;
}

.acs-shell.acs-mobile-layout .acs-conversation {
  padding: 8px 10px 10px;
  scroll-padding-bottom: 14px;
}

.acs-shell.acs-mobile-layout .acs-empty-turns {
  width: 100%;
  padding: 14px 3px;
}

.acs-shell.acs-mobile-layout .acs-empty-turns h3 {
  font-size: 19px;
}

.acs-shell.acs-mobile-layout .acs-guide-prompts {
  grid-template-columns: 1fr;
}

.acs-shell.acs-mobile-layout .acs-guide-prompts li {
  min-height: 0;
}

.acs-shell.acs-mobile-layout .acs-turn {
  max-width: 100%;
}

.acs-shell.acs-mobile-layout .acs-turn-content {
  font-size: 11.5px;
  line-height: 1.64;
}

.acs-shell.acs-mobile-layout .acs-composer {
  padding: 7px 10px calc(8px + env(safe-area-inset-bottom, 0px));
}

.acs-shell.acs-mobile-layout .acs-composer textarea {
  min-height: 52px;
  max-height: 22vh;
  font-size: 12px;
}

.acs-shell.acs-mobile-layout .acs-composer-actions {
  display: block;
}

.acs-shell.acs-mobile-layout .acs-composer-actions > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.acs-shell.acs-mobile-layout .acs-composer-actions .acs-button {
  min-width: 0;
  min-height: 36px;
  padding: 6px 7px;
  font-size: 10px;
}

.acs-shell.acs-mobile-layout .acs-button-confirm {
  grid-column: 1 / -1;
}

.acs-shell.acs-mobile-layout .acs-conversation-nav {
  top: 0;
  right: 12px;
  bottom: auto;
  height: auto;
}

.acs-shell.acs-mobile-layout .acs-tabs {
  padding: 5px 8px 0;
}

.acs-shell.acs-mobile-layout .acs-tab {
  min-height: 38px;
}

.acs-shell.acs-mobile-layout .acs-tab-panel {
  padding: 12px 10px calc(20px + env(safe-area-inset-bottom, 0px));
}

.acs-shell.acs-mobile-layout .acs-field-grid,
.acs-shell.acs-mobile-layout .acs-model-picker {
  grid-template-columns: 1fr;
}

.acs-shell.acs-mobile-layout .acs-field-stack input,
.acs-shell.acs-mobile-layout .acs-field-stack select,
.acs-shell.acs-mobile-layout .acs-button-compact {
  min-height: 38px;
  font-size: 11px;
}

.acs-shell.acs-mobile-layout .acs-artifact-filter-bar {
  flex-wrap: nowrap;
  padding-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.acs-shell.acs-mobile-layout .acs-artifact-filter-bar::-webkit-scrollbar {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-artifact-filter-button {
  flex: 0 0 auto;
  min-height: 32px;
}

.acs-shell.acs-mobile-layout .acs-artifact summary {
  min-height: 40px;
}

.acs-shell.acs-mobile-layout .acs-artifact-editor textarea.acs-artifact-content {
  min-height: 42vh;
  max-height: 62vh;
  padding: 11px;
  font-size: 11.5px;
}

.acs-shell.acs-mobile-layout .acs-resource-dock-tab {
  display: none !important;
}

.acs-shell.acs-mobile-layout .acs-resource-drawer {
  top: calc(50px + env(safe-area-inset-top, 0px));
  width: 100%;
  max-width: none;
}

.acs-shell.acs-mobile-layout .acs-prompt-preview-panel,
.acs-shell.acs-mobile-layout .acs-delivery-dialog {
  width: 100%;
  height: 100%;
  max-height: none;
  border-radius: 0;
}

/* 提示词预览在手机上独占视图，避免被步骤或产物抽屉遮住。 */
.acs-shell.acs-mobile-layout #acs-prompt-preview {
  display: grid;
  padding: 0;
}

.acs-shell.acs-mobile-layout #acs-preview-prompt {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* 预览内容很多时，手机端保持独立滚动区，避免整个页面失去响应。 */
.acs-shell.acs-mobile-layout #acs-prompt-preview .acs-prompt-preview-backdrop {
  display: none;
}

.acs-shell.acs-mobile-layout #acs-prompt-preview .acs-prompt-preview-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.acs-shell.acs-mobile-layout #acs-prompt-preview .acs-prompt-preview-head {
  padding-top: max(14px, env(safe-area-inset-top, 0px));
}

.acs-shell.acs-mobile-layout #acs-prompt-preview .acs-prompt-message-list {
  min-height: 0;
  overflow: auto;
  padding-bottom: max(24px, calc(14px + env(safe-area-inset-bottom, 0px)));
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* 手机端使用抽屉浏览产物，不显示桌面端的放大模式。 */
.acs-shell.acs-mobile-layout #acs-expand-artifacts {
  display: none !important;
}

.acs-shell.acs-mobile-layout .acs-prompt-preview-note,
.acs-shell.acs-mobile-layout .acs-prompt-message-list,
.acs-shell.acs-mobile-layout .acs-delivery-body {
  padding-right: 12px;
  padding-left: 12px;
}

/* 新手引导不再套用桌面端浮动定位，手机上始终完整显示。 */
.acs-shell.acs-mobile-layout #acs-tour-overlay {
  display: block;
  padding: 0;
  background: #2b2925;
}

.acs-shell.acs-mobile-layout #acs-tour-spotlight {
  display: none !important;
}

.acs-shell.acs-mobile-layout #acs-tour-card {
  position: relative !important;
  inset: auto !important;
  display: flex;
  flex-direction: column;
  width: 100% !important;
  height: 100vh;
  height: 100dvh;
  max-height: none;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  transform: none !important;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.acs-shell.acs-mobile-layout #acs-tour-card .acs-tour-card-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: max(16px, env(safe-area-inset-top, 0px)) 17px 13px;
  border-bottom: 1px solid var(--acs-line-soft);
  background: #302e29;
}

.acs-shell.acs-mobile-layout #acs-tour-content {
  display: contents;
}

.acs-shell.acs-mobile-layout #acs-tour-card > .acs-tour-eyebrow {
  margin: 20px 17px 0;
}

.acs-shell.acs-mobile-layout #acs-tour-card > h2,
.acs-shell.acs-mobile-layout #acs-tour-card > .acs-tour-description,
.acs-shell.acs-mobile-layout #acs-tour-card > .acs-tour-points,
.acs-shell.acs-mobile-layout #acs-tour-card > .acs-tour-action-note,
.acs-shell.acs-mobile-layout #acs-tour-card > .acs-tour-dots {
  margin-right: 17px;
  margin-left: 17px;
}

.acs-shell.acs-mobile-layout #acs-tour-card .acs-tour-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin: auto 0 0;
  padding: 12px 17px max(14px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--acs-line-soft);
  background: #302e29;
}

/* 手机端步骤使用“航站轨道 + 完整抽屉”：平时只占窄栏，需要时从左侧展开。 */
.acs-shell.acs-mobile-layout .acs-workspace {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
}

.acs-shell.acs-mobile-layout .acs-rail {
  position: relative;
  grid-column: 1;
  z-index: 2;
  display: flex;
  width: 56px;
  min-width: 56px;
  overflow: hidden;
  border-right-color: rgba(232, 224, 212, 0.1);
  background:
    linear-gradient(180deg, rgba(217, 119, 87, 0.07), transparent 150px),
    #292722;
  transform: none;
  box-shadow: none;
  transition: width 220ms cubic-bezier(.2,.75,.25,1), box-shadow 220ms ease;
}

.acs-shell.acs-mobile-layout .acs-rail::after {
  position: absolute;
  top: 50px;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(transparent, rgba(217, 119, 87, 0.2) 18%, rgba(232, 224, 212, 0.08) 72%, transparent);
  content: "";
  pointer-events: none;
}

.acs-shell.acs-mobile-layout .acs-stage {
  position: relative;
  inset: auto;
  grid-column: 2;
  width: auto;
}

.acs-mobile-rail-head {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-head {
  position: relative;
  z-index: 3;
  display: flex;
  flex: 0 0 50px;
  align-items: center;
  justify-content: center;
  padding: 6px 8px 5px;
  border-bottom: 1px solid rgba(232, 224, 212, 0.08);
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-heading {
  display: none;
  min-width: 0;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-heading span,
.acs-shell.acs-mobile-layout .acs-mobile-rail-heading strong {
  display: block;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-heading span {
  color: var(--acs-cyan);
  font-family: var(--acs-mono);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-heading strong {
  margin-top: 2px;
  color: var(--acs-text-soft);
  font-size: 10.5px;
  font-weight: 650;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-toggle {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  width: 38px;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(217, 119, 87, 0.24);
  border-radius: 11px;
  outline: 0;
  background: linear-gradient(145deg, rgba(217, 119, 87, 0.14), rgba(56, 53, 47, 0.72));
  color: var(--acs-cyan);
  cursor: pointer;
  place-items: center;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035), 0 6px 16px rgba(10, 9, 8, 0.18);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-toggle i {
  font-size: 12px;
}

.acs-shell.acs-mobile-layout .acs-mobile-rail-current {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: grid;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border: 2px solid #292722;
  border-radius: 999px;
  background: var(--acs-cyan);
  color: var(--acs-void);
  font-family: var(--acs-mono);
  font-size: 6px;
  font-weight: 800;
  line-height: 1;
  place-items: center;
}

.acs-shell.acs-mobile-layout .acs-project-identity,
.acs-shell.acs-mobile-layout .acs-step-name,
.acs-shell.acs-mobile-layout .acs-step-number,
.acs-shell.acs-mobile-layout .acs-phase-title,
.acs-shell.acs-mobile-layout .acs-phase-progress,
.acs-shell.acs-mobile-layout .acs-quiet-action {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-step-rail {
  padding: 3px 5px calc(12px + env(safe-area-inset-bottom, 0px));
  scroll-padding-top: 6px;
}

.acs-shell.acs-mobile-layout .acs-phase-group + .acs-phase-group {
  margin-top: 5px;
}

.acs-shell.acs-mobile-layout .acs-phase-toggle {
  display: grid;
  grid-template-columns: 1fr;
  width: 42px;
  min-height: 18px;
  margin: 0 auto;
  padding: 1px 3px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(208, 200, 189, 0.56);
  place-items: center;
}

.acs-shell.acs-mobile-layout .acs-phase-toggle::before {
  content: attr(data-mobile-label);
  font-family: var(--acs-mono);
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.acs-shell.acs-mobile-layout .acs-phase-toggle > i {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-phase-group.is-current-phase > .acs-phase-toggle {
  background: rgba(217, 119, 87, 0.1);
  color: var(--acs-cyan);
}

.acs-shell.acs-mobile-layout .acs-phase-steps {
  padding-left: 0;
}

.acs-shell.acs-mobile-layout .acs-phase-steps::before {
  top: 0;
  bottom: 0;
  left: 21px;
  opacity: 0.24;
}

.acs-shell.acs-mobile-layout .acs-step-button {
  grid-template-columns: 42px;
  width: 42px;
  min-height: 29px;
  margin: 0 auto;
  padding: 2px 0;
  border-radius: 10px;
  place-items: center;
}

.acs-shell.acs-mobile-layout .acs-step-button.is-active {
  background: linear-gradient(90deg, rgba(217, 119, 87, 0.2), rgba(217, 119, 87, 0.07));
}

.acs-shell.acs-mobile-layout .acs-step-node {
  position: relative;
  width: 19px;
  height: 19px;
  margin: 0;
  border-color: rgba(171, 162, 151, 0.42);
  background: #2f2c27;
  color: var(--acs-muted);
  font-family: var(--acs-mono);
  font-size: 6px;
  font-weight: 700;
}

.acs-shell.acs-mobile-layout .acs-step-node::before {
  content: attr(data-mobile-number);
}

.acs-shell.acs-mobile-layout .acs-step-button.is-complete .acs-step-node::before {
  display: none;
}

.acs-shell.acs-mobile-layout .acs-step-button.is-complete .acs-step-node {
  color: var(--acs-void);
}

.acs-shell.acs-mobile-layout .acs-step-button.is-active .acs-step-node {
  border-color: var(--acs-cyan);
  background: var(--acs-cyan);
  color: var(--acs-void);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1), 0 4px 10px rgba(217, 119, 87, 0.22);
}

/* 展开后恢复完整项目、阶段与步骤信息，作为适合触控的左侧抽屉。 */
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-rail {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 16;
  width: min(82vw, 310px);
  min-width: min(82vw, 310px);
  border-right-color: rgba(217, 119, 87, 0.24);
  box-shadow: 22px 0 54px rgba(10, 9, 8, 0.48);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-mobile-rail-head {
  justify-content: space-between;
  padding: 6px 10px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-mobile-rail-heading {
  display: block;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-mobile-rail-toggle {
  width: 34px;
  height: 34px;
  border-color: var(--acs-line);
  border-radius: 10px;
  background: rgba(56, 53, 47, 0.84);
  color: var(--acs-text-soft);
  box-shadow: none;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-mobile-rail-current {
  display: none;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-identity,
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-name,
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-number,
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-title,
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-progress,
.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-quiet-action {
  display: block;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-identity {
  padding: 9px 10px 8px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-title-field label {
  margin: 0 0 4px 3px;
  font-size: 7px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-name-control {
  grid-template-columns: 27px minmax(0, 1fr) 24px;
  min-height: 40px;
  padding: 4px 5px;
  border-radius: 13px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-title-icon {
  width: 27px;
  height: 27px;
  border-radius: 9px;
  font-size: 9px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-name-control input {
  padding: 3px 6px;
  font-size: 13px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-project-name-control > i {
  width: 24px;
  height: 24px;
  font-size: 8px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-progress-row {
  display: flex;
  margin-top: 7px;
  font-size: 8px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-progress-track {
  margin-top: 4px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-rail {
  padding: 7px 7px calc(14px + env(safe-area-inset-bottom, 0px));
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-toggle {
  grid-template-columns: minmax(0, 1fr) max-content 12px;
  gap: 5px;
  align-items: center;
  justify-items: stretch;
  width: 100%;
  min-height: 34px;
  margin: 0;
  padding: 5px 7px 5px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--acs-muted);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-toggle::before {
  display: none;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-toggle > i {
  display: block;
  justify-self: center;
  font-size: 7px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-title {
  min-width: 0;
  font-size: 8px;
  line-height: 1.2;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-progress {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  width: auto;
  min-width: 28px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 6.5px;
  line-height: 1;
  white-space: nowrap;
  aspect-ratio: auto;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-group.is-current-phase > .acs-phase-toggle {
  border-color: rgba(217, 119, 87, 0.18);
  background: rgba(217, 119, 87, 0.07);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-steps {
  padding-left: 8px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-phase-steps::before {
  top: 3px;
  bottom: 5px;
  left: 18px;
  opacity: 0.38;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-button {
  grid-template-columns: 24px minmax(0, 1fr) 20px;
  align-items: center;
  justify-items: stretch;
  width: 100%;
  min-height: 36px;
  margin: 1px 0;
  padding: 3px 6px 3px 0;
  border-radius: 9px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-node {
  align-self: center;
  justify-self: start;
  width: 13px;
  height: 13px;
  margin-left: 4px;
  font-size: 6px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-name {
  min-width: 0;
  font-size: 10.5px;
  line-height: 1.25;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-number {
  align-self: center;
  font-size: 7px;
  line-height: 1;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-button.is-active {
  background: linear-gradient(90deg, rgba(217, 119, 87, 0.17), rgba(217, 119, 87, 0.045));
  box-shadow: inset 2px 0 0 rgba(217, 119, 87, 0.68);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-button.is-active .acs-step-node {
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.09);
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-core-step-badge {
  margin-left: 5px;
  padding: 1px 4px;
  font-size: 6px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-quiet-action {
  min-height: 36px;
  margin: 6px 10px 10px;
  padding: 7px;
  border-radius: 9px;
  font-size: 10px;
}

.acs-shell.acs-mobile-layout.is-mobile-flow-open .acs-step-node::before {
  display: none;
}

/* 项目库在手机端属于步骤抽屉的上一级视图，不再套用桌面悬浮层。 */
.acs-shell.acs-mobile-layout.is-mobile-project-menu-open .acs-project-identity {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
}

.acs-shell.acs-mobile-layout.is-mobile-project-menu-open .acs-step-rail,
.acs-shell.acs-mobile-layout.is-mobile-project-menu-open #acs-new-project {
  display: none !important;
}

.acs-shell.acs-mobile-layout .acs-project-menu {
  position: relative;
  top: auto;
  left: auto;
  z-index: 1;
  width: 100%;
  margin-top: 8px;
  border-radius: 12px;
  box-shadow: none;
  transform: translateY(-7px);
  transform-origin: top center;
}

.acs-shell.acs-mobile-layout .acs-project-menu.is-open { transform: translateY(0); }
.acs-shell.acs-mobile-layout .acs-project-menu::before { display: none; }
.acs-shell.acs-mobile-layout .acs-project-menu-head,
.acs-shell.acs-mobile-layout .acs-project-menu-foot { padding: 9px 10px; }
.acs-shell.acs-mobile-layout .acs-project-list { max-height: none; padding: 6px; overflow: visible; }
.acs-shell.acs-mobile-layout .acs-project-row { grid-template-columns: minmax(0, 1fr) 34px; }
.acs-shell.acs-mobile-layout .acs-project-switch { padding: 8px 7px 8px 9px; }
.acs-shell.acs-mobile-layout .acs-project-switch strong { font-size: 11px; }
.acs-shell.acs-mobile-layout .acs-project-switch small { margin-top: 3px; font-size: 7px; }
.acs-shell.acs-mobile-layout .acs-project-delete { width: 30px; height: 30px; opacity: 0.82; }
.acs-shell.acs-mobile-layout .acs-project-menu-new {
  min-height: 34px;
  padding: 7px 10px;
  font-size: 10px;
  white-space: nowrap;
}

/* 收起概览后的步骤标题仍完整占用剩余空间。 */
.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 5px;
  min-height: 44px;
  padding: 6px 7px 6px 9px;
}

.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading > div:first-child {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px;
  overflow: hidden;
}

.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading .acs-eyebrow {
  font-size: 7px;
  letter-spacing: 0.12em;
}

.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading h2 {
  overflow: visible;
  font-size: 11px;
  line-height: 1.2;
  text-overflow: clip;
  white-space: nowrap;
}

.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-stage-heading-actions { gap: 3px; }
.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-overview-toggle,
.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-clear-step-button,
.acs-shell.acs-mobile-layout .acs-stage.is-overview-collapsed .acs-step-help-button {
  width: 27px;
  min-width: 27px;
  height: 27px;
}

/* 预设条目编辑器与更新公告保持同一种紧凑、居中的操作区。 */
.acs-shell.acs-mobile-layout .acs-resource-editor-actions {
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding-right: 13px;
  padding-left: 13px;
}

.acs-shell.acs-mobile-layout .acs-resource-editor-actions .acs-button {
  flex: 0 1 auto;
  width: auto;
  min-width: 108px;
  min-height: 36px;
  margin: 0;
  padding: 7px 14px;
  white-space: nowrap;
}

.acs-shell.acs-mobile-layout .acs-resource-editor-actions .acs-button-publish { min-width: 154px; }

@media (max-width: 390px) {
  .acs-shell.acs-mobile-layout .acs-brand-mark {
    display: none;
  }

  .acs-shell.acs-mobile-layout .acs-brand h1 {
    max-width: 26vw;
    font-size: 13px;
  }

  .acs-shell.acs-mobile-layout .acs-topbar-actions {
    gap: 1px;
  }

  .acs-shell.acs-mobile-layout .acs-icon-button,
  .acs-shell.acs-mobile-layout .acs-tour-launch,
  .acs-shell.acs-mobile-layout .acs-mobile-flow-toggle {
    width: 30px;
    height: 30px;
  }
}

@media (max-width: 350px) {
  .acs-shell.acs-mobile-layout .acs-brand > div {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .acs-shell.acs-mobile-layout .acs-rail,
  .acs-shell.acs-mobile-layout .acs-inspector {
    transition: none;
  }
}
`;

const TOUR_STEPS = Object.freeze([
    {
        selector: '.acs-brand',
        placement: 'bottom',
        scene: 'welcome',
        eyebrow: 'ORIENTATION 01',
        title: '先看懂 A.U.T.O 怎样制卡',
        description: '创作台把 A.U.T.O 预设变成 29 个可对话、可返工的步骤：先确定体验，再设计世界、叙事、变量、装配、AutoTask，最后生成开场并发布。',
        points: ['你负责提出方向、检查结果和决定取舍；AI 负责按当前步骤产出正式区块。', '引导会切换页面和展开区域，但不会生成内容、删除数据或发布角色卡。'],
        actionNote: '完成引导后，界面会恢复到开始前的状态。',
    },
    {
        selector: '.acs-resource-import-card',
        fallbackSelector: '.acs-connection-section',
        placement: 'left',
        scene: 'resources',
        eyebrow: 'RESOURCES 02',
        title: '第一步不是生成，而是导入资源',
        description: '在设置页导入完整的 A.U.T.O 预设。创作台会从中识别 29 个步骤、其他辅助提示词，以及预设内置的正则。也可以另行导入正则包。',
        points: ['这些资源只属于创作台，不绑定 SillyTavern 当前预设，也不读取全局、预设或角色正则。', '缺少完整预设时仍可查看项目，但不能正式调用 AI 生成。'],
        actionNote: '已自动切换到设置页的资源导入区域。',
    },
    {
        selector: '.acs-resource-drawer',
        fallbackSelector: '#acs-resource-dock-tab',
        placement: 'left',
        scene: 'resource-drawer',
        eyebrow: 'CONTROL 03',
        title: '逐项决定哪些辅助条目生效',
        description: '设置页右侧的小页签会打开“预设与正则条目”。这里显示 29 个步骤之外的辅助提示词，以及创作台用于整理 AI 回复的正则。',
        points: ['开关只影响创作台的发送与显示，不会改动原始导入文件。', '如果某段回复没有正确隐藏，先在正则页检查对应条目是否已启用。'],
        actionNote: '已自动打开右侧资源抽屉。',
    },
    {
        selector: '#acs-project-menu',
        fallbackSelector: '.acs-project-identity',
        placement: 'right',
        scene: 'projects',
        eyebrow: 'PROJECT 04',
        title: '一个创作方案保存为一个项目',
        description: '点击项目名左侧的文件夹可打开项目库。每个项目独立保存母题、29 步对话、正式产物、历史版本和发布名称。',
        points: ['可以新建、切换和删除多个项目；切换不会丢失当前进度。', '顶部导出按钮保存完整项目 JSON，适合备份、迁移或分享协作。'],
        actionNote: '已自动展开项目库。',
    },
    {
        selector: '#acs-brief-panel',
        placement: 'right',
        scene: 'brief',
        eyebrow: 'THESIS 05',
        title: '用创作母题告诉整张卡要去哪里',
        description: '母题是所有步骤共享的总方向，不是某一轮的临时命令。它应简要说明玩家身份、核心体验、审美倾向、世界边界和明确禁区。',
        points: ['先写能指导取舍的几句话，不必一开始就完成整套设定。', '母题可以持续修改；收起概览后可把更多空间留给对话。'],
        actionNote: '已自动展开创作母题。',
    },
    {
        selector: '#acs-step-rail',
        placement: 'right',
        scene: 'route',
        eyebrow: 'ROUTE 06',
        title: '29 步分成六个阶段，不要求全部完成',
        description: '左侧依次是核心与世界、叙事与体验、变量化系统、装配设计、AutoTask 配置、启动与交付。大类可以折叠，步骤可以随时返回。',
        points: ['“核心”只标出最能代表流程的 1、4、7、8、24、29 步，不等于强制完成。', '确认后的最新版会进入后续上下文；是否跳过其他步骤取决于角色卡复杂度。'],
        actionNote: '已展开第一阶段并定位核心 Step 1。',
    },
    {
        selector: '.acs-stage-heading',
        placement: 'bottom',
        scene: 'station',
        eyebrow: 'STATION 07',
        title: '每一步先看说明，再开始对话',
        description: '标题旁的说明按钮解释该步骤的用途、建议做法、最终产物和常见误区。中间空白页还会给出三个适合起步的问题。',
        points: ['状态分为未开始、草案和已确认；确认后仍可返回修改。', '标题区的“清空对话”只清理本步骤对话，已经形成的正式产物继续保留。'],
        actionNote: '已切换到 Step 1，说明按钮位于步骤标题旁。',
    },
    {
        selector: '.acs-composer',
        placement: 'top',
        scene: 'compose',
        eyebrow: 'DIALOGUE 08',
        title: '把每一步当作一次可持续修改的对话',
        description: '输入你的要求后生成草案；不满意就继续指出修改方向。留空也可以让 A.U.T.O 根据母题和既有正式产物主动完成当前步骤。',
        points: ['最新一条输入可以重试，旧回复中的产物会保留为历史版本。', '满意后确认并前往下一步；清空对话后也能从头讨论，但产物不会误删。'],
        actionNote: '已收起概览，让输入框和生成按钮完整显示。',
    },
    {
        selector: '#acs-preview-prompt',
        placement: 'top',
        scene: 'prompt',
        eyebrow: 'REQUEST 09',
        title: '发送前可以检查完整提示词',
        description: '“查看提示词”按实际发送顺序列出辅助条目、当前步骤、项目上下文和本轮输入，适合排查模型为什么得到某些信息。',
        points: ['项目上下文只使用正式产物的最新版，不会把所有旧代码块重复发送。', '{{char}} 与 {{user}} 会在查看器中保持模板变量形式。'],
        actionNote: '引导不打开大型提示词窗口，结束后可自行点击检查。',
    },
    {
        selector: '.acs-inspector-intro',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'artifacts',
        eyebrow: 'ARTIFACT 10',
        title: '右侧产物栏才是最终交付内容',
        description: '这里仅提取预设明确要求复制的正式区块，不收录 AI 的思考、评分、解释或追问。产物可直接编辑，修改会自动保存。',
        points: ['同名产物默认使用最新版，也能切换历史、恢复、复制或按分类搜索。', '删除会移除该产物的全部历史版本；重新生成后它会作为新产物再次出现。'],
        actionNote: '已切换到产物页；小屏幕会自动打开右侧栏。',
    },
    {
        selector: '.acs-connection-section',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'settings',
        eyebrow: 'MODEL 11',
        title: '模型连接与创作资源彼此独立',
        description: '模型既可跟随 SillyTavern 当前连接，也可为创作台单独配置接口、密钥和模型。无论选择哪种连接，使用的仍是创作台自己导入的预设与正则。',
        points: ['独立连接的密钥只保存在当前页面内存，刷新后需要重新填写。', '“获取模型”可读取兼容接口的模型列表，也可以手动填写模型名。'],
        actionNote: '已返回设置页并定位模型连接。',
    },
    {
        selector: '#acs-step-rail',
        placement: 'right',
        scene: 'output',
        eyebrow: 'ASSEMBLY 12',
        title: '输出格式决定游玩时每轮回复的结构',
        description: 'Step 23 设计状态栏，Step 24 设计正文、摘要、选项、变量更新和状态栏数据如何组合。两者必须与变量方案和 AutoTask 分工保持一致。',
        points: ['选择导出 Step 24 的输出格式时，发布流程会询问是否同时载入 9 条配套局部正则。', '状态栏显示正则不使用示例包，而是由 Step 23 根据当前项目动态生成。'],
        actionNote: '已展开装配设计并定位核心 Step 24。',
    },
    {
        selector: '#acs-step-rail',
        placement: 'right',
        scene: 'autotask',
        eyebrow: 'AUTOTASK 13',
        title: 'AutoTask 是可选的副 AI 自动化层',
        description: 'Step 25–28 用于把摘要、变量更新、世界书维护等独立工作交给副 AI，并规划它能读取什么、写回哪里、何时触发。',
        points: ['没有异步任务需求时可以跳过，不必为了完成进度强行配置。', '有变量或大型世界书时，应严格限制每个任务的读取范围与输出位置。'],
        actionNote: '已展开 AutoTask 配置阶段并定位 Step 25。',
    },
    {
        selector: '.acs-publish-copy',
        fallbackSelector: '#acs-inspector-toggle',
        placement: 'left',
        scene: 'publish',
        eyebrow: 'HANDOFF 14',
        title: '最后从正式产物创建角色卡与世界书',
        description: '发布时先勾选本次要交付的产物。创作台会自动执行原 Step 29 的世界书重组，校验没有遗漏后，再创建世界书并绑定角色卡。',
        points: ['若选择输出格式，会先询问是否载入配套局部正则，再单独确认是否创建角色卡。', '同名角色卡或世界书会更新；原有头像与无关扩展数据继续保留。'],
        actionNote: '已切换到发布页；引导不会执行真实发布。',
    },
    {
        selector: '.acs-topbar-actions',
        placement: 'bottom',
        scene: 'controls',
        eyebrow: 'SAFETY 15',
        title: '自动保存不等于永久备份',
        description: '项目会自动保存在当前浏览器，但清理站点数据或更换设备仍可能丢失。标题栏右侧可检查更新和导出项目文件。',
        points: ['重要项目建议阶段性导出 JSON；发布页还可下载便于阅读的创作档案。', '随时可从标题旁重开引导；Esc 退出，左右方向键切换引导步骤。'],
        actionNote: '完成后将恢复原来的步骤、折叠状态、页签和滚动位置。',
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
    ['0b166044-370f-428d-ba4c-35531287b921', '开场白和变量初始值', '用已完成的世界设定生成正式开场，并给出完整变量初始树。'],
].map(([promptId, name, goal], index) => ({
    number: index + 1,
    promptId,
    name,
    goal,
    phase: PHASES.find(phase => index + 1 >= phase.range[0] && index + 1 <= phase.range[1]).id,
}));

// 按 A.U.T.O 教程标出最能代表整套制卡逻辑的核心节点；“核心”不等于强制完成。
const CORE_STEP_NUMBERS = new Set([1, 4, 7, 8, 24, 29]);

// 每一站都给出不同的创作入口，避免初次使用者只看到抽象的阶段名称。
const STEP_GUIDES = [
    {
        title: '先定下这段体验的方向',
        description: '先规定玩家与 AI 的互动关系，再锚定希望持续获得的审美体验。重点不是堆设定，而是说清 AI 能做什么、不能做什么、该关注什么。',
        prompts: ['玩家以什么身份进入故事，AI 可以替玩家说话、行动或推进到什么程度？', '你最想持续获得什么体验，AI 应重点关注哪些内容与感受？', '采用什么视角与信息边界；哪些行为、走向或表现方式明确禁止？'],
        placeholder: '例如：玩家扮演刚抵达边境城的调查员；AI 可主动推动世界与 NPC，但不替玩家作关键选择；第三人称近距离，重点是未知探索与同伴信任。',
    },
    {
        title: '找出体验持续发生的办法',
        description: '反推哪些世界机制能让 Step 1 的体验成立或更加突出。简单世界可以跳过，也可以把结果只当作设计参考或反复重刷的灵感。',
        prompts: ['为了让核心体验成立，世界中不可缺少哪些规则、资源或冲突？', '这些机制怎样在剧情里反复运作，而不是只在开场出现一次？', '哪些结果必须进入成品，哪些只需要作为后续设计参考？'],
        placeholder: '例如：线索调查持续推动探索；同伴信任决定情报真实性。先给出必要机制，也注明哪些只作设计参考、不写入最终世界书。',
    },
    {
        title: '画出变化发生的轨迹',
        description: '专门推演单线长剧情从起点到终点的阶段变化，只用于指导后续设计，默认不进入运行中的角色卡。开放世界、多线结构或短剧情可以跳过。',
        prompts: ['这条单线长剧情从什么状态开始，最终要走向哪里？', '中间有哪些不可缺少的阶段和关键转折？', '它是否真的适合单线推演；若存在多条并行路线，是否应该改用状态机设计？'],
        placeholder: '例如：推演一条从互不信任到共同承担责任的单线关系弧光，列出关键阶段与转折；仅作为后续设计图，不写入最终世界书。',
    },
    {
        title: '搭起世界能够运行的骨架',
        description: '描摹世界的整体面貌。它既可以作为防止后续跑偏的设计图，也可以直接成为简单世界的主要正式设定。',
        prompts: ['这是怎样的时代、地域或社会，最重要的结构与矛盾是什么？', '哪些力量、规则和边界让这个世界能够运转？', '本蓝图只作后续设计参考，还是会直接进入最终世界书？'],
        placeholder: '例如：被永久风暴包围的群岛文明，航路由三家公会控制，魔法只能改变记忆；本蓝图作为后续设计图，正式成品再按局部细化。',
    },
    {
        title: '让主要角色真正站到台前',
        description: '这一结构优先服务变量更新、分阶段人设和 AutoTask 动态改写，而不是追求一次写出最精细的人物小传。普通角色也可改用 Step 7–8 设计。',
        prompts: ['哪些初始事实与核心特质永远不应改变，应放入“原点”？', '哪些可见人设会随阶段变化或由 AutoTask 改写，应放入“画像”？', '哪些当前情况只是变量设计参考，应放入“状态”？'],
        placeholder: '例如：分别说明角色不变的原点、可分阶段更新的画像、当前状态；若更重视普通人物塑造，可注明准备转到生成规则和具体实例继续设计。',
    },
    {
        title: '建立可导航的树状目录',
        description: '这里首先设计“容器和索引”，不局限于人物关系。它可用于家族树、神系、人员名册、势力目录，也能提醒 AI 条件内容中还有哪些未注入设定。',
        prompts: ['需要用树状结构组织的是人物、家族、神系、势力还是其他实体？', '根节点、分组、上下级与叶节点分别是什么？', '哪些未常驻的条件内容需要在目录中保留基本事实，避免 AI 忘记其存在？'],
        placeholder: '例如：建立学校人员名册，按班级和职务分组，只记录姓名、身份与基本事实；详细人物内容由条件显示按需注入。',
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
        title: '规划需要哪些状态机',
        description: '先判断世界是否真的需要状态机，再规划地图、剧情阶段、关系等级、天气等状态机及其联动。AI 容易过度规划，不要把所有设定都强行状态化。',
        prompts: ['哪些对象在同一时刻只能处于一个状态，确实值得设计成状态机？', '需要哪些彼此独立或相互关联的状态机？', '不同状态机怎样联动；哪些内容应留到变量步骤而不是现在重复设计？'],
        placeholder: '例如：只规划地图与天气两个状态机；地图位置限制可达区域，天气影响行动，但暂不在这里设计详细变量。',
    },
    {
        title: '设计单个状态机的拓扑',
        description: '“情节图谱”是历史名称；它实际可设计任何状态机内部的线形、树形、环形或网状结构，以及节点之间能否跳转。',
        prompts: ['这次具体设计地图、剧情、关系阶段还是其他状态机？', '它有哪些节点，整体是线形、树形、环形还是网状？', '哪些节点之间允许或禁止迁移，进入和退出分别需要什么条件？'],
        placeholder: '例如：设计地图状态机，列出各区域编号及邻接关系；明确 A 可去 B/C、不可直接去 D，并注明解锁特殊路线的条件。',
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
        title: '设计特殊而稳定的语言模式',
        description: '这一步不推荐单纯堆积普通语料，因为容易诱导 AI 照抄。它更适合设计咒语、口癖、符号语法或群体固定表达等刻板语言规范。',
        prompts: ['是否真的需要一种反复出现、规则明确的特殊语言模式？', '它有哪些稳定词根、词缀、句式、符号或口癖规则？', '什么角色和场景可以使用；怎样避免所有人都说成同一种腔调？'],
        placeholder: '例如：为魔法咒语设计有限词根、组合语法和发音规律；只在施法场景使用，不堆砌可被直接照抄的普通描写语料。',
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
        description: '逐块生成 MVU Schema、供 AI 读取的当前变量内容，以及可能需要的条件地图。三者结构必须对齐，字段含义、初值和更新依据都要明确。',
        prompts: ['本轮设计哪个变量块，字段类型、初值、范围和联动是什么？', 'Schema 与 WORLD_current 的树结构是否完全一致？', '这些变量会激活哪些条件内容，是否需要 SOURCE_condition_mapping；当前值是否错误变成 null？'],
        placeholder: '例如：设计关系变量块，同时输出 Schema、WORLD_current_relationship 和条件地图；信任度为 0–100 整数，确保当前变量使用正确的 MVU 宏而非 null。',
    },
    {
        title: '让剧情变化准确流向变量',
        description: '汇总变量并建立统一更新指南与条件显示规划。变量规模变大时，还要判断是否继续由主 AI 更新，或拆给 AutoTask。',
        prompts: ['每类事件应该检查哪些变量簇，多个变化的顺序和最小更新原则是什么？', '变量与条件显示内容之间如何对应，后续需要转换哪些 XML？', '变量规模是否已超过主 AI 稳定维护范围，需要拆成一个或多个 AutoTask？'],
        placeholder: '例如：先汇总所有变量和条件映射，再写统一路由；约 20–40 个复杂变量时考虑异步更新，更多时按变量块拆分多个任务。',
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
        description: '当 XML 和条目很多时，为世界编制只负责导航的根目录。生成前先清理同名或重复 XML，最终把目录放在世界书前部。',
        prompts: ['当前内容是否已经复杂到需要根目录；有哪些同名或重复 XML 必须先处理？', '世界书可以分成哪些内容域，每个域包含哪些下级标签？', '怎样只保留基本索引而不复制正文，并确保根目录排在最前？'],
        placeholder: '例如：先确认没有重复标签，再建立角色、地点、事件、规则、变量五个入口；目录只列用途和下级 XML，不复述具体内容。',
    },
    {
        title: '设计玩家一眼能读懂的状态栏',
        description: '设计状态栏形态、移动端布局和数据来源。数据可以直接读取已有变量，也可以要求 AI 每轮临时输出；后一种必须在 Step 24 配置状态栏数据区。',
        prompts: ['状态栏采用纯 UI 还是拟物形式，手机上怎样保持可读？', '哪些数据直接来自已有变量，不能在这里凭空改变？', '是否需要 AI 临时输出评论等动态内容；若需要，Step 24 应怎样提供 STATUSBAR_DATA？'],
        placeholder: '例如：手绘地图式状态栏，读取当前位置、时间和存活变量；额外评论由 AI 每轮输出，并在下一步启用状态栏数据区。',
    },
    {
        title: '规定模型每轮回复的装配顺序',
        description: '按需求启用并排列构思、叙事、摘要、副叙事、选项、隐藏摘要、变量和状态栏数据区。叙事区必有，其余都要根据实际系统取舍。',
        prompts: ['除必有的叙事区外，还需要哪些分区，哪些明确关闭？', '变量由主 AI 还是 AutoTask 更新；摘要是否交给 AutoTask？', '状态栏是否依赖临时数据；各区使用什么标签、顺序、显示方式与缺省规则？'],
        placeholder: '例如：保留构思区和叙事区；摘要交给 AutoTask，因此关闭摘要区；变量由副 AI 更新，关闭变量区；状态栏读取已有变量，不启用临时数据区。',
    },
    {
        title: '挑出适合交给副 AI 的工作',
        description: '把独立、重复且输入输出明确的工作拆给副 AI。先区分摘要、变量更新和普通任务，再选择定期、周期或变量触发；即时叙事仍留给主 AI。',
        prompts: ['哪些工作适合摘要任务、专用变量任务或可改写世界书的普通任务？', '任务应定期、按周期位置还是按变量条件触发；是否在新聊天开始执行？', '每个任务读取什么、输出什么、失败如何重试，能否使用更快更便宜的模型？'],
        placeholder: '例如：小总结每 20 次 AI 回复触发；关系档案在周期第 5 位覆盖更新；变量任务每 5 次回复运行，各自注明输入、输出与模型。',
    },
    {
        title: '教副 AI 怎样维护世界知识',
        description: '为世界书相关任务编写可执行的提示词，明确资料来源、判断范围、输出格式和禁止事项。',
        prompts: ['副 AI 需要读取哪些条目或上下文？', '它要新增、更新、合并还是仅做检查？', '怎样的输出才能被系统安全地写回世界书？'],
        placeholder: '例如：读取本轮新事实与现有角色条目；只更新已被剧情证实的信息；按指定标签输出变更块。',
    },
    {
        title: '教副 AI 安全地更新变量',
        description: '为一个或若干变量块编写严格的 MVU 更新任务。专用变量任务按固定间隔运行且不参与普通周期；若需要周期位置，则改用普通任务更新变量。',
        prompts: ['每个任务负责哪些变量块，是否需要进一步拆分？', '应该按独立间隔触发，还是作为普通任务参与周期计算？', '如何只依据已发生剧情校验字段类型，并输出最小合法 MVU 变更？'],
        placeholder: '例如：角色状态每 5 次回复由专用变量任务更新；剧情阶段需要与其他任务按周期联动，因此改用普通任务，并严格输出 MVU 指令。',
    },
    {
        title: '把设计成果装进正确的条目',
        description: '同时设计最终世界书与 AutoTask 配置：拆分条目、安排主 AI 可见内容，并精确限制每个副任务能读取和写回的范围。',
        prompts: ['最终有哪些世界书条目，每个条目包含哪些 XML、关键词、位置和激活方式？', '主 AI 与每个副任务分别可以读取哪些参考条目和其他任务输出？', '各任务使用哪个提示词、输出条目、捕获 XML、覆盖或追加方式、同名条目禁用策略与 API？'],
        placeholder: '例如：核心规则常驻；角色画像按名字触发；关系更新任务只读角色原点与近期摘要，捕获指定 XML 后覆盖聊天世界书同名条目。',
    },
    {
        title: '用开场把整个世界启动起来',
        description: '生成一份可单独使用的正式开局，而不是新的通用设定。没有变量时只写开场；使用变量时必须同时给出与开场事实完全一致的完整初始树。',
        prompts: ['这份开局发生在何时何地，玩家第一句话前正在面对什么？', '哪个人物、动作或事件能立刻建立 Step 1 的核心体验？', '是否使用变量；若使用，完整初始值是否与人物、地点和事件事实一致？'],
        placeholder: '例如：生成一个独立开局，写明地点、出场角色、即时矛盾与玩家可知信息；若项目启用了变量，再附上完全匹配场景的初始树。',
    },
];

const REORG_PROMPT_ID = 'bdc8f3a0-37a3-415a-b01d-b91359b79104';
const STEP_PROMPT_IDS = new Set(STEPS.map(step => step.promptId));
const ALL_PRESET_STEP_PROMPT_IDS = new Set([...STEP_PROMPT_IDS, REORG_PROMPT_ID]);
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

// 固定 A.U.T.O v2.0 各步骤的正式交付物。CONTEXT_* 属于思考、评分或追问，不进入产物栏。
const STEP_ARTIFACT_RULES = Object.freeze({
    1: { tags: ['WORLD_interaction_paradigm', 'WORLD_aesthetic_program'] },
    2: { prefixes: ['WORLD_implementation_mechanisms'] },
    3: { prefixes: ['WORLD_arc_framework_'] },
    4: { tags: ['WORLD_blueprint'] },
    // 预设要求 Step 5 交付原点、画像、状态。兼容少数模型把“状态”误写成 SOURCE，
    // 但不会把其他 SOURCE_main_characters_* 中间分析误算为正式产物。
    5: { patterns: [/^WORLD_main_characters_.+_(?:原点|画像|状态)$/, /^SOURCE_main_characters_.+_状态$/] },
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
    // 以预设正则中的“复制并粘贴”说明为准：Step16 只交付待变量化与待条件化清单。
    16: { tags: ['SOURCE_待变量化', 'SOURCE_待条件化'] },
    17: { tags: ['SOURCE_variable_system_planning'] },
    18: { prefixes: ['WORLD_current_', 'SOURCE_condition_mapping_'], fences: ['schema'] },
    19: { tags: ['WORLD_variable_update_guide', 'SOURCE_step19_plan'] },
    20: { prefixes: ['WORLD_'] },
    21: { prefixes: ['WORLD_'] },
    22: { tags: ['WORLD_root_index'] },
    23: { tags: ['SOURCE_statusbar_data_guide'], statusbarFences: true },
    24: { tags: ['SYS_output_format'] },
    25: { tags: ['SOURCE_task_list'] },
    26: { prefixes: ['SYS_task_'] },
    27: { prefixes: ['SYS_task_'] },
    28: { tags: ['SOURCE_entry_plan'], fences: ['autotask_config'] },
    29: { fences: ['opening'] },
    30: { fences: ['reorg_plan'] },
});

// 产物分类独立于左侧四阶段：更贴合创作者查找设定的方式。
const ARTIFACT_CATEGORY_STEPS = Object.freeze({
    story: [1, 2, 3],
    characters: [5, 6],
    world: [4, 7, 8, 9],
    narrative: [10, 11, 12, 13, 14, 15],
    variables: [16, 17, 18, 19, 20, 21, 22],
    production: [23, 24, 25, 26, 27, 28, 29],
});

const ARTIFACT_EXACT_DISPLAY_NAMES = Object.freeze({
    WORLD_interaction_paradigm: '交互范式',
    WORLD_aesthetic_program: '美学纲领',
    WORLD_blueprint: '世界蓝图',
    SOURCE_spatial_planning: '空间规划',
    WORLD_narrative_core: '叙事指南核心',
    SOURCE_待变量化: '数据盘点 · 待变量化',
    SOURCE_待条件化: '数据盘点 · 待条件化',
    SOURCE_variable_system_planning: '变量体系规划',
    WORLD_variable_update_guide: '变量更新指南',
    SOURCE_step19_plan: '条件显示规划',
    WORLD_root_index: '世界根目录',
    SOURCE_statusbar_data_guide: '状态栏数据指南',
    STATUSBAR_HTML: '状态栏界面',
    STATUSBAR_REGEX: '状态栏数据正则',
    SYS_output_format: '输出格式',
    SOURCE_task_list: '副 AI 任务清单',
    SOURCE_entry_plan: '世界书条目规划表',
    autotask_config: 'AutoTask 配置',
    reorg_plan: '世界书重组方案',
    opening: '正式开场白',
});

const ARTIFACT_PREFIX_DISPLAY_NAMES = Object.freeze([
    ['WORLD_implementation_mechanisms', '实现机制'],
    ['WORLD_arc_framework_', '弧光识别'],
    ['WORLD_relationship_map', '角色关系图谱'],
    ['WORLD_generative_rules_', '世界生成规则'],
    ['WORLD_specific_instances_', '世界具体实例'],
    ['WORLD_lore_', '世界知识'],
    ['SOURCE_plot_graph_', '情节图谱'],
    ['WORLD_dimension_', '叙事维度内容'],
    ['WORLD_language_materials_', '语料库'],
    ['WORLD_scene_strategies_', '场景策略集'],
    ['WORLD_current_', '当前变量'],
    ['SOURCE_condition_mapping_', '条件映射'],
]);

let projectLibrary = loadProjectLibrary();
let project = getActiveProject(projectLibrary);
let connectionProfiles = loadConnectionProfiles();
let connectionSettings = loadConnectionSettings();
// 密钥仅保存在独立的浏览器连接设置中，不进入项目存档、导出文件或提示词。
let customApiKey = connectionSettings.apiKey || '';
let availableCustomModels = [];
let shell = null;
let studioOpenPromise = null;
let studioScrollLockState = null;
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
let deliveryArtifacts = [];
let confirmDialogResolver = null;
let updateDialogResolver = null;
let resourceEditorPrompt = null;
let resourceDockDragged = false;
let automaticUpdateChecked = false;
let backgroundUpdatePromise = null;
let pendingAutomaticUpdate = null;
let artifactFilterScope = 'all';
let artifactFilterQuery = '';
const artifactSaveTimers = new Map();
let environment = {
    checked: false,
    presetName: '',
};
let studioResources = { loaded: false, preset: null, regexes: [] };

function openResourceDatabase() {
    return new Promise((resolve, reject) => {
        const request = (hostWindow.indexedDB || indexedDB).open(RESOURCE_DATABASE_NAME, RESOURCE_DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(RESOURCE_STORE_NAME)) database.createObjectStore(RESOURCE_STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('资源数据库打开失败'));
    });
}

async function readResourceRecord(key) {
    const database = await openResourceDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = database.transaction(RESOURCE_STORE_NAME, 'readonly').objectStore(RESOURCE_STORE_NAME).get(key);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    } finally {
        database.close();
    }
}

async function writeResourceRecord(key, value) {
    const database = await openResourceDatabase();
    try {
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(RESOURCE_STORE_NAME, 'readwrite');
            transaction.objectStore(RESOURCE_STORE_NAME).put(value, key);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
}

async function loadStudioResources() {
    const [storedPreset, regexes] = await Promise.all([
        readResourceRecord('preset'),
        readResourceRecord('regexes'),
    ]);
    let preset = storedPreset;
    if (preset && !preset.importFormatVersion && Array.isArray(preset.prompts)) {
        // v0.6.8-v0.6.10 曾把 prompts 资源池全部保存。旧记录中的有效
        // prompt_order 条目拥有从 0 开始的连续顺序，可据此无损清除尾部夹带项。
        const orders = new Set(preset.prompts.map(prompt => Number(prompt.order)).filter(Number.isInteger));
        let activePromptCount = 0;
        while (orders.has(activePromptCount)) activePromptCount += 1;
        if (activePromptCount >= ALL_PRESET_STEP_PROMPT_IDS.size && activePromptCount < preset.prompts.length) {
            preset = {
                ...preset,
                importFormatVersion: 2,
                prompts: preset.prompts.filter(prompt => Number(prompt.order) < activePromptCount),
            };
            await writeResourceRecord('preset', preset);
        }
    }
    studioResources = {
        loaded: true,
        preset: preset && Array.isArray(preset.prompts) ? preset : null,
        regexes: Array.isArray(regexes) ? regexes : [],
    };
    // 旧数据首次升级时，以已导入预设的参数填充创作台独立参数。
    ensureConnectionModelParameters(studioResources.preset);
}

function normalizeImportedPreset(raw, fileName = '') {
    if (!raw || !Array.isArray(raw.prompts)) throw new Error('文件中没有找到 SillyTavern 预设 prompts。');
    const orders = Array.isArray(raw.prompt_order) ? raw.prompt_order.map(item => item?.order).filter(Array.isArray) : [];
    const activeOrder = orders.sort((a, b) => b.length - a.length)[0] || [];
    if (!activeOrder.length) throw new Error('预设中没有找到当前使用的 prompt_order。');
    const orderState = new Map(activeOrder.map((item, index) => [item.identifier, { enabled: item.enabled !== false, index }]));
    // prompts 是整个编辑器资源池，可能夹带其他预设遗留的未使用条目；
    // 只有 prompt_order 实际引用的条目才属于当前导入的 A.U.T.O 预设。
    const prompts = raw.prompts.filter(prompt => orderState.has(String(prompt.identifier || prompt.id || ''))).map((prompt, sourceIndex) => {
        const id = String(prompt.identifier || prompt.id || '');
        const state = orderState.get(id);
        return {
            id,
            name: String(prompt.name || id || `条目 ${sourceIndex + 1}`),
            role: String(prompt.role || 'system'),
            content: String(prompt.content || ''),
            enabled: state.enabled,
            order: state.index,
        };
    }).sort((a, b) => a.order - b.order);
    const promptIds = new Set(prompts.map(prompt => prompt.id));
    const missing = [...ALL_PRESET_STEP_PROMPT_IDS].filter(id => !promptIds.has(id));
    if (missing.length) throw new Error(`该文件不是完整的 A.U.T.O 预设：缺少 ${missing.length} 个步骤条目。`);
    return {
        name: String(raw.name || fileName.replace(/\.json$/i, '') || 'A.U.T.O 预设'),
        importedAt: new Date().toISOString(),
        importFormatVersion: 2,
        prompts,
        settings: {
            max_completion_tokens: Number(raw.openai_max_tokens) || undefined,
            temperature: Number(raw.temperature),
            frequency_penalty: Number(raw.frequency_penalty),
            presence_penalty: Number(raw.presence_penalty),
            top_p: Number(raw.top_p),
            top_k: Number(raw.top_k),
        },
    };
}

function normalizeImportedRegexes(raw) {
    const source = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.extensions?.regex_scripts)
            ? raw.extensions.regex_scripts
            : Array.isArray(raw?.regex_scripts)
                ? raw.regex_scripts
                : (raw?.findRegex !== undefined || raw?.find_regex !== undefined)
                    ? [raw]
                    : [];
    if (!Array.isArray(source) || !source.length) throw new Error('文件中没有找到可导入的正则条目。');
    return source.map((script, index) => {
        const normalized = normalizeResponseRegex(script);
        return {
            ...normalized,
            id: normalized.id || `acs-imported-regex-${Date.now()}-${index}`,
            scriptName: normalized.scriptName || `正则 ${index + 1}`,
            disabled: Boolean(normalized.disabled),
        };
    });
}

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
        autoReorg: { response: '', plan: null, updatedAt: null },
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
        autoReorg: { ...clean.autoReorg, ...(saved.autoReorg || {}) },
    };
    // v0.6.x 的 Step30 是开场白；新版隐藏重组步骤后迁移为 Step29。
    if (saved.steps?.[30]) normalized.steps[29] = saved.steps[30];
    delete normalized.steps[30];
    normalized.currentStep = Math.min(Number(normalized.currentStep) || 1, STEPS.length);
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

function normalizeModelParameters(raw = {}) {
    const normalized = {};
    for (const [key] of MODEL_PARAMETER_FIELDS) {
        const value = Number(raw?.[key]);
        if (Number.isFinite(value)) normalized[key] = value;
    }
    return normalized;
}

function presetDefaultModelParameters(preset = studioResources?.preset) {
    return normalizeModelParameters(preset?.settings || {});
}

function ensureConnectionModelParameters(preset = studioResources?.preset, force = false) {
    const current = normalizeModelParameters(connectionSettings.modelParameters || {});
    if (!force && Object.keys(current).length) return current;
    connectionSettings.modelParameters = presetDefaultModelParameters(preset);
    if (force) connectionSettings.modelParametersCustomized = false;
    saveConnectionSettings();
    return connectionSettings.modelParameters;
}

function loadConnectionSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONNECTION_STORAGE_KEY));
        return {
            ...DEFAULT_CONNECTION_SETTINGS,
            ...(saved && typeof saved === 'object' ? saved : {}),
            mode: saved?.mode === 'custom' ? 'custom' : 'current',
            outputMode: saved?.outputMode === 'stream' ? 'stream' : 'complete',
            apiKey: typeof saved?.apiKey === 'string' ? saved.apiKey : '',
            profileId: typeof saved?.profileId === 'string' ? saved.profileId : '',
            modelParameters: normalizeModelParameters(saved?.modelParameters || {}),
            modelParametersCustomized: saved?.modelParametersCustomized === true,
        };
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 无法读取模型连接设置，将使用当前 SillyTavern 连接。', error);
        return { ...DEFAULT_CONNECTION_SETTINGS };
    }
}

function loadConnectionProfiles() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONNECTION_PROFILES_STORAGE_KEY));
        if (!Array.isArray(saved)) return [];
        return saved
            .filter(item => item && typeof item === 'object' && typeof item.id === 'string')
            .map(item => ({
                id: item.id,
                name: String(item.name || '未命名连接').slice(0, 60),
                source: String(item.source || 'openai'),
                apiUrl: String(item.apiUrl || ''),
                model: String(item.model || ''),
                outputMode: item.outputMode === 'stream' ? 'stream' : 'complete',
                apiKey: String(item.apiKey || ''),
                modelParameters: normalizeModelParameters(item.modelParameters || {}),
                modelParametersCustomized: item.modelParametersCustomized === true,
            }));
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 无法读取模型连接预设。', error);
        return [];
    }
}

function saveConnectionProfiles() {
    localStorage.setItem(CONNECTION_PROFILES_STORAGE_KEY, JSON.stringify(connectionProfiles));
}

function saveConnectionSettings() {
    // 连接设置与项目数据分开保存，密钥不会进入项目导出文件。
    localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify({
        mode: connectionSettings.mode,
        source: connectionSettings.source,
        apiUrl: connectionSettings.apiUrl,
        model: connectionSettings.model,
        outputMode: connectionSettings.outputMode,
        apiKey: customApiKey,
        profileId: connectionSettings.profileId || '',
        modelParameters: normalizeModelParameters(connectionSettings.modelParameters || {}),
        modelParametersCustomized: connectionSettings.modelParametersCustomized === true,
    }));
}

function notify(type, message, title = 'A.U.T.O 角色卡创作台') {
    if (globalThis.toastr?.[type]) {
        globalThis.toastr[type](message, title);
        return;
    }
    console[type === 'error' ? 'error' : 'info'](`[${title}] ${message}`);
}

async function waitForTavernHelper(timeout = 12000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
        if (globalThis.TavernHelper?.generateRaw) {
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

    try {
        await loadStudioResources();
        environment.presetName = studioResources.preset?.name || '';
        renderEnvironmentSelectors();
        renderResourceDrawer();
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 独立资源读取失败', error);
        notify('error', '创作台独立资源读取失败，请检查浏览器是否允许本地数据库。');
    }

    helper = await waitForTavernHelper();
    if (!helper) {
        environment.checked = true;
        status.classList.add('is-error');
        status.querySelector('span:last-child').textContent = '未检测到酒馆助手';
        notify('error', '请先启用“酒馆助手”扩展，然后刷新 SillyTavern。');
        renderEnvironmentSelectors();
        renderResourceDrawer();
        renderCurrentStep();
        return;
    }

    try {
        environment.checked = true;
        renderEnvironmentSelectors();
        renderResourceDrawer();
        renderCurrentStep();

        if (!environment.presetName) {
            status.classList.add('is-error');
            status.querySelector('span:last-child').textContent = '请导入 A.U.T.O 预设';
            return;
        }

        status.classList.add('is-ready');
        status.querySelector('span:last-child').textContent = `独立预设与正则已就绪`;
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
    const presetReady = Boolean(environment.presetName);
    presetLock.classList.toggle('is-missing', !presetReady);
    presetName.textContent = presetReady ? environment.presetName : '尚未导入 A.U.T.O 预设';
    presetLock.querySelector('.acs-fixed-resource-badge').textContent = presetReady ? '已导入' : '需要导入';
    presetLock.querySelector('.acs-fixed-resource-copy small').textContent = presetReady
        ? `创作台独立保存；已识别 ${STEPS.length} 个创作步骤。`
        : '请在本设置页导入 SillyTavern 格式的 A.U.T.O 预设 JSON。';
    const regexSummary = shell.querySelector('#acs-regex-summary');
    if (regexSummary) {
        const enabled = studioResources.regexes.filter(script => !script.disabled).length;
        regexSummary.textContent = studioResources.regexes.length ? `${enabled} / ${studioResources.regexes.length} 已启用` : '尚未导入';
    }
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
    for (const select of shell.querySelectorAll('#acs-custom-source, #acs-connection-profile, #acs-worldbook-select, #acs-person')) {
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

function renderCustomModelOptions(query = '') {
    const panel = shell?.querySelector('#acs-model-options');
    if (!panel) return;
    const selected = shell.querySelector('#acs-custom-model').value.trim();
    const needle = String(query || '').trim().toLocaleLowerCase();
    const models = needle
        ? availableCustomModels.filter(model => model.toLocaleLowerCase().includes(needle))
        : availableCustomModels;
    panel.replaceChildren();

    if (!models.length) {
        const empty = document.createElement('p');
        empty.className = 'acs-model-options-empty';
        empty.textContent = availableCustomModels.length
            ? '没有匹配的模型，可以继续手动输入。'
            : '还没有模型列表，请先点击“获取模型”。';
        panel.append(empty);
        return;
    }

    for (const model of models) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `acs-model-option${model === selected ? ' is-selected' : ''}`;
        option.dataset.modelName = model;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(model === selected));
        const name = document.createElement('span');
        name.textContent = model;
        name.title = model;
        const check = document.createElement('i');
        check.className = model === selected ? 'fa-solid fa-check' : '';
        check.setAttribute('aria-hidden', 'true');
        option.append(name, check);
        panel.append(option);
    }
}

function toggleCustomModelOptions(force, query = '') {
    const combo = shell?.querySelector('.acs-model-combobox');
    if (!combo) return;
    const opened = typeof force === 'boolean' ? force : !combo.classList.contains('is-open');
    combo.classList.toggle('is-open', opened);
    combo.querySelector('#acs-model-list-toggle').setAttribute('aria-expanded', String(opened));
    combo.querySelector('#acs-custom-model').setAttribute('aria-expanded', String(opened));
    const panel = combo.querySelector('#acs-model-options');
    panel.hidden = !opened;
    if (!opened) {
        combo.classList.remove('opens-up');
        return;
    }

    renderCustomModelOptions(query);
    const bounds = combo.getBoundingClientRect();
    const estimatedHeight = Math.min(panel.scrollHeight || 220, 260);
    combo.classList.toggle('opens-up', hostWindow.innerHeight - bounds.bottom < estimatedHeight + 18 && bounds.top > estimatedHeight);
}

function installCustomModelPicker() {
    const input = shell.querySelector('#acs-custom-model');
    if (!input || input.closest('.acs-model-combobox')) return;
    input.removeAttribute('list');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'acs-model-options');

    const combo = document.createElement('div');
    combo.className = 'acs-model-combobox';
    input.before(combo);
    combo.append(input);

    const toggle = document.createElement('button');
    toggle.id = 'acs-model-list-toggle';
    toggle.className = 'acs-model-list-toggle';
    toggle.type = 'button';
    toggle.title = '展开模型列表';
    toggle.setAttribute('aria-label', '展开模型列表');
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

    const panel = document.createElement('div');
    panel.id = 'acs-model-options';
    panel.className = 'acs-model-options';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;
    combo.append(toggle, panel);
    renderCustomModelOptions();

    toggle.addEventListener('click', event => {
        event.preventDefault();
        toggleCustomModelOptions();
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            toggleCustomModelOptions(true, input.value);
            panel.querySelector('.acs-model-option')?.focus();
        } else if (event.key === 'Escape') {
            toggleCustomModelOptions(false);
        }
    });
    panel.addEventListener('click', event => {
        const option = event.target.closest('[data-model-name]');
        if (!option) return;
        input.value = option.dataset.modelName;
        input.dispatchEvent(new hostWindow.Event('input', { bubbles: true }));
        toggleCustomModelOptions(false);
        input.focus();
    });
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
        section.classList.toggle('is-current-phase', phaseSteps.some(step => step.number === project.currentStep));

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'acs-phase-toggle';
        toggle.dataset.phaseToggle = phase.id;
        toggle.dataset.mobileLabel = phase.label.split('·')[0].trim();
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
            const isCoreStep = CORE_STEP_NUMBERS.has(step.number);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'acs-step-button';
            button.dataset.step = String(step.number);
            button.title = `Step ${step.number} · ${step.name}${isCoreStep ? ' · 核心步骤（并非强制）' : ''}`;
            button.setAttribute('aria-label', button.title);
            button.classList.toggle('is-core-step', isCoreStep);
            if (step.number === project.currentStep) button.classList.add('is-active');
            if (state.status === 'accepted') button.classList.add('is-complete');
            if (state.status === 'draft') button.classList.add('is-draft');

            const node = document.createElement('span');
            node.className = 'acs-step-node';
            node.dataset.mobileNumber = String(step.number).padStart(2, '0');
            if (state.status === 'accepted') node.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
            const name = document.createElement('span');
            name.className = 'acs-step-name';
            const nameLabel = document.createElement('span');
            nameLabel.className = 'acs-step-name-label';
            nameLabel.textContent = step.name;
            name.append(nameLabel);
            if (isCoreStep) {
                const badge = document.createElement('span');
                badge.className = 'acs-core-step-badge';
                badge.textContent = '核心';
                badge.setAttribute('aria-hidden', 'true');
                name.append(badge);
            }
            const number = document.createElement('span');
            number.className = 'acs-step-number';
            number.textContent = String(step.number).padStart(2, '0');
            button.append(node, name, number);
            steps.append(button);
        }
        section.append(toggle, steps);
        rail.append(section);
    }

    const mobileCurrent = shell.querySelector('.acs-mobile-rail-current');
    if (mobileCurrent) mobileCurrent.textContent = String(project.currentStep).padStart(2, '0');
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
    return studioResources.preset;
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

function compileResponseRegex(source) {
    const input = String(source || '');
    // 优先兼容酒馆助手提供的解析器；不可用或格式较宽松时，按
    // SillyTavern 正则扩展的 regexFromString 规则在创作台内解析。
    const parsed = globalThis.builtin?.parseRegexFromString?.(input);
    if (parsed) {
        parsed.lastIndex = 0;
        return parsed;
    }
    try {
        const match = input.match(/(\/?)([\s\S]+)\1([a-z]*)/i);
        if (!match) return null;
        const flags = match[3];
        const regex = flags && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(flags)
            ? new RegExp(input)
            : new RegExp(match[2], flags);
        regex.lastIndex = 0;
        return regex;
    } catch {
        return null;
    }
}

function runSingleResponseRegex(script, text) {
    let result = String(text || '');
    for (const trimString of script.trimStrings || []) {
        result = result.replaceAll(trimString, '');
    }
    const regex = compileResponseRegex(script.findRegex);
    if (!regex) throw new Error(`无法解析正则：${script.findRegex}`);
    return result.replace(regex, script.replaceString ?? '');
}

function getResponseRegexes() {
    return studioResources.regexes.map(normalizeResponseRegex);
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
    // 仅执行创作台自行导入的正则，完全忽略 SillyTavern 的全局、预设和角色正则。
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

function buildHtmlPreviewDocument(source) {
    const previewHead = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'; style-src 'unsafe-inline' https: http:; img-src data: blob: https: http:; font-src data: https: http:">
<style>
    :root { color-scheme: light dark; }
    html, body { min-height: 100%; margin: 0; }
    body { overflow-wrap: anywhere; }
</style>`;
    const html = String(source || '').trim();

    // 完整 HTML 文档保留原结构，只向 head 注入预览所需的安全限制与基础样式。
    if (/<html\b/i.test(html)) {
        if (/<head\b[^>]*>/i.test(html)) {
            return html.replace(/<head\b([^>]*)>/i, `<head$1>${previewHead}`);
        }
        return html.replace(/<html\b([^>]*)>/i, `<html$1><head>${previewHead}</head>`);
    }

    // A.U.T.O 有时仅输出 body 或组件片段，此时补成可供 iframe 渲染的完整文档。
    const body = /<body\b/i.test(html) ? html : `<body>${html}</body>`;
    return `<!doctype html><html><head>${previewHead}</head>${body}</html>`;
}

function toggleHtmlCodePreview(details, button, pre, preview) {
    const isPreview = details.dataset.codeView !== 'preview';
    details.dataset.codeView = isPreview ? 'preview' : 'source';
    details.open = true;
    pre.hidden = isPreview;
    preview.hidden = !isPreview;
    button.classList.toggle('is-active', isPreview);
    button.setAttribute('aria-pressed', String(isPreview));
    button.innerHTML = isPreview
        ? '<i class="fa-solid fa-code" aria-hidden="true"></i><span>源码</span>'
        : '<i class="fa-regular fa-eye" aria-hidden="true"></i><span>预览</span>';

    if (isPreview && !preview.dataset.loaded) {
        const iframe = document.createElement('iframe');
        iframe.className = 'acs-html-preview-frame';
        iframe.setAttribute('sandbox', '');
        iframe.setAttribute('title', 'HTML 效果预览');
        iframe.setAttribute('loading', 'lazy');
        iframe.srcdoc = buildHtmlPreviewDocument(pre.textContent);
        preview.replaceChildren(iframe);
        preview.dataset.loaded = 'true';
    }
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
        summary.setAttribute('aria-expanded', String(details.open));
        summary.setAttribute('aria-label', `${language} 代码块，点击折叠或展开`);
        const type = document.createElement('span');
        type.textContent = language;
        const actions = document.createElement('span');
        actions.className = 'acs-code-summary-actions';
        if (language === 'HTML') {
            const previewButton = document.createElement('button');
            previewButton.className = 'acs-code-preview-toggle';
            previewButton.type = 'button';
            previewButton.setAttribute('aria-pressed', 'false');
            previewButton.title = '在隔离画布中预览 HTML';
            previewButton.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i><span>预览</span>';
            actions.append(previewButton);
        }
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down';
        icon.setAttribute('aria-hidden', 'true');
        actions.append(icon);
        summary.append(type, actions);

        pre.classList.add('acs-code-content');
        const preview = document.createElement('div');
        preview.className = 'acs-html-preview';
        preview.hidden = true;
        pre.before(details);
        details.append(summary, pre, preview);

        const previewButton = actions.querySelector('.acs-code-preview-toggle');
        previewButton?.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleHtmlCodePreview(details, previewButton, pre, preview);
        });
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
    shell.querySelector('#acs-step-kicker').textContent = `PHASE ${String(step.number).padStart(2, '0')} / ${STEPS.length}`;
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
    const clearStepButton = shell.querySelector('#acs-clear-step');
    clearStepButton.disabled = !hasTurns || isGenerating;
    clearStepButton.title = hasTurns ? '清空当前步骤的对话记录' : '当前步骤没有对话记录';
    shell.querySelector('#acs-conversation-nav').hidden = !hasTurns;
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

async function clearCurrentStepConversation() {
    if (isGenerating) {
        notify('warning', '请先停止当前生成。');
        return;
    }
    const step = STEPS[project.currentStep - 1];
    const state = project.steps[step.number];
    if (!state?.turns?.length) return;
    if (!await showStudioConfirm({
        title: '清空本步骤对话？',
        message: '对话将清空，已生成的产物仍会保留。',
        confirmLabel: '清空对话',
        danger: true,
    })) return;

    // 对话与产物分开管理：助手回复转入产物历史，保证右侧正式产物不会随对话一起丢失。
    const assistantTurns = state.turns.filter(turn => turn.role === 'assistant').map(turn => ({ ...turn }));
    state.artifactHistory = [...(state.artifactHistory || []), ...assistantTurns];
    state.turns = [];
    state.status = 'idle';
    state.updatedAt = new Date().toISOString();
    saveProject();
    renderAll();
    notify('success', `Step ${step.number} 的对话已清空，产物仍保留。`);
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

function artifactCategoryForStep(stepNumber) {
    return Object.entries(ARTIFACT_CATEGORY_STEPS)
        .find(([, steps]) => steps.includes(Number(stepNumber)))?.[0] || '';
}

function artifactSuffixLabel(value) {
    return String(value || '')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, ' · ')
        .trim();
}

function artifactDisplayName(tag, stepNumber) {
    const rawTag = String(tag || '');
    if (ARTIFACT_EXACT_DISPLAY_NAMES[rawTag]) return ARTIFACT_EXACT_DISPLAY_NAMES[rawTag];

    if (rawTag.startsWith('WORLD_main_characters_') || rawTag.startsWith('SOURCE_main_characters_')) {
        const identity = rawTag.replace(/^(?:WORLD|SOURCE)_main_characters_/, '');
        return `主要角色 · ${artifactSuffixLabel(identity) || '角色设定'}`;
    }

    if (rawTag.startsWith('schema_')) {
        return `变量结构定义 · ${artifactSuffixLabel(rawTag.slice('schema_'.length))}`;
    }

    for (const [prefix, label] of ARTIFACT_PREFIX_DISPLAY_NAMES) {
        if (!rawTag.startsWith(prefix)) continue;
        const suffix = artifactSuffixLabel(rawTag.slice(prefix.length));
        return suffix ? `${label} · ${suffix}` : label;
    }

    const step = STEPS[Number(stepNumber) - 1];
    if (rawTag.startsWith('SYS_task_')) {
        const suffix = artifactSuffixLabel(rawTag.slice('SYS_task_'.length));
        return suffix ? `${step?.name || '任务提示词'} · ${suffix}` : (step?.name || '任务提示词');
    }
    if (step && [20, 21].includes(Number(stepNumber)) && rawTag.startsWith('WORLD_')) {
        const suffix = artifactSuffixLabel(rawTag.slice('WORLD_'.length));
        return suffix ? `${step.name} · ${suffix}` : step.name;
    }
    return step?.name || rawTag || '未命名产物';
}

function artifactGroupMatchesFilter(group) {
    const artifact = group.versions.at(-1);
    const step = STEPS[artifact.step - 1];
    if (artifactFilterScope === 'current' && artifact.step !== project.currentStep) return false;
    if (!['all', 'current'].includes(artifactFilterScope)
        && artifactCategoryForStep(artifact.step) !== artifactFilterScope) return false;

    const query = artifactFilterQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    const haystack = `${artifactDisplayName(group.tag, artifact.step)} ${group.tag} ${step?.name || ''} step ${artifact.step} s${String(artifact.step).padStart(2, '0')}`
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
        name.textContent = artifactDisplayName(group.tag, artifact.step);
        name.title = `原始标签：${group.tag}`;
        const step = document.createElement('span');
        step.className = 'acs-artifact-step';
        step.textContent = `S${String(artifact.step).padStart(2, '0')}${artifact.accepted ? ' · 已确认' : ' · 草案'}`;
        const meta = document.createElement('span');
        meta.className = 'acs-artifact-meta';
        const tokenCount = document.createElement('span');
        tokenCount.className = 'acs-artifact-token-count';
        tokenCount.dataset.artifactTokenCount = '';
        tokenCount.textContent = '统计中…';
        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-chevron-down acs-artifact-toggle-icon';
        toggleIcon.setAttribute('aria-hidden', 'true');
        meta.append(step, tokenCount, toggleIcon);
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
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'acs-artifact-action acs-artifact-delete';
        remove.dataset.deleteArtifact = '';
        remove.title = '删除这个产物及其历史版本';
        remove.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>删除</span>';
        actions.append(history, restore, copy, remove);
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

function toggleArtifactDetails(summary) {
    const details = summary?.parentElement;
    if (!details?.classList.contains('acs-artifact')) return;
    details.open = !details.open;
    summary.setAttribute('aria-expanded', String(details.open));
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

function artifactRemovalRange(source, block) {
    if (!block.language) return { start: block.start, end: block.end };
    const opener = source.lastIndexOf('```', block.start);
    const closer = source.indexOf('```', block.end);
    const header = opener >= 0 ? source.slice(opener + 3, block.start) : '';
    const footer = closer >= 0 ? source.slice(block.end, closer) : '';
    if (opener >= 0 && closer >= block.end && /^[^\r\n`]*\r?\n\s*$/.test(header) && !footer.trim()) {
        let end = closer + 3;
        if (source.slice(end, end + 2) === '\r\n') end += 2;
        else if (source[end] === '\n') end += 1;
        return { start: opener, end };
    }
    return { start: block.start, end: block.end };
}

function removeArtifactIdentityFromText(source, stepNumber, identity) {
    const blocks = extractArtifactBlocks(source, stepNumber);
    const ranges = blocks
        .filter(block => resolveArtifactIdentity(stepNumber, block, blocks) === identity)
        .map(block => artifactRemovalRange(source, block))
        .sort((left, right) => right.start - left.start);
    let result = source;
    for (const range of ranges) result = `${result.slice(0, range.start)}${result.slice(range.end)}`;
    return result;
}

async function deleteArtifact(button) {
    const details = button.closest('.acs-artifact');
    const group = renderedArtifactGroups[Number(details?.dataset.artifactGroup)];
    const latest = group?.versions?.at(-1);
    if (!group || !latest) return;
    const displayName = artifactDisplayName(group.tag, latest.step);
    if (!await showStudioConfirm({
        title: '删除产物？',
        message: `“${displayName}”及其历史版本将被删除。`,
        confirmLabel: '删除产物',
        danger: true,
    })) return;

    flushPendingProjectEdits();
    const state = project.steps[latest.step];
    for (const collectionName of ['turns', 'artifactHistory']) {
        state[collectionName] = (state[collectionName] || []).map(turn => (
            turn.role === 'assistant'
                ? { ...turn, content: removeArtifactIdentityFromText(turn.content, latest.step, group.tag) }
                : turn
        ));
    }
    state.status = state.turns?.length ? 'draft' : 'idle';
    state.updatedAt = new Date().toISOString();
    // 产物集合变化后，旧的世界书重组方案不再有效。
    project.autoReorg = null;
    saveProject();
    renderAll();
    notify('success', `已删除产物“${displayName}”，可以重新生成。`);
}

async function copyText(text) {
    // 酒馆助手脚本位于 iframe 中，iframe 的 Clipboard API 可能存在但会被权限策略拒绝。
    // 优先使用主页面剪贴板；失败后再退回主页面的选区复制。
    const clipboard = hostWindow.navigator?.clipboard || navigator.clipboard;
    if (clipboard?.writeText) {
        try {
            await clipboard.writeText(text);
            return;
        } catch (error) {
            console.warn('[A.U.T.O Card Studio] Clipboard API 不可用，改用兼容复制。', error);
        }
    }
    const copyDocument = hostWindow.document || document;
    const fallback = copyDocument.createElement('textarea');
    fallback.value = text;
    fallback.style.position = 'fixed';
    fallback.style.left = '-9999px';
    fallback.style.top = '0';
    fallback.style.opacity = '0';
    copyDocument.body.append(fallback);
    fallback.focus({ preventScroll: true });
    fallback.select();
    fallback.setSelectionRange(0, fallback.value.length);
    const copied = copyDocument.execCommand('copy');
    fallback.remove();
    if (!copied) throw new Error('浏览器拒绝了兼容复制请求');
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
    const inspector = shell.querySelector('.acs-inspector');
    const button = shell.querySelector('#acs-expand-artifacts');
    // 仅手机端停用放大；桌面端保持既有的放大产物工作区。
    if (shell.classList.contains('acs-mobile-layout')) {
        artifactPanelExpanded = false;
        inspector?.classList.remove('is-expanded');
        return;
    }
    artifactPanelExpanded = typeof force === 'boolean' ? force : !artifactPanelExpanded;
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

function installConversationNavigation() {
    const composer = shell.querySelector('.acs-composer');
    if (!composer || shell.querySelector('#acs-conversation-nav')) return;
    const navigation = document.createElement('nav');
    navigation.id = 'acs-conversation-nav';
    navigation.className = 'acs-conversation-nav';
    navigation.setAttribute('aria-label', '最新消息定位');
    navigation.hidden = true;
    navigation.innerHTML = `
      <button id="acs-latest-turn-top" class="acs-conversation-nav-button" type="button" title="回到最新消息顶部">
        <i class="fa-solid fa-arrow-up" aria-hidden="true"></i><span>回顶</span>
      </button>
      <button id="acs-latest-turn-bottom" class="acs-conversation-nav-button" type="button" title="回到最新消息底部">
        <i class="fa-solid fa-arrow-down" aria-hidden="true"></i><span>回底</span>
      </button>`;
    composer.append(navigation);
}

function scrollToLatestTurn(edge) {
    const conversation = shell.querySelector('.acs-conversation');
    const latestTurn = shell.querySelector('#acs-turns .acs-turn:last-child');
    if (!conversation || !latestTurn) return;
    const conversationBounds = conversation.getBoundingClientRect();
    const turnBounds = latestTurn.getBoundingClientRect();
    const target = edge === 'top'
        ? conversation.scrollTop + turnBounds.top - conversationBounds.top - 10
        : conversation.scrollTop + turnBounds.bottom - conversationBounds.bottom + 10;
    const maximum = Math.max(0, conversation.scrollHeight - conversation.clientHeight);
    const prefersReducedMotion = hostWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    conversation.scrollTo({
        top: Math.max(0, Math.min(maximum, target)),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
}

function installStudioToolsUI() {
    if (!shell.querySelector('#acs-import-project-button')) {
        const importButton = document.createElement('button');
        importButton.id = 'acs-import-project-button';
        importButton.className = 'acs-icon-button';
        importButton.type = 'button';
        importButton.title = '导入项目';
        importButton.setAttribute('aria-label', '导入项目');
        importButton.innerHTML = '<i class="fa-solid fa-file-import" aria-hidden="true"></i><span class="acs-visually-hidden">导入项目</span>';
        shell.querySelector('#acs-save-project').after(importButton);

        const importInput = document.createElement('input');
        importInput.id = 'acs-import-project';
        importInput.type = 'file';
        importInput.accept = 'application/json,.json,.auto-card-studio.json';
        importInput.hidden = true;
        shell.append(importInput);
    }

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
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="story">故事核心</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="characters">主要角色</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="world">世界</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="narrative">叙事</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="variables">变量</button>
            <button class="acs-artifact-filter-button" type="button" data-artifact-scope="production">装配</button>
          </div>
          <label class="acs-artifact-search-wrap">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <span class="acs-visually-hidden">搜索产物名称或步骤</span>
            <input id="acs-artifact-search" class="acs-artifact-search" type="search" placeholder="搜索产物或步骤…" autocomplete="off">
          </label>`;
        artifactList.before(filters);
    }
}

function installDeliveryUI() {
    // 世界书不再依赖预制模板；旧项目字段继续保留，仅用于兼容历史存档。
    shell.querySelector('#acs-worldbook-select')?.closest('label')?.remove();
    const publishCopy = shell.querySelector('.acs-publish-copy p:last-child');
    if (publishCopy) publishCopy.textContent = '从项目产物中选择要交付的条目，直接创建世界书并绑定角色卡。';
    const publishNote = shell.querySelector('#acs-publish-note');
    if (publishNote) publishNote.textContent = '点击创建后可逐项勾选；默认选择所有已确认产物。';
    const updateButton = shell.querySelector('#acs-check-update');
    if (updateButton) updateButton.title = `检查更新（当前 ${studioVersionLabel()}）`;

    if (!shell.querySelector('#acs-confirm-overlay')) {
        const confirmOverlay = document.createElement('div');
        confirmOverlay.id = 'acs-confirm-overlay';
        confirmOverlay.className = 'acs-confirm-overlay';
        confirmOverlay.hidden = true;
        confirmOverlay.setAttribute('aria-hidden', 'true');
        confirmOverlay.innerHTML = `
          <section class="acs-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="acs-confirm-title" aria-describedby="acs-confirm-message">
            <div class="acs-confirm-body">
              <span class="acs-confirm-icon" aria-hidden="true"><i class="fa-solid fa-circle-question"></i></span>
              <div class="acs-confirm-copy">
                <h2 id="acs-confirm-title">请确认</h2>
                <p id="acs-confirm-message"></p>
              </div>
            </div>
            <footer class="acs-confirm-actions">
              <button class="acs-button" type="button" data-confirm-result="false">取消</button>
              <button class="acs-button acs-button-publish" type="button" data-confirm-result="true">确认</button>
            </footer>
          </section>`;
        shell.append(confirmOverlay);
    }

    if (shell.querySelector('#acs-delivery-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'acs-delivery-overlay';
    overlay.className = 'acs-delivery-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="acs-delivery-dialog" role="dialog" aria-modal="true" aria-labelledby="acs-delivery-title">
        <header class="acs-delivery-head">
          <div class="acs-delivery-title">
            <p>DELIVERY MANIFEST</p>
            <h2 id="acs-delivery-title">选择本次交付产物</h2>
            <small>清单依据 A.U.T.O 预设正则中的复制与粘贴说明生成；同一目标的多项产物会合并，并使用各自最新版。</small>
          </div>
          <button class="acs-delivery-close" type="button" data-delivery-close aria-label="关闭交付窗口">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="acs-delivery-toolbar">
          <div class="acs-delivery-presets" role="toolbar" aria-label="快速选择">
            <button class="acs-delivery-preset" type="button" data-delivery-select="accepted">只选已确认</button>
            <button class="acs-delivery-preset" type="button" data-delivery-select="all">选择全部</button>
            <button class="acs-delivery-preset" type="button" data-delivery-select="none">清空</button>
          </div>
          <span id="acs-delivery-reorg-status" class="acs-delivery-reorg-status"></span>
          <span id="acs-delivery-count" class="acs-delivery-count">0 / 0 项</span>
        </div>
        <div id="acs-delivery-list" class="acs-delivery-list"></div>
        <footer class="acs-delivery-footer">
          <p>🕹️、🧩条目默认启用；🗑️、🔇、🔢及配置条目默认关闭，避免中间规划与条件内容常驻上下文。</p>
          <div class="acs-delivery-actions">
            <button class="acs-button" type="button" data-delivery-close>取消</button>
            <button id="acs-confirm-delivery" class="acs-button acs-button-publish" type="button">
              <i class="fa-solid fa-feather-pointed" aria-hidden="true"></i>确认创建
            </button>
          </div>
        </footer>
      </section>`;
    shell.append(overlay);
}

function closeStudioConfirm(result = false) {
    const overlay = shell?.querySelector('#acs-confirm-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    const resolve = confirmDialogResolver;
    confirmDialogResolver = null;
    resolve?.(Boolean(result));
}

function showStudioConfirm({ title = '请确认', message = '', confirmLabel = '确认', cancelLabel = '取消', danger = false } = {}) {
    const overlay = shell?.querySelector('#acs-confirm-overlay');
    if (!overlay) return Promise.resolve(false);
    if (confirmDialogResolver) closeStudioConfirm(false);
    overlay.querySelector('#acs-confirm-title').textContent = title;
    overlay.querySelector('#acs-confirm-message').textContent = message;
    overlay.querySelector('[data-confirm-result="true"]').textContent = confirmLabel;
    overlay.querySelector('[data-confirm-result="false"]').textContent = cancelLabel;
    overlay.querySelector('.acs-confirm-dialog').classList.toggle('is-danger', danger);
    overlay.querySelector('.acs-confirm-icon i').className = danger
        ? 'fa-solid fa-triangle-exclamation'
        : 'fa-solid fa-circle-question';
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('[data-confirm-result="true"]')?.focus({ preventScroll: true });
    return new Promise(resolve => { confirmDialogResolver = resolve; });
}

function closeUpdateNotes(result = false) {
    const overlay = shell?.querySelector('#acs-update-notes-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    const resolve = updateDialogResolver;
    updateDialogResolver = null;
    resolve?.(Boolean(result));
}

function showUpdateNotes({ currentLabel, targetLabel, entries, completed = false }) {
    const overlay = shell?.querySelector('#acs-update-notes-overlay');
    if (!overlay) return Promise.resolve(false);
    if (updateDialogResolver) closeUpdateNotes(false);
    overlay.querySelector('#acs-update-notes-summary').textContent = `${currentLabel}  →  ${targetLabel}`;
    overlay.querySelector('#acs-update-notes-title').textContent = completed ? '更新完成' : '本次更新内容';
    const cancelButton = overlay.querySelector('.acs-update-notes-actions [data-update-result="false"]');
    const confirmButton = overlay.querySelector('.acs-update-notes-actions [data-update-result="true"]');
    const closeButton = overlay.querySelector('.acs-update-notes-close');
    cancelButton.hidden = completed;
    confirmButton.innerHTML = completed
        ? '<i class="fa-solid fa-check"></i>知道了'
        : '<i class="fa-solid fa-arrow-up-right-dots"></i>立即更新';
    closeButton.dataset.updateResult = completed ? 'true' : 'false';
    closeButton.setAttribute('aria-label', completed ? '关闭更新公告' : '暂不更新');
    const list = overlay.querySelector('#acs-update-notes-list');
    list.replaceChildren();
    const safeEntries = entries.length ? entries : [{ label: targetLabel, title: '版本更新', changes: ['包含功能改进与问题修复。'] }];
    for (const entry of safeEntries) {
        const card = document.createElement('article');
        card.className = 'acs-update-note';
        const title = document.createElement('strong');
        title.textContent = entry.title || '版本更新';
        const label = document.createElement('small');
        label.textContent = entry.label || targetLabel;
        const changes = document.createElement('ul');
        changes.replaceChildren(...(entry.changes?.length ? entry.changes : ['功能改进与问题修复。']).map(text => {
            const item = document.createElement('li');
            item.textContent = text;
            return item;
        }));
        card.append(title, label, changes);
        list.append(card);
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    list.scrollTop = 0;
    overlay.querySelector('[data-update-result="true"]')?.focus({ preventScroll: true });
    return new Promise(resolve => { updateDialogResolver = resolve; });
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
    shell.classList.toggle(
        'is-mobile-project-menu-open',
        opened && shell.classList.contains('acs-mobile-layout'),
    );
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
    environment.presetName = studioResources.preset?.name || '';
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

async function deleteProject(projectId) {
    if (isGenerating) {
        notify('warning', '请先停止当前生成，再删除项目。');
        return;
    }
    const target = projectLibrary.projects.find(item => item.id === projectId);
    if (!target) return;
    if (!await showStudioConfirm({
        title: '删除项目？',
        message: `“${target.name}”将被永久删除。`,
        confirmLabel: '删除',
        danger: true,
    })) return;

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
    const activeProfile = connectionProfiles.find(item => item.id === connectionSettings.profileId);
    const connectionName = connectionSettings.mode === 'current'
        ? '当前 ST 连接'
        : (activeProfile?.name || connectionSettings.model.trim() || '独立连接未完成');
    const outputName = connectionSettings.outputMode === 'stream' ? '流式' : '非流式';
    return `${connectionName} · ${outputName}`;
}

function generationDependencyMessage() {
    if (!environment.checked) return '';
    if (!helper) return '未检测到酒馆助手，暂时不能调用 AI。';
    if (!studioResources.preset) return '尚未向创作台导入 A.U.T.O 预设。';
    return '';
}

function connectionProfileSnapshot(name, id = '') {
    return {
        id: id || hostWindow.crypto?.randomUUID?.() || `connection-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: String(name || '未命名连接').trim().slice(0, 60),
        source: connectionSettings.source,
        apiUrl: connectionSettings.apiUrl,
        model: connectionSettings.model,
        outputMode: connectionSettings.outputMode,
        apiKey: customApiKey,
        modelParameters: normalizeModelParameters(connectionSettings.modelParameters || {}),
        modelParametersCustomized: connectionSettings.modelParametersCustomized === true,
    };
}

function applyConnectionProfile(profile) {
    if (!profile) return;
    connectionSettings.mode = 'custom';
    connectionSettings.profileId = profile.id;
    connectionSettings.source = profile.source;
    connectionSettings.apiUrl = profile.apiUrl;
    connectionSettings.model = profile.model;
    connectionSettings.outputMode = profile.outputMode;
    connectionSettings.modelParameters = Object.keys(profile.modelParameters || {}).length
        ? normalizeModelParameters(profile.modelParameters)
        : presetDefaultModelParameters();
    connectionSettings.modelParametersCustomized = profile.modelParametersCustomized === true;
    customApiKey = profile.apiKey;
    connectionSettings.apiKey = customApiKey;
    saveConnectionSettings();
    renderConnectionSettings();
    renderCurrentStep();
    notify('success', `已切换到连接预设“${profile.name}”。`);
}

function renderConnectionProfileControls() {
    const select = shell.querySelector('#acs-connection-profile');
    if (!select) return;
    const selectedId = connectionProfiles.some(item => item.id === connectionSettings.profileId)
        ? connectionSettings.profileId
        : '';
    select.replaceChildren(new Option('当前临时配置', '', false, !selectedId));
    for (const profile of connectionProfiles) {
        select.add(new Option(profile.name, profile.id, false, profile.id === selectedId));
    }
    select.value = selectedId;
    syncStyledSelect(select);
    const selected = connectionProfiles.find(item => item.id === selectedId);
    shell.querySelector('#acs-connection-profile-name').value = selected?.name || '';
    shell.querySelector('#acs-delete-connection-profile').disabled = !selected;
    shell.querySelector('#acs-save-connection-profile').title = selected ? '更新当前连接预设' : '保存为新连接预设';
    shell.querySelector('#acs-connection-profile-count').textContent = `${connectionProfiles.length} 个已保存`;
    renderModelParameterControls();
}

function renderModelParameterControls() {
    if (!shell?.querySelector('#acs-model-parameter-grid')) return;
    const parameters = ensureConnectionModelParameters();
    for (const [key] of MODEL_PARAMETER_FIELDS) {
        const input = shell.querySelector(`[data-model-parameter="${key}"]`);
        if (input) input.value = Number.isFinite(parameters[key]) ? String(parameters[key]) : '';
    }
}

function updateModelParameter(event) {
    const input = event.currentTarget;
    const key = input.dataset.modelParameter;
    const parameters = normalizeModelParameters(connectionSettings.modelParameters || {});
    const value = input.value.trim();
    if (value === '') delete parameters[key];
    else {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return;
        parameters[key] = numericValue;
    }
    connectionSettings.modelParameters = parameters;
    connectionSettings.modelParametersCustomized = true;
    saveConnectionSettings();
    renderConnectionProfileControls();
}

function resetModelParametersToPreset() {
    ensureConnectionModelParameters(studioResources.preset, true);
    saveConnectionSettings();
    renderConnectionProfileControls();
    notify('success', '模型参数已恢复为当前 A.U.T.O 预设的默认值。');
}

async function saveCurrentConnectionProfile() {
    const nameInput = shell.querySelector('#acs-connection-profile-name');
    const name = nameInput.value.trim();
    if (!name) {
        notify('warning', '请先填写连接预设名称。');
        nameInput.focus();
        return;
    }

    const activeIndex = connectionProfiles.findIndex(item => item.id === connectionSettings.profileId);
    const duplicateIndex = connectionProfiles.findIndex(item => item.name === name && item.id !== connectionSettings.profileId);
    if (duplicateIndex >= 0) {
        const confirmed = await showStudioConfirm({
            title: '覆盖同名连接预设？',
            message: `“${name}”已经存在。是否用当前连接配置替换它？`,
            confirmLabel: '覆盖预设',
        });
        if (!confirmed) return;
        const existingId = connectionProfiles[duplicateIndex].id;
        connectionProfiles[duplicateIndex] = connectionProfileSnapshot(name, existingId);
        if (activeIndex >= 0 && activeIndex !== duplicateIndex) connectionProfiles.splice(activeIndex, 1);
        connectionSettings.profileId = existingId;
    } else if (activeIndex >= 0) {
        connectionProfiles[activeIndex] = connectionProfileSnapshot(name, connectionSettings.profileId);
    } else {
        const profile = connectionProfileSnapshot(name);
        connectionProfiles.push(profile);
        connectionSettings.profileId = profile.id;
    }

    connectionSettings.apiKey = customApiKey;
    saveConnectionProfiles();
    saveConnectionSettings();
    renderConnectionProfileControls();
    notify('success', `连接预设“${name}”已保存。`);
}

async function deleteCurrentConnectionProfile() {
    const profile = connectionProfiles.find(item => item.id === connectionSettings.profileId);
    if (!profile) return;
    const confirmed = await showStudioConfirm({
        title: '删除连接预设？',
        message: `将删除“${profile.name}”，当前输入的连接信息仍会保留。`,
        confirmLabel: '删除预设',
        danger: true,
    });
    if (!confirmed) return;
    connectionProfiles = connectionProfiles.filter(item => item.id !== profile.id);
    connectionSettings.profileId = '';
    saveConnectionProfiles();
    saveConnectionSettings();
    renderConnectionProfileControls();
    notify('success', `已删除连接预设“${profile.name}”。`);
}

function installConnectionProfileUI() {
    const customConnection = shell.querySelector('#acs-custom-connection');
    if (!customConnection || shell.querySelector('#acs-connection-profile-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'acs-connection-profile-panel';
    panel.className = 'acs-connection-profile-panel';
    panel.innerHTML = `
      <div class="acs-connection-profile-heading">
        <button id="acs-connection-profile-toggle" class="acs-connection-profile-toggle" type="button" aria-expanded="true" aria-controls="acs-connection-profile-body">
          <span>连接预设</span>
          <span>
            <small id="acs-connection-profile-count">0 个已保存</small>
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </span>
        </button>
      </div>
      <div id="acs-connection-profile-body" class="acs-connection-profile-body">
        <label>
          <span>快速切换</span>
          <select id="acs-connection-profile"></select>
        </label>
        <div class="acs-connection-profile-name-row">
          <label class="acs-connection-profile-nameplate" for="acs-connection-profile-name">
            <i class="fa-solid fa-tag" aria-hidden="true"></i>
            <input id="acs-connection-profile-name" type="text" maxlength="60" placeholder="给这套连接起个名字">
          </label>
          <button id="acs-save-connection-profile" class="acs-connection-profile-action" type="button" aria-label="保存连接预设" title="保存为新连接预设">
            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
          </button>
          <button id="acs-delete-connection-profile" class="acs-connection-profile-action" type="button" aria-label="删除连接预设" title="删除当前连接预设">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
        </div>
        <div class="acs-model-parameter-section">
          <div class="acs-model-parameter-heading">
            <span>模型参数</span>
            <button id="acs-reset-model-parameters" class="acs-model-parameter-reset" type="button">恢复预设默认值</button>
          </div>
          <div id="acs-model-parameter-grid" class="acs-model-parameter-grid">
            ${MODEL_PARAMETER_FIELDS.map(([key, label, min, max]) => `
              <label>
                <span>${label}</span>
                <input type="number" data-model-parameter="${key}" min="${min}" max="${max}" step="any" placeholder="未设置">
              </label>`).join('')}
          </div>
          <p class="acs-model-parameter-note">导入的 A.U.T.O 参数只作为初始默认值；生成时以这里保存的参数为准。</p>
        </div>
      </div>`;
    customConnection.prepend(panel);
    shell.querySelector('#acs-custom-api-key').placeholder = '保存在当前浏览器中';
    shell.querySelector('#acs-connection-profile').addEventListener('change', event => {
        const profile = connectionProfiles.find(item => item.id === event.target.value);
        if (profile) applyConnectionProfile(profile);
        else {
            connectionSettings.profileId = '';
            saveConnectionSettings();
            renderConnectionProfileControls();
        }
    });
    shell.querySelector('#acs-save-connection-profile').addEventListener('click', saveCurrentConnectionProfile);
    shell.querySelector('#acs-delete-connection-profile').addEventListener('click', deleteCurrentConnectionProfile);
    shell.querySelector('#acs-connection-profile-toggle').addEventListener('click', event => {
        const collapsed = panel.classList.toggle('is-collapsed');
        customConnection.classList.toggle('is-profile-collapsed', collapsed);
        event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    });
    for (const input of panel.querySelectorAll('[data-model-parameter]')) {
        input.addEventListener('change', updateModelParameter);
    }
    shell.querySelector('#acs-reset-model-parameters').addEventListener('click', resetModelParametersToPreset);
    const note = customConnection.querySelector('.acs-security-note');
    if (note) note.lastChild.textContent = ' 密钥会长期保存在当前浏览器中，不写入项目或导出文件；请仅在个人设备上使用。';
    renderConnectionProfileControls();
}

function ensureOutputModeControls() {
    if (shell.querySelector('#acs-output-mode')) return;
    const connectionOptions = shell.querySelector('.acs-connection-options');
    if (!connectionOptions) return;

    const section = document.createElement('div');
    section.id = 'acs-output-mode';
    section.className = 'acs-output-mode';
    section.innerHTML = `
        <span>输出方式</span>
        <div class="acs-output-mode-options" role="radiogroup" aria-label="模型输出方式">
            <label class="acs-connection-choice">
                <input type="radio" name="acs-output-mode" value="stream">
                <span>
                    <strong>流式输出</strong>
                    <small>生成时实时显示内容</small>
                </span>
            </label>
            <label class="acs-connection-choice">
                <input type="radio" name="acs-output-mode" value="complete">
                <span>
                    <strong>非流式输出</strong>
                    <small>完成后一次显示回复</small>
                </span>
            </label>
        </div>`;
    connectionOptions.insertAdjacentElement('afterend', section);

    for (const radio of section.querySelectorAll('input[name="acs-output-mode"]')) {
        radio.addEventListener('change', event => {
            if (!event.target.checked) return;
            connectionSettings.outputMode = event.target.value === 'stream' ? 'stream' : 'complete';
            saveConnectionSettings();
            renderConnectionSettings();
            renderCurrentStep();
        });
    }
}

function renderConnectionSettings() {
    ensureOutputModeControls();
    for (const radio of shell.querySelectorAll('input[name="acs-connection-mode"]')) {
        radio.checked = radio.value === connectionSettings.mode;
    }
    for (const radio of shell.querySelectorAll('input[name="acs-output-mode"]')) {
        radio.checked = radio.value === connectionSettings.outputMode;
    }

    const isCustom = connectionSettings.mode === 'custom';
    shell.querySelector('#acs-custom-connection').hidden = !isCustom;
    shell.querySelector('#acs-custom-source').value = connectionSettings.source;
    syncStyledSelect(shell.querySelector('#acs-custom-source'));
    shell.querySelector('#acs-custom-api-url').value = connectionSettings.apiUrl;
    shell.querySelector('#acs-custom-api-key').value = customApiKey;
    shell.querySelector('#acs-custom-model').value = connectionSettings.model;
    renderConnectionProfileControls();

    const summary = shell.querySelector('#acs-connection-summary');
    const activeProfile = connectionProfiles.find(item => item.id === connectionSettings.profileId);
    summary.classList.toggle('is-custom', isCustom);
    summary.textContent = isCustom
        ? (activeProfile?.name || connectionSettings.model.trim() || '等待配置')
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

function updateStudioViewportScale() {
    const studioWindow = shell?.querySelector('.acs-window');
    if (!studioWindow) return;

    const viewportWidth = Math.min(
        hostWindow.innerWidth || STUDIO_DESIGN_MIN_WIDTH,
        hostWindow.visualViewport?.width || Number.POSITIVE_INFINITY,
    );
    const viewportHeight = Math.min(
        hostWindow.innerHeight || STUDIO_DESIGN_MIN_HEIGHT,
        hostWindow.visualViewport?.height || Number.POSITIVE_INFINITY,
    );
    // 仅在真正窄屏时启用手机抽屉；桌面触控屏或浏览器缩放不能误触发手机顶栏。
    const useMobileLayout = viewportWidth <= 640;
    shell.classList.toggle('acs-mobile-layout', useMobileLayout);

    // 手机端改用真正的单栏布局，不再把桌面画布缩成难以点击的小字版本。
    if (useMobileLayout) {
        shell.classList.remove('acs-proportional-layout');
        shell.dataset.layoutScale = '1';
        for (const property of ['inset', 'top', 'left', 'width', 'height', 'transform']) {
            studioWindow.style.removeProperty(property);
        }
        return;
    }

    setMobilePanel(null);
    const availableWidth = Math.max(1, viewportWidth - STUDIO_VIEWPORT_MARGIN);
    const availableHeight = Math.max(1, viewportHeight - STUDIO_VIEWPORT_MARGIN);
    const scale = Math.min(
        1,
        availableWidth / STUDIO_DESIGN_MIN_WIDTH,
        availableHeight / STUDIO_DESIGN_MIN_HEIGHT,
    );

    if (scale >= 0.995) {
        shell.classList.remove('acs-proportional-layout');
        shell.dataset.layoutScale = '1';
        for (const property of ['inset', 'top', 'left', 'width', 'height', 'transform']) {
            studioWindow.style.removeProperty(property);
        }
        return;
    }

    const virtualWidth = availableWidth / scale;
    const virtualHeight = availableHeight / scale;
    shell.classList.add('acs-proportional-layout');
    shell.dataset.layoutScale = scale.toFixed(4);
    studioWindow.style.inset = 'auto';
    studioWindow.style.top = '50%';
    studioWindow.style.left = '50%';
    studioWindow.style.width = `${virtualWidth}px`;
    studioWindow.style.height = `${virtualHeight}px`;
    studioWindow.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function renderOverviewState() {
    const collapsed = Boolean(project.ui.overviewCollapsed);
    const stage = shell.querySelector('.acs-stage');
    const briefPanel = shell.querySelector('#acs-brief-panel');
    const button = shell.querySelector('#acs-toggle-overview');
    const icon = button.querySelector('i');
    const heading = shell.querySelector('.acs-stage-heading');

    stage.classList.toggle('is-overview-collapsed', collapsed);
    // 保持节点存在，才能让母题区域完成向下展开与向上收起的过渡。
    briefPanel.hidden = false;
    briefPanel.setAttribute('aria-hidden', String(collapsed));
    heading?.setAttribute('aria-expanded', String(!collapsed));
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

// 只规范 A.U.T.O 规定的正式产物区块；CONTEXT 思考、评分和追问中的“用户”保持原样。
function normalizeFinalArtifactUserMacros(text, stepNumber) {
    const source = repairExpandedCharacterMacro(text);
    const ranges = extractArtifactBlocks(source, stepNumber)
        .map(block => ({ start: block.start, end: block.end }))
        .sort((left, right) => left.start - right.start || left.end - right.end);
    if (!ranges.length) return source;

    // 合并可能嵌套或重叠的正式区块，避免同一段文字被重复替换。
    const merged = [];
    for (const range of ranges) {
        const previous = merged.at(-1);
        if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
        else merged.push({ ...range });
    }

    let normalized = source;
    for (const range of merged.reverse()) {
        const artifact = normalized.slice(range.start, range.end).replaceAll('用户', '{{user}}');
        normalized = `${normalized.slice(0, range.start)}${artifact}${normalized.slice(range.end)}`;
    }
    return normalized;
}

// 宏处理可能递归生成新的 {{char}}；因此在酒馆助手替换之后还要再次修复并保护。
function prepareTemplateMacrosForGeneration(text) {
    return protectTemplateMacros(repairExpandedCharacterMacro(text));
}

function repairProjectTemplateMacros(projectData) {
    for (const [stepNumber, state] of Object.entries(projectData.steps || {})) {
        for (const collectionName of ['turns', 'artifactHistory']) {
            if (!Array.isArray(state?.[collectionName])) continue;
            for (const turn of state[collectionName]) {
                if (turn?.role === 'assistant' && typeof turn.content === 'string') {
                    turn.content = normalizeFinalArtifactUserMacros(turn.content, Number(stepNumber));
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

function buildProjectContext(currentStep, preset, options = {}) {
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

    // 发布时的自动重组使用隐藏的内部 Step 30，不会出现在 project.steps 中。
    const currentTurns = project.steps[currentStep.number]?.turns || [];
    // 最新一条用户输入会通过 user_input 单独发送；这里只保留此前的修改要求，不再回传 AI 的整段说明或思考。
    const contextualTurns = currentTurns.at(-1)?.role === 'user' ? currentTurns.slice(0, -1) : currentTurns;
    const priorUserRequests = contextualTurns.filter(turn => turn.role === 'user').slice(-6);
    if (priorUserRequests.length) {
        sections.push('\n# 当前阶段的既有修改要求');
        for (const turn of priorUserRequests) {
            sections.push(`\n[创作者补充]\n${String(turn.content || '').slice(0, 18000)}`);
        }
    }

    const currentArtifacts = effectiveStepArtifacts(currentStep.number);
    if (currentArtifacts) {
        sections.push(`\n# 当前阶段正式产物（各产物最新版）\n${responseForPrompt(currentArtifacts, preset).slice(0, 44000)}`);
    }

    if (Array.isArray(options.reorgArtifacts)) {
        // 自动重组的 blockId 必须来自与发布流程一致的结构报告。
        sections.push(`\n# 创作台虚拟世界书结构报告（供发布时自动重组使用）\n${buildReorgStructureReport(options.reorgArtifacts)}`);
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
        const isWorkflowStep = ALL_PRESET_STEP_PROMPT_IDS.has(prompt.id);
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
    const projectContext = {
        role: 'user',
        content: prepareTemplateMacrosForGeneration(buildProjectContext(currentStep, preset, options)),
    };
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
    } else if (Object.prototype.hasOwnProperty.call(options, 'embeddedUserInput')) {
        // 后台发布生成没有常规输入框上下文，直接嵌入 RolePrompt，避免酒馆助手解析 user_input 占位符时报错。
        ordered.push({
            role: 'user',
            content: prepareTemplateMacrosForGeneration(options.embeddedUserInput),
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

function ensurePromptMessageContent(body) {
    if (!body || body.dataset.rendered === 'true') return;
    const index = Number(body.dataset.promptMessageIndex);
    const message = promptPreviewMessages[index];
    if (!message) return;
    const content = document.createElement('pre');
    content.textContent = repairExpandedCharacterMacro(message.content);
    body.append(content);
    body.dataset.rendered = 'true';
}

function renderPromptPreview(messages, step) {
    promptPreviewMessages = messages;
    const renderEpoch = ++promptTokenRenderEpoch;
    const list = shell.querySelector('#acs-prompt-message-list');
    const deferMessageBodies = shell.classList.contains('acs-mobile-layout');
    list.replaceChildren();
    shell.querySelector('#acs-prompt-preview-summary').textContent = `Step ${step.number} · ${messages.length} 条消息 · 正在统计 tokens · ${connectionDisplayName()}`;

    const currentStepIndex = messages.findIndex(message => String(message.name || '').startsWith(`Step${step.number}`));
    const initiallyOpenIndex = deferMessageBodies ? -1 : (currentStepIndex >= 0 ? currentStepIndex : messages.length - 1);
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
        body.dataset.promptMessageIndex = String(index);
        if (!deferMessageBodies) ensurePromptMessageContent(body);
        item.append(toggle, body);
        list.append(item);

        if (index === initiallyOpenIndex) setPromptMessageOpen(item, true, false);
    });

    const renderTokenMetrics = () => Promise.all(messages.map(message => measureTokenCount(message.content))).then(metrics => {
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
    // 手机端先显示预览外壳，token 统计延后一帧，避免长上下文阻塞打开动画。
    if (deferMessageBodies) hostWindow.setTimeout(() => { void renderTokenMetrics(); }, 0);
    else void renderTokenMetrics();
}

function setPromptMessageOpen(item, open, scroll = true) {
    if (!item) return;
    const toggle = item.querySelector('[data-prompt-message-toggle]');
    const body = item.querySelector('.acs-prompt-message-body');
    item.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (open) ensurePromptMessageContent(body);
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
    try {
        const preset = getAutoPresetSafe();
        if (!preset) {
            notify('warning', '请先导入 A.U.T.O 预设。');
            return;
        }
        const step = STEPS[project.currentStep - 1];
        const state = project.steps[step.number];
        const userInput = resolvedCurrentUserInput(step, state);
        const messages = buildOrderedPrompts(preset, step, { previewUserInput: userInput });
        toggleProjectMenu(false);
        closeStyledSelects();
        // 手机端先收起步骤／产物抽屉，确保预览可见且可操作。
        if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);

        const preview = shell.querySelector('#acs-prompt-preview');
        preview.hidden = false;
        preview.setAttribute('aria-hidden', 'false');
        preview.querySelector('button[data-prompt-preview-close]')?.focus({ preventScroll: true });
        renderPromptPreview(messages, step);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 打开提示词预览失败', error);
        notify('error', '提示词预览打开失败，请重试。');
    }
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
    // 预设参数只负责首次初始化；实际生成始终读取创作台独立保存的模型参数。
    const settings = ensureConnectionModelParameters(preset);
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

/**
 * 生成诊断只记录请求形状，不记录提示词正文、用户输入或 API 密钥。
 * 这样用户在反馈渠道兼容问题时，能提供足够信息，同时不会意外泄露创作内容。
 */
function generationDiagnosticOptions(customApi) {
    const { key, apiurl, ...safeOptions } = customApi || {};
    let safeApiUrl = '';
    if (apiurl) {
        try {
            const parsed = new URL(apiurl);
            safeApiUrl = `${parsed.origin}${parsed.pathname}`;
        } catch {
            safeApiUrl = '[接口地址格式无效]';
        }
    }
    return {
        ...safeOptions,
        ...(safeApiUrl ? { apiurl: safeApiUrl } : {}),
        ...(key ? { key: '[已配置，已隐藏]' } : {}),
    };
}

/** 将不同酒馆助手/兼容层抛出的错误提取为可打印的安全摘要。 */
function generationErrorDetails(error) {
    const seen = new WeakSet();
    const simplify = (value, depth = 0) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string') return value.length > 4000 ? `${value.slice(0, 4000)}…[已截断]` : value;
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth >= 3) return '[嵌套内容已省略]';
        if (typeof value !== 'object') return String(value);
        if (seen.has(value)) return '[循环引用]';
        seen.add(value);
        if (Array.isArray(value)) return value.slice(0, 20).map(item => simplify(item, depth + 1));
        const output = {};
        for (const field of ['name', 'message', 'status', 'statusCode', 'code', 'type', 'error', 'errors', 'data', 'response', 'cause', 'body']) {
            if (!(field in value) || field === 'key' || field === 'authorization') continue;
            try {
                output[field] = simplify(value[field], depth + 1);
            } catch {
                output[field] = '[读取失败]';
            }
        }
        return Object.keys(output).length ? output : String(value);
    };
    return simplify(error);
}

function generationErrorMessage(error, fallback = '未知错误') {
    const details = generationErrorDetails(error);
    const candidates = [
        details?.message,
        details?.error?.message,
        details?.data?.message,
        details?.data?.error?.message,
        details?.response?.data?.message,
        details?.response?.data?.error?.message,
        details?.cause?.message,
        typeof details === 'string' ? details : '',
    ];
    return String(candidates.find(value => typeof value === 'string' && value.trim()) || fallback);
}

function logGenerationDiagnostic(phase, detail) {
    const label = `[A.U.T.O Card Studio] 生成诊断 · ${phase}`;
    if (console.groupCollapsed) console.groupCollapsed(label);
    else console.info(label);
    console.info(detail);
    if (console.groupEnd) console.groupEnd();
}

/**
 * 酒馆助手有时只把 HTTP 状态文本抛给调用方。记录本轮生成端点的响应摘要，
 * 用于保留渠道实际返回的错误正文；不会读取请求 body 或修改原始 Response。
 */
function captureGenerationHttpResponse() {
    let captured = null;
    const watchedPath = '/api/backends/chat-completions/generate';
    const fetchTargets = [...new Set([globalThis, hostWindow])]
        .filter(target => typeof target?.fetch === 'function');
    const safePath = value => {
        try {
            const parsed = new URL(value, globalThis.location?.origin);
            return parsed.pathname;
        } catch {
            return String(value || '');
        }
    };
    const wrappers = [];
    for (const target of fetchTargets) {
        const originalFetch = target.fetch;
        const proxyFetch = async (...args) => {
            const response = await originalFetch.apply(target, args);
            const request = args[0];
            const requestUrl = typeof request === 'string' ? request : request?.url;
            if (safePath(requestUrl).includes(watchedPath)) {
                captured = {
                    status: response.status,
                    status_text: response.statusText,
                    content_type: response.headers?.get?.('content-type') || '',
                    request_window: target === hostWindow ? 'SillyTavern 主页面' : '酒馆助手 iframe',
                };
                if (!response.ok) {
                    try {
                        const body = await response.clone().text();
                        captured.response_body = body.length > 4000 ? `${body.slice(0, 4000)}…[已截断]` : body;
                    } catch (error) {
                        captured.response_body = `[无法读取响应正文：${String(error?.message || error)}]`;
                    }
                }
            }
            return response;
        };
        try {
            target.fetch = proxyFetch;
            wrappers.push({ target, originalFetch, proxyFetch });
        } catch (error) {
            console.warn('[A.U.T.O Card Studio] 无法安装生成响应诊断监听器。', error);
        }
    }
    return {
        read: () => captured,
        stop: () => {
            // 不覆盖其他脚本后来安装的 fetch 包装器。
            for (const { target, originalFetch, proxyFetch } of wrappers) {
                if (target.fetch === proxyFetch) target.fetch = originalFetch;
            }
        },
    };
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
        const uniqueModels = [...new Set((models || [])
            .map(model => typeof model === 'string' ? model : model?.id || model?.name || '')
            .map(model => String(model).trim())
            .filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
        availableCustomModels = uniqueModels;
        const options = shell.querySelector('#acs-custom-model-options');
        options.replaceChildren(...uniqueModels.map(model => new Option(model, model)));
        renderCustomModelOptions();
        if (uniqueModels.length) toggleCustomModelOptions(true);
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
    if (!studioResources.preset) {
        notify('error', '请先在创作台设置页导入 A.U.T.O 预设 JSON。');
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
    let streamSubscription = null;
    let streamingTurn = null;
    let generationDiagnostic = null;
    let httpResponseCapture = null;
    try {
        const preset = studioResources.preset;
        activeGenerationId = `auto-card-studio-${project.id}-${step.number}-${Date.now()}`;
        const shouldStream = connectionSettings.outputMode === 'stream';
        const customApi = presetGenerationOptions(preset);
        // 同一轮只构建一次，确保日志的条目数与实际传给酒馆助手的内容一致。
        const orderedPrompts = buildOrderedPrompts(preset, step);
        generationDiagnostic = {
            step: `${step.number} · ${step.name}`,
            generation_id: activeGenerationId,
            should_stream: shouldStream,
            connection_mode: connectionSettings.mode,
            output_mode: connectionSettings.outputMode,
            preset_prompt_count: Array.isArray(preset.prompts) ? preset.prompts.length : 0,
            ordered_prompt_count: orderedPrompts.length,
            ordered_prompt_shape: orderedPrompts.map((prompt, index) => typeof prompt === 'string'
                ? { index: index + 1, type: 'user_input 占位符' }
                : { index: index + 1, role: prompt.role || 'system', characters: String(prompt.content || '').length }),
            user_input_characters: String(userInput || '').length,
            custom_api: generationDiagnosticOptions(customApi),
        };
        logGenerationDiagnostic('请求开始（不含提示词正文）', generationDiagnostic);
        httpResponseCapture = captureGenerationHttpResponse();

        if (shouldStream) {
            streamingTurn = { role: 'assistant', content: '', createdAt: new Date().toISOString() };
            state.turns.push(streamingTurn);
            renderCurrentStep();
            streamSubscription = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (fullText, generationId) => {
                if (generationId !== activeGenerationId || !streamingTurn) return;
                streamingTurn.content = normalizeFinalArtifactUserMacros(String(fullText || ''), step.number);
                const content = shell.querySelector('#acs-turns .acs-turn:last-child .acs-turn-content');
                if (content) content.textContent = streamingTurn.content;
                const conversation = shell.querySelector('.acs-conversation');
                if (conversation) conversation.scrollTop = conversation.scrollHeight;
            });
        }

        const result = await helper.generateRaw({
            generation_id: activeGenerationId,
            user_input: prepareTemplateMacrosForGeneration(userInput),
            should_stream: shouldStream,
            should_silence: false,
            ordered_prompts: orderedPrompts,
            custom_api: customApi,
        });
        const rawResponse = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        logGenerationDiagnostic('请求完成', {
            ...generationDiagnostic,
            result_type: typeof result,
            response_characters: rawResponse.length,
            http_response: httpResponseCapture?.read(),
        });
        const response = normalizeFinalArtifactUserMacros(rawResponse, step.number);
        if (streamingTurn) streamingTurn.content = response;
        else state.turns.push({ role: 'assistant', content: response, createdAt: new Date().toISOString() });
        state.status = 'draft';
        state.updatedAt = new Date().toISOString();
        saveProject();
        succeeded = true;
        notify('success', retried
            ? `Step ${step.number}「${step.name}」已重新生成。`
            : `Step ${step.number}「${step.name}」草案已生成。`);
    } catch (error) {
        const message = generationErrorMessage(error, String(error?.message || error));
        const stopped = /abort|stop|停止|中断/i.test(message);
        if (!stopped) {
            if (streamingTurn) state.turns = state.turns.filter(turn => turn !== streamingTurn);
            const details = generationErrorDetails(error);
            console.error('[A.U.T.O Card Studio] 生成失败', error);
            logGenerationDiagnostic('请求失败', {
                ...generationDiagnostic,
                error: details,
                http_response: httpResponseCapture?.read(),
                note: '若 error 仍只有 Bad Request，说明酒馆助手/渠道没有透传原始响应；请在开发者工具 Network 的 Fetch/XHR 中查看失败请求的 Response。',
            });
            // 保持提示简短；完整但脱敏的参数与接口错误可在浏览器控制台查看。
            notify('error', `生成失败：${message}。详细诊断已输出到浏览器控制台。`);
        } else {
            if (streamingTurn?.content) {
                state.status = 'draft';
                state.updatedAt = new Date().toISOString();
                saveProject();
            } else if (streamingTurn) {
                state.turns = state.turns.filter(turn => turn !== streamingTurn);
            }
            notify('info', '本次生成已停止。');
        }
    } finally {
        httpResponseCapture?.stop();
        streamSubscription?.stop?.();
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
    // 不依赖模型是否正确标注 html/xml/regex 语言，以内容结构判定交付类型。
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
        || rules.patterns?.some(pattern => pattern.test(block.tag))
    ));
    const fencedBlocks = extractFencedBlocks(text).filter(block => rules.fences?.includes(block.language));

    if (rules.statusbarFences) {
        for (const block of extractFencedBlocks(text)) {
            const tag = statusbarFenceTag(block);
            // SOURCE 指南同时是 XML 时优先保留精确标签，不把整个代码围栏重复算作新版本。
            if (tag && !xmlBlocks.some(item => item.tag === tag)) fencedBlocks.push({ ...block, tag });
        }
    }

    return [...xmlBlocks, ...fencedBlocks].sort((left, right) => left.start - right.start || left.end - right.end);
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

function deliveryTargetForArtifact(tag, stepNumber) {
    const step = Number(stepNumber);
    const rawTag = String(tag || '');
    const exactTargets = {
        WORLD_interaction_paradigm: '🕹️交互范式',
        WORLD_aesthetic_program: '🕹️美学纲领',
        WORLD_blueprint: '🧩世界蓝图',
        SOURCE_spatial_planning: '🗑️空间规划1️⃣',
        WORLD_narrative_core: '🕹️叙事指南核心',
        SOURCE_待变量化: '🗑️数据盘点3️⃣',
        SOURCE_待条件化: '🗑️数据盘点3️⃣',
        SOURCE_variable_system_planning: '🗑️变量体系规划2️⃣',
        WORLD_variable_update_guide: '🕹️更新指南2️⃣[mvu_update]',
        SOURCE_step19_plan: '🗑️条件显示规划3️⃣',
        WORLD_root_index: '🕹️世界根目录',
        SOURCE_statusbar_data_guide: '🗑️状态栏更新提示4️⃣',
        SYS_output_format: '🕹️输出格式[mvu_plot]',
        SOURCE_task_list: '🗑️副AI任务清单5️⃣',
        SOURCE_entry_plan: '🗑️条目规划表6️⃣',
        autotask_config: '[AutoTask配置-请勿修改]',
        opening: '角色卡 · 其他开场',
    };
    if (exactTargets[rawTag]) {
        return { kind: rawTag === 'opening' ? 'opening' : 'worldbook', name: exactTargets[rawTag] };
    }
    // Step23 会分别产出状态栏界面与匹配表达式，发布时将两者组合为一条角色卡局部正则。
    if (rawTag === 'STATUSBAR_HTML') {
        return { kind: 'character_regex_replace', name: '角色卡局部正则 · 🕹️显示状态栏（替换内容）' };
    }
    if (rawTag === 'STATUSBAR_REGEX') {
        return { kind: 'character_regex_find', name: '角色卡局部正则 · 🕹️显示状态栏（查找表达式）' };
    }
    if (rawTag.startsWith('WORLD_implementation_mechanisms')) return { kind: 'worldbook', name: '🕹️实现机制' };
    if (rawTag.startsWith('WORLD_arc_framework_')) return { kind: 'worldbook', name: '🗑️弧光识别1️⃣' };
    if (rawTag.startsWith('WORLD_relationship_map')) return { kind: 'worldbook', name: '🧩关系图谱' };
    if (rawTag.startsWith('WORLD_generative_rules_')) return { kind: 'worldbook', name: '🧩生成规则' };
    if (rawTag.startsWith('WORLD_specific_instances_')) return { kind: 'worldbook', name: '🧩具体实例' };
    if (rawTag.startsWith('WORLD_lore_')) return { kind: 'worldbook', name: '🧩世界知识' };
    if (rawTag.startsWith('SOURCE_plot_graph_')) return { kind: 'worldbook', name: '🗑️情节图谱' };
    if (rawTag.startsWith('WORLD_dimension_')) return { kind: 'worldbook', name: '🧩维度内容' };
    if (rawTag.startsWith('WORLD_language_materials_')) return { kind: 'worldbook', name: '🧩语料库' };
    if (rawTag.startsWith('WORLD_scene_strategies_')) return { kind: 'worldbook', name: '🧩场景策略集' };
    if (rawTag.startsWith('WORLD_current_')) return { kind: 'worldbook', name: '🕹️当前变量' };
    if (rawTag.startsWith('SOURCE_condition_mapping_')) return { kind: 'worldbook', name: '🗑️条件地图2️⃣' };
    if (rawTag.startsWith('WORLD_main_characters_') || rawTag.startsWith('SOURCE_main_characters_')) {
        if (rawTag.endsWith('_原点')) return { kind: 'worldbook', name: '🕹️主要角色-原点' };
        if (rawTag.endsWith('_画像')) return { kind: 'worldbook', name: '🧩主要角色-画像' };
        if (rawTag.endsWith('_状态')) return { kind: 'worldbook', name: '🗑️主要角色-状态2️⃣' };
    }
    if (rawTag.startsWith('SYS_task_')) {
        if (step === 26) return { kind: 'worldbook', name: '🔇世界书提示词' };
        if (step === 27) return { kind: 'worldbook', name: '🔇变量提示词' };
    }
    if (step === 20 && rawTag.startsWith('WORLD_')) {
        return { kind: 'worldbook', name: `🔢${artifactSuffixLabel(rawTag.slice('WORLD_'.length)) || '条件显示内容'}` };
    }
    if (step === 21 && rawTag.startsWith('WORLD_')) return { kind: 'worldbook', name: '🔢其他条件展示内容' };
    return null;
}

function collectDeliveryArtifacts() {
    return collectArtifactGroups().flatMap(group => {
        const artifact = group.versions.at(-1);
        const target = deliveryTargetForArtifact(group.tag, artifact.step);
        if (!target) return [];
        return [{
            id: `${artifact.step}:${group.tag}`,
            tag: group.tag,
            step: artifact.step,
            accepted: artifact.accepted,
            content: artifact.content,
            displayName: artifactDisplayName(group.tag, artifact.step),
            target,
        }];
    });
}

function worldbookEntryEnabled(name) {
    return String(name).startsWith('🕹️') || String(name).startsWith('🧩');
}

function buildDefaultOutputWorldbook(selectedArtifacts) {
    const grouped = new Map();
    for (const artifact of selectedArtifacts.filter(item => item.target.kind === 'worldbook')) {
        if (!grouped.has(artifact.target.name)) grouped.set(artifact.target.name, []);
        const contents = grouped.get(artifact.target.name);
        if (!contents.includes(artifact.content)) contents.push(artifact.content);
    }

    return [...grouped.entries()].map(([name, contents], index) => ({
        uid: index,
        name,
        enabled: worldbookEntryEnabled(name),
        strategy: {
            type: 'constant',
            keys: [],
            keys_secondary: { logic: 'and_any', keys: [] },
            scan_depth: 'same_as_global',
        },
        position: {
            type: 'before_character_definition',
            role: 'system',
            depth: 4,
            order: 1000 - index,
        },
        content: contents.join('\n\n'),
        probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
        extra: {
            auto_card_studio: {
                projectId: project.id,
                generatedAt: new Date().toISOString(),
            },
        },
    }));
}

function createReorgSourceModel(artifacts = collectDeliveryArtifacts()) {
    const grouped = new Map();
    for (const artifact of artifacts.filter(item => item.target.kind === 'worldbook')) {
        if (!grouped.has(artifact.target.name)) grouped.set(artifact.target.name, []);
        const group = grouped.get(artifact.target.name);
        // 即使正文相同也保留独立 blockId；发布完整性按“产物”而非“不同正文”校验。
        group.push(artifact);
    }

    const entries = [];
    const blockById = new Map();
    [...grouped.entries()].forEach(([name, items], uid) => {
        const blocks = items.map((artifact, blockIndex) => {
            const blockId = `uid_${uid}_block_${blockIndex}`;
            const block = { blockId, artifact, tagName: artifact.tag, entryName: name };
            blockById.set(blockId, block);
            return block;
        });
        entries.push({ uid, name, blocks });
    });
    return { entries, blockById };
}

function reorgSelectionSignature(artifacts = []) {
    // 只记录产物身份与交付位置，不包含正文。这样正文修订后仍可沿用分组，增删或替换产物则会失效。
    const identities = artifacts
        .filter(item => item?.target?.kind === 'worldbook')
        .map(item => ({
            id: String(item.id || ''),
            tag: String(item.tag || ''),
            step: Number(item.step) || 0,
            targetKind: String(item.target?.kind || ''),
            targetName: String(item.target?.name || ''),
        }))
        .sort((left, right) => (
            left.id.localeCompare(right.id, 'zh-CN')
            || left.tag.localeCompare(right.tag, 'zh-CN')
            || left.targetName.localeCompare(right.targetName, 'zh-CN')
        ));
    return JSON.stringify(identities);
}

function cachedReorgMatchesSelection(selectedArtifacts) {
    const cachedSignature = project.autoReorg?.selectionSignature;
    if (!cachedSignature) return false;
    return cachedSignature === reorgSelectionSignature(selectedArtifacts);
}

function buildReorgStructureReport(artifacts) {
    const model = createReorgSourceModel(artifacts || collectDeliveryArtifacts());
    const report = {
        version: '1.0',
        sourceWorldbook: `A.U.T.O 创作台·${project.name}`,
        note: '请在 reorg_plan.mappings[].blockIds 中严格使用下列 blockId。',
        entries: model.entries.map(entry => ({
            uid: entry.uid,
            name: entry.name,
            blocks: entry.blocks.map(block => ({
                blockId: block.blockId,
                tagName: block.tagName,
                displayName: block.artifact.displayName,
                step: block.artifact.step,
                characters: block.artifact.content.length,
            })),
        })),
    };
    return JSON.stringify(report, null, 2);
}

function parseJsonArtifact(content) {
    const source = String(content || '').replace(/^\uFEFF/, '').trim();
    if (!source) throw new Error('内容为空');
    try {
        return JSON.parse(source);
    } catch {
        const start = source.indexOf('{');
        const end = source.lastIndexOf('}');
        if (start < 0 || end <= start) throw new Error('未找到 JSON 对象');
        return JSON.parse(source.slice(start, end + 1));
    }
}

function latestReorgPlanResult() {
    const artifact = project.autoReorg?.plan
        ? { content: JSON.stringify(project.autoReorg.plan), response: project.autoReorg.response }
        : null;
    if (!artifact) return { status: 'none', plan: null, artifact: null };
    try {
        const plan = parseJsonArtifact(artifact.content);
        if (!Array.isArray(plan?.mappings) || !plan.mappings.length) {
            throw new Error('mappings 缺失或为空');
        }
        return { status: 'ready', plan, artifact };
    } catch (error) {
        return { status: 'invalid', plan: null, artifact, error: String(error?.message || error) };
    }
}

function latestReorgBlockTagHints() {
    const hints = new Map();
    const latest = project.autoReorg?.response || '';
    for (const line of String(latest).split(/\r?\n/)) {
        const tag = line.match(/\[([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)\]/)?.[1];
        const blockIds = line.match(/uid_\d+_block_\d+/g) || [];
        if (!tag) continue;
        for (const blockId of blockIds) hints.set(blockId, tag);
    }
    return hints;
}

function normalizeReorgLabel(value) {
    return String(value || '')
        .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u20E3]/gu, '')
        .replace(/(?:A\.U\.T\.O|AUTO|世界书|世界|角色卡|主要角色)/gi, '')
        .replace(/[\s_\-\.·・【】\[\]()（）:：·]/g, '')
        .toLowerCase();
}

function fuzzyArtifactsForMapping(mapping, selectedArtifacts, usedArtifactIds) {
    const wanted = normalizeReorgLabel(mapping.targetEntryName);
    if (!wanted) return [];
    return selectedArtifacts.filter(artifact => {
        if (artifact.target.kind !== 'worldbook' || usedArtifactIds.has(artifact.id)) return false;
        const labels = [artifact.displayName, artifact.target.name, artifact.tag].map(normalizeReorgLabel);
        return labels.some(label => label && (label === wanted || label.includes(wanted) || wanted.includes(label)));
    });
}

function escapeReorgRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transformReorgContent(content, artifactTag, action) {
    if (!action) return content;
    if (action.action === 'wrap' && action.params?.wrapTagName) {
        const tag = action.params.wrapTagName;
        return `<${tag}>${content}</${tag}>`;
    }
    if (action.action === 'rename' && action.params?.newTagName && artifactTag) {
        const oldTag = escapeReorgRegex(artifactTag);
        const newTag = action.params.newTagName;
        return String(content)
            .replace(new RegExp(`<${oldTag}(?=\\s|>)`, 'gu'), `<${newTag}`)
            .replace(new RegExp(`<\\/${oldTag}>`, 'gu'), `</${newTag}>`);
    }
    return content;
}

function reorgWorldbookEntry(mapping, resolvedBlocks, index) {
    const overrides = mapping.attributes?.overrides || {};
    const content = resolvedBlocks.map(({ artifact, blockId }) => (
        transformReorgContent(artifact.content, artifact.tag, mapping.actionMap?.get(blockId))
    )).join('\n\n');
    return {
        uid: index,
        name: String(mapping.targetEntryName || `重组条目 ${index + 1}`),
        enabled: overrides.enabled !== undefined ? Boolean(overrides.enabled) : true,
        strategy: {
            type: overrides.strategyType || 'constant',
            keys: Array.isArray(overrides.keys) ? overrides.keys : [],
            keys_secondary: {
                logic: overrides.secondaryLogic || 'and_any',
                keys: Array.isArray(overrides.keysSecondary) ? overrides.keysSecondary : [],
            },
            scan_depth: 'same_as_global',
        },
        position: {
            type: overrides.positionType || 'after_character_definition',
            role: overrides.role || 'system',
            depth: Number.isFinite(overrides.depth) ? overrides.depth : 0,
            order: Number.isFinite(overrides.order) ? overrides.order : 100 + index * 5,
        },
        content,
        probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: {
            sticky: overrides.sticky ?? null,
            cooldown: overrides.cooldown ?? null,
            delay: overrides.delay ?? null,
        },
        extra: {
            auto_card_studio: {
                projectId: project.id,
                generatedAt: new Date().toISOString(),
                reorgPlan: true,
            },
        },
    };
}

function applyReorgPlan(selectedArtifacts, allArtifacts, planResult) {
    if (planResult.status !== 'ready') {
        return { applied: false, entries: buildDefaultOutputWorldbook(selectedArtifacts), reason: planResult.status };
    }

    const selectedWorldbook = selectedArtifacts.filter(item => item.target.kind === 'worldbook');
    const selectedIds = new Set(selectedWorldbook.map(item => item.id));
    const model = createReorgSourceModel(allArtifacts);
    const hints = latestReorgBlockTagHints();
    const actionMap = new Map((planResult.plan.blockActions || []).map(action => [action.blockId, action]));
    const usedArtifactIds = new Set();
    const unresolvedBlockIds = [];
    const mappings = planResult.plan.mappings.map((mapping, sourceIndex) => ({ ...mapping, sourceIndex, actionMap }));
    mappings.sort((left, right) => {
        const leftOrder = left.attributes?.overrides?.order;
        const rightOrder = right.attributes?.overrides?.order;
        if (Number.isFinite(leftOrder) && Number.isFinite(rightOrder)) return leftOrder - rightOrder;
        if (Number.isFinite(leftOrder)) return -1;
        if (Number.isFinite(rightOrder)) return 1;
        return left.sourceIndex - right.sourceIndex;
    });

    const resolvedMappings = [];
    for (const mapping of mappings) {
        const resolved = [];
        for (const blockId of mapping.blockIds || []) {
            let artifact = model.blockById.get(blockId)?.artifact;
            if (artifact && !selectedIds.has(artifact.id)) artifact = null;
            if (!artifact && hints.has(blockId)) {
                artifact = selectedWorldbook.find(item => item.tag === hints.get(blockId) && !usedArtifactIds.has(item.id));
            }
            if (artifact && !usedArtifactIds.has(artifact.id)) {
                resolved.push({ artifact, blockId });
                usedArtifactIds.add(artifact.id);
            } else if (!artifact) {
                unresolvedBlockIds.push(blockId);
            }
        }
        if (!resolved.length) {
            for (const artifact of fuzzyArtifactsForMapping(mapping, selectedWorldbook, usedArtifactIds)) {
                resolved.push({ artifact, blockId: mapping.blockIds?.[0] || '' });
                usedArtifactIds.add(artifact.id);
            }
        }
        if (resolved.length) resolvedMappings.push({ mapping, resolved });
    }

    if (!resolvedMappings.length) {
        return {
            applied: false,
            entries: buildDefaultOutputWorldbook(selectedArtifacts),
            reason: 'unresolved',
            unresolvedBlockIds,
        };
    }

    const entries = resolvedMappings.map(({ mapping, resolved }, index) => reorgWorldbookEntry(mapping, resolved, index));
    return {
        applied: true,
        entries,
        plan: planResult.plan,
        usedArtifacts: usedArtifactIds.size,
        usedArtifactIds: [...usedArtifactIds],
        omittedArtifacts: Math.max(0, selectedWorldbook.length - usedArtifactIds.size),
        unresolvedBlockIds: [...new Set(unresolvedBlockIds)],
    };
}

function buildOutputWorldbook(selectedArtifacts, allArtifacts = selectedArtifacts) {
    return applyReorgPlan(selectedArtifacts, allArtifacts, latestReorgPlanResult());
}

function isCompleteReorgBuild(build, selectedArtifacts) {
    const selectedWorldbookCount = selectedArtifacts.filter(item => item.target.kind === 'worldbook').length;
    if (!selectedWorldbookCount) return true;
    return Boolean(
        build?.applied
        && build.usedArtifacts === selectedWorldbookCount
        && !build.omittedArtifacts
        && !(build.unresolvedBlockIds || []).length
    );
}

function reorgPlanFromResponse(response) {
    const block = extractArtifactBlocks(response, 30).find(item => item.tag === 'reorg_plan');
    if (!block) throw new Error('A.U.T.O 没有返回 reorg_plan 代码块');
    const plan = parseJsonArtifact(block.content);
    if (!Array.isArray(plan?.mappings) || !plan.mappings.length) {
        throw new Error('reorg_plan.mappings 缺失或为空');
    }
    return { status: 'ready', plan, artifact: block };
}

async function generateDeliveryReorgPlan(selectedArtifacts, { retryReason = '' } = {}) {
    const step = { number: 30, promptId: REORG_PROMPT_ID, name: '自动世界书重组' };
    if (!studioResources.preset) throw new Error('尚未向创作台导入 A.U.T.O 预设，无法自动重组');
    const connectionError = customConnectionError();
    if (connectionError) throw new Error(connectionError.message);
    const preset = studioResources.preset;
    if (!preset?.prompts?.length) throw new Error('导入的 A.U.T.O 预设没有可用提示词');
    const userInput = [
        '请立即执行预设中的世界书重组步骤（原 Step29）。',
        '只处理项目上下文中“创作台虚拟世界书结构报告”列出的本次已选产物。',
        '每个 blockId 都必须且只能在 mappings 中使用一次，不得遗漏，也不得自行编造 blockId。',
        retryReason ? `上一次方案未通过完整性校验：${retryReason}。请重新核对全部 blockId 后完整输出。` : '',
        '请严格输出 A.U.T.O 规定的 reorg_plan JSON 代码块。',
    ].filter(Boolean).join('\n');
    const generationId = `auto-card-studio-delivery-reorg-${project.id}-${Date.now()}`;
    // 发布阶段的重组与普通步骤使用同一输出方式，避免部分渠道把非流式请求路由到不同鉴权路径。
    const shouldStream = connectionSettings.outputMode === 'stream';
    const result = await helper.generateRaw({
        generation_id: generationId,
        should_stream: shouldStream,
        should_silence: false,
        ordered_prompts: buildOrderedPrompts(preset, step, {
            reorgArtifacts: selectedArtifacts,
            embeddedUserInput: userInput,
        }),
        custom_api: presetGenerationOptions(preset),
    });
    const rawResponse = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    const response = normalizeFinalArtifactUserMacros(rawResponse, 30);
    const planResult = reorgPlanFromResponse(response);

    // 重组是发布阶段的内部过程，不占用左侧创作步骤。
    project.autoReorg = {
        response,
        plan: planResult.plan,
        selectionSignature: reorgSelectionSignature(selectedArtifacts),
        updatedAt: new Date().toISOString(),
    };
    saveProject();
    return planResult;
}

function recoverIncompleteReorgBuild(build, selectedArtifacts) {
    const selectedWorldbook = selectedArtifacts.filter(item => item.target.kind === 'worldbook');
    const usedIds = new Set(build?.usedArtifactIds || []);
    const omitted = selectedWorldbook.filter(item => !usedIds.has(item.id));

    // 若模型方案完全不可用，仍按原目标安全创建世界书，保证所选产物一个不少。
    if (!build?.applied || !Array.isArray(build.entries) || !build.entries.length) {
        return {
            applied: true,
            entries: buildDefaultOutputWorldbook(selectedWorldbook),
            usedArtifacts: selectedWorldbook.length,
            usedArtifactIds: selectedWorldbook.map(item => item.id),
            omittedArtifacts: 0,
            unresolvedBlockIds: [],
            recoveredArtifacts: selectedWorldbook.length,
            recoveryMode: 'default',
        };
    }

    const entries = build.entries.map(entry => ({ ...entry }));
    const fallbackEntries = buildDefaultOutputWorldbook(omitted);
    for (const fallback of fallbackEntries) {
        const existing = entries.find(entry => normalizeReorgLabel(entry.name) === normalizeReorgLabel(fallback.name));
        if (existing) {
            const additions = omitted
                .filter(item => item.target.name === fallback.name)
                .map(item => item.content)
                .filter(content => content && !String(existing.content || '').includes(content));
            if (additions.length) existing.content = [existing.content, ...additions].filter(Boolean).join('\n\n');
        } else {
            entries.push({ ...fallback, uid: entries.length });
        }
    }

    return {
        ...build,
        applied: true,
        entries,
        usedArtifacts: selectedWorldbook.length,
        usedArtifactIds: selectedWorldbook.map(item => item.id),
        omittedArtifacts: 0,
        unresolvedBlockIds: [],
        recoveredArtifacts: omitted.length,
        recoveryMode: omitted.length ? 'append' : 'validated',
    };
}

async function ensureDeliveryReorg(selectedArtifacts) {
    const selectedWorldbook = selectedArtifacts.filter(item => item.target.kind === 'worldbook');
    if (!selectedWorldbook.length) {
        return { applied: true, entries: [], usedArtifacts: 0, omittedArtifacts: 0, unresolvedBlockIds: [] };
    }

    // 只有产物身份与交付位置完全一致时才复用。旧缓存没有结构指纹，会在首次发布时自动重建。
    let build = null;
    if (cachedReorgMatchesSelection(selectedWorldbook)) {
        build = applyReorgPlan(selectedWorldbook, deliveryArtifacts, latestReorgPlanResult());
        if (isCompleteReorgBuild(build, selectedWorldbook)) return build;
    }

    notify('info', '正在根据本次勾选的产物自动执行世界书重组…');
    let generatedPlan = await generateDeliveryReorgPlan(selectedWorldbook);
    build = applyReorgPlan(selectedWorldbook, selectedWorldbook, generatedPlan);
    if (!isCompleteReorgBuild(build, selectedWorldbook)) {
        const retryReasons = [];
        if (!build.applied) retryReasons.push('方案没有生成可用映射');
        if (build.omittedArtifacts) retryReasons.push(`遗漏 ${build.omittedArtifacts} 项产物`);
        if (build.unresolvedBlockIds?.length) retryReasons.push(`${build.unresolvedBlockIds.length} 个 blockId 无法匹配`);
        notify('info', '重组方案存在遗漏，正在自动修正一次…');
        try {
            generatedPlan = await generateDeliveryReorgPlan(selectedWorldbook, {
                retryReason: retryReasons.join('，') || '方案不完整',
            });
            build = applyReorgPlan(selectedWorldbook, selectedWorldbook, generatedPlan);
        } catch (error) {
            // 修正请求失败时保留首轮可用部分，随后由本地兜底补齐，避免再次中断发布。
            console.warn('[A.U.T.O Card Studio] 世界书重组自动修正请求失败，将使用安全补全。', error);
        }
    }

    if (!isCompleteReorgBuild(build, selectedWorldbook)) {
        build = recoverIncompleteReorgBuild(build, selectedWorldbook);
        notify('warning', `重组方案仍不完整，已安全补入 ${build.recoveredArtifacts || 0} 项产物。`);
    }
    renderAll();
    return build;
}

function createRegexId() {
    return hostWindow.crypto?.randomUUID?.()
        || `auto-card-studio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Step24“输出格式”的通用配套正则；状态栏显示正则由 Step23 按项目动态生成。
const OUTPUT_FORMAT_REGEX_BUNDLE = Object.freeze([
    ['7ccce287-970f-48e2-a151-0dddc79d3ab2', '🕹️去除conception', '/<CONTEXT_conception>[\\s\\S]*?</CONTEXT_conception>/gs', [1, 2], true, true, null],
    ['139f6568-218c-40bc-9d05-53888efeab67', '🧩不发送剧情', '/<NARRATIVE>[\\s\\S]*?</NARRATIVE>/gs', [1, 2], false, true, 5],
    ['1f719870-73ce-4cee-aab9-ef32b587a427', '🧩不发送副剧情', '/<NARRATIVE_parallel>.*?</NARRATIVE_parallel>/gs', [1, 2], false, true, 5],
    ['0f340cb5-f1e6-4790-978a-53b63d7fad9c', '🕹️去除选择区', '/<CONTEXT_options>[\\s\\S]*?</CONTEXT_options>/gs', [1, 2], true, true, 2],
    ['f3284806-c7db-4508-90f3-454bd9a0e349', '🕹️隐藏摘要', '/<CONTEXT_summary>[\\s\\S]*?</CONTEXT_summary>/gs', [1, 2], true, false, null],
    ['4ce83bde-111d-4453-9e6d-afd7328bd017', '🕹️隐藏隐藏摘要', '/<CONTEXT_hidden_summary>[\\s\\S]*?</CONTEXT_hidden_summary>/gs', [1, 2], true, false, null],
    ['f4a96e51-622d-45cd-bbe9-2f69c2888b54', '🕹️隐藏变量更新', '/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs', [1, 2], true, false, null],
    ['44f1f813-69ef-4262-bf3d-1bbc4ce071c0', '🕹️去除变量更新', '/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs', [1], true, true, 2],
    ['1eb350ef-e06a-4e5c-9cef-237eb7e9aa6a', '🕹️去除状态栏', '/<STATUSBAR_DATA>[\\s\\S]*?</STATUSBAR_DATA>/gs', [1, 2], true, true, 3],
].map(([id, name, findRegex, placement, display, prompt, minDepth]) => ({
    id,
    script_name: name,
    enabled: true,
    find_regex: findRegex,
    trim_strings: [],
    replace_string: '',
    source: {
        user_input: placement.includes(1),
        ai_output: placement.includes(2),
        slash_command: false,
        world_info: false,
        reasoning: false,
    },
    destination: { display, prompt },
    run_on_edit: true,
    min_depth: minDepth,
    max_depth: null,
})));

function mergeOutputFormatRegexBundle(existingScripts) {
    const scripts = Array.isArray(existingScripts) ? [...existingScripts] : [];
    for (const bundled of OUTPUT_FORMAT_REGEX_BUNDLE) {
        const index = scripts.findIndex(script => (
            script?.id === bundled.id
            || (script?.script_name || script?.scriptName) === bundled.script_name
        ));
        // 使用浅层克隆，避免角色卡接口修改内置常量。
        const next = {
            ...bundled,
            source: { ...bundled.source },
            destination: { ...bundled.destination },
            trim_strings: [...bundled.trim_strings],
        };
        if (index >= 0) scripts[index] = next;
        else scripts.push(next);
    }
    return scripts;
}

function buildCharacterRegexScripts(selectedArtifacts, existingScripts = [], includeOutputFormatBundle = false) {
    const htmlArtifact = selectedArtifacts.find(item => item.target.kind === 'character_regex_replace');
    const findArtifact = selectedArtifacts.find(item => item.target.kind === 'character_regex_find');
    if (!htmlArtifact && !findArtifact) {
        return includeOutputFormatBundle
            ? mergeOutputFormatRegexBundle(existingScripts)
            : (Array.isArray(existingScripts) ? existingScripts : []);
    }

    const scripts = includeOutputFormatBundle
        ? mergeOutputFormatRegexBundle(existingScripts)
        : (Array.isArray(existingScripts) ? [...existingScripts] : []);
    const scriptName = '🕹️显示状态栏';
    // 酒馆助手的角色卡接口使用公开的正则结构（snake_case），而不是
    // SillyTavern 存档内部的 scriptName / placement 等字段。
    const existingIndex = scripts.findIndex(script => (script?.script_name || script?.scriptName) === scriptName);
    const existing = existingIndex >= 0 ? scripts[existingIndex] : null;
    const replaceString = htmlArtifact?.content?.trim() || existing?.replace_string || existing?.replaceString || '';
    if (!replaceString) {
        throw new Error('已选择状态栏查找表达式，但没有可写入“替换为”的状态栏 HTML。请同时勾选“状态栏界面”。');
    }

    const regexScript = {
        id: existing?.id || createRegexId(),
        script_name: scriptName,
        enabled: true,
        find_regex: findArtifact?.content?.trim() || existing?.find_regex || existing?.findRegex || '<StatusPlaceHolderImpl/>',
        trim_strings: Array.isArray(existing?.trim_strings)
            ? existing.trim_strings
            : (Array.isArray(existing?.trimStrings) ? existing.trimStrings : []),
        replace_string: replaceString,
        source: {
            user_input: false,
            ai_output: true,
            slash_command: false,
            world_info: false,
            reasoning: false,
        },
        destination: {
            display: true,
            prompt: false,
        },
        run_on_edit: true,
        min_depth: existing?.min_depth ?? existing?.minDepth ?? null,
        max_depth: existing?.max_depth ?? existing?.maxDepth ?? null,
    };
    if (existingIndex >= 0) scripts[existingIndex] = regexScript;
    else scripts.push(regexScript);
    return scripts;
}

function extractOpeningMessageFromContent(response) {
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

function extractOpeningMessage() {
    return extractOpeningMessageFromContent(effectiveStepArtifacts(29));
}

function defaultOutputWorldbookName() {
    return `${project.name || '未命名世界'} · 世界书`;
}

function updateDeliveryCount() {
    const checkboxes = [...shell.querySelectorAll('#acs-delivery-list input[type="checkbox"]')];
    const selected = checkboxes.filter(input => input.checked).length;
    shell.querySelector('#acs-delivery-count').textContent = `${selected} / ${checkboxes.length} 项`;
    shell.querySelector('#acs-confirm-delivery').disabled = selected === 0;
}

function renderDeliveryReorgStatus() {
    const element = shell.querySelector('#acs-delivery-reorg-status');
    if (!element) return;
    const result = latestReorgPlanResult();
    element.className = 'acs-delivery-reorg-status';
    if (result.status === 'ready') {
        element.classList.add('is-active');
        element.textContent = `已有自动重组方案：发布时会校验 ${result.plan.mappings.length} 项映射，过期则自动重建`;
    } else if (result.status === 'invalid') {
        element.classList.add('is-warning');
        element.textContent = `现有自动重组方案无法解析，确认创建时将重新生成：${result.error}`;
    } else {
        element.textContent = '确认创建时将根据本次勾选的产物自动生成重组方案';
    }
}

function renderDeliveryArtifacts() {
    const list = shell.querySelector('#acs-delivery-list');
    list.replaceChildren();
    for (const artifact of deliveryArtifacts) {
        const item = document.createElement('label');
        item.className = `acs-delivery-item${artifact.accepted ? '' : ' is-draft'}`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = artifact.id;
        input.checked = artifact.accepted;
        input.addEventListener('change', updateDeliveryCount);
        const copy = document.createElement('span');
        copy.className = 'acs-delivery-item-copy';
        const name = document.createElement('strong');
        name.textContent = artifact.displayName;
        const destination = document.createElement('small');
        destination.textContent = `写入：${artifact.target.name}`;
        copy.append(name, destination);
        const meta = document.createElement('span');
        meta.className = 'acs-delivery-item-meta';
        meta.innerHTML = `<span>${artifact.accepted ? '已确认' : '草案'}</span><span>S${String(artifact.step).padStart(2, '0')}</span>`;
        item.append(input, copy, meta);
        list.append(item);
    }
    renderDeliveryReorgStatus();
    updateDeliveryCount();
}

function closeDeliveryDialog() {
    const overlay = shell?.querySelector('#acs-delivery-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    shell.querySelector('#acs-publish')?.focus({ preventScroll: true });
}

function selectDeliveryPreset(mode) {
    for (const input of shell.querySelectorAll('#acs-delivery-list input[type="checkbox"]')) {
        const artifact = deliveryArtifacts.find(item => item.id === input.value);
        input.checked = mode === 'all' || (mode === 'accepted' && artifact?.accepted);
    }
    updateDeliveryCount();
}

function publishProject() {
    if (!helper) {
        notify('error', '未检测到酒馆助手，无法写入角色卡。');
        return;
    }

    const characterName = shell.querySelector('#acs-character-name').value.trim();
    if (!characterName) {
        notify('warning', '请填写角色卡名称。');
        shell.querySelector('#acs-character-name').focus();
        return;
    }

    deliveryArtifacts = collectDeliveryArtifacts();
    if (!deliveryArtifacts.length) {
        notify('warning', '当前项目还没有可交付的正式产物。请先生成至少一个阶段产物。');
        return;
    }
    renderDeliveryArtifacts();
    const overlay = shell.querySelector('#acs-delivery-overlay');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('input[type="checkbox"]')?.focus({ preventScroll: true });
}

async function confirmProjectDelivery() {
    const characterName = shell.querySelector('#acs-character-name').value.trim();
    const worldbookName = shell.querySelector('#acs-output-worldbook').value.trim() || defaultOutputWorldbookName();
    const selectedIds = new Set([...shell.querySelectorAll('#acs-delivery-list input:checked')].map(input => input.value));
    const selectedArtifacts = deliveryArtifacts.filter(item => selectedIds.has(item.id));
    if (!selectedArtifacts.length) return;

    const hasOutputFormat = selectedArtifacts.some(item => item.step === 24 && item.tag === 'SYS_output_format');
    const includeOutputFormatBundle = hasOutputFormat && await showStudioConfirm({
        title: '导出配套正则？',
        message: '将 9 条输出格式正则载入角色卡局部正则。',
        confirmLabel: '载入正则',
        cancelLabel: '不载入',
    });

    const existingCharacters = helper.getCharacterNames?.() || [];
    const existingWorldbooks = helper.getWorldbookNames?.() || [];
    const overwritten = [];
    if (existingCharacters.includes(characterName)) overwritten.push(`角色卡“${characterName}”`);
    if (existingWorldbooks.includes(worldbookName)) overwritten.push(`世界书“${worldbookName}”`);
    const createMessage = overwritten.length
        ? `将更新${overwritten.join('和')}，是否继续？`
        : `将创建角色卡“${characterName}”和世界书“${worldbookName}”，是否继续？`;
    if (!await showStudioConfirm({
        title: overwritten.length ? '确认更新？' : '确认创建？',
        message: createMessage,
        confirmLabel: overwritten.length ? '确认更新' : '确认创建',
    })) return;

    const button = shell.querySelector('#acs-confirm-delivery');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> 正在自动重组';
    try {
        let worldbookBuild;
        try {
            worldbookBuild = await ensureDeliveryReorg(selectedArtifacts);
        } catch (error) {
            // 单独标记重组请求，避免用户把模型渠道错误误认为角色卡写入失败。
            console.error('[A.U.T.O Card Studio] 世界书重组请求失败', error);
            throw new Error(`世界书重组请求失败：${error?.message || error}`);
        }
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> 正在创建';
        let existing = {};
        if (existingCharacters.includes(characterName)) {
            existing = await helper.getCharacter(characterName);
        }
        const creatorNotes = [
            `由 A.U.T.O 角色卡创作台生成`,
            `项目: ${project.name}`,
            `更新时间: ${new Date().toLocaleString('zh-CN')}`,
            `本次交付: ${selectedArtifacts.map(item => item.displayName).join('、')}`,
            '发布自动重组: 已执行并通过完整性校验',
            '',
            project.brief,
        ].join('\n');
        const openingArtifact = selectedArtifacts.find(item => item.target.kind === 'opening');
        const existingExtensions = existing.extensions || existing.data?.extensions || {};
        // 在写入世界书之前先验证局部正则，避免正则不完整时产生半成品交付。
        const regexScripts = buildCharacterRegexScripts(
            selectedArtifacts,
            existingExtensions.regex_scripts,
            includeOutputFormatBundle,
        );
        await helper.createOrReplaceWorldbook(worldbookName, worldbookBuild.entries, { render: 'immediate' });
        const character = {
            ...existing,
            creator: project.preferences.creatorRole,
            creator_notes: creatorNotes,
            description: existing.description || `# ${project.name}\n\n${project.brief}`,
            first_messages: openingArtifact
                ? [extractOpeningMessageFromContent(openingArtifact.content)]
                : (existing.first_messages || [extractOpeningMessageFromContent('')]),
            worldbook: worldbookName,
            extensions: {
                ...existingExtensions,
                regex_scripts: regexScripts,
                tavern_helper: existingExtensions.tavern_helper || { scripts: [], variables: {} },
            },
        };
        await helper.createOrReplaceCharacter(characterName, character, { render: 'immediate' });

        project.output.characterName = characterName;
        project.output.worldbookName = worldbookName;
        saveProject();
        const importedRegex = selectedArtifacts.some(item => item.target.kind.startsWith('character_regex_'));
        const regexNote = importedRegex || includeOutputFormatBundle ? ' · 局部正则已写入' : '';
        shell.querySelector('#acs-publish-note').textContent = `已创建：${characterName} · ${worldbookName} · 自动重组已执行${regexNote}`;
        closeDeliveryDialog();
        notify('success', `角色卡与世界书已写入 SillyTavern，自动重组已执行${regexNote ? '，局部正则已写入' : ''}。`);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 发布失败', error);
        notify('error', `发布失败：${error?.message || error}`);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-feather-pointed" aria-hidden="true"></i>确认创建';
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
        `- 创作台独立预设：${environment.presetName || '未导入'}`,
        `- 创作台独立正则：${studioResources.regexes.filter(script => !script.disabled).length}/${studioResources.regexes.length} 已启用`,
        '- 世界书生成方式：发布时自动生成并校验重组方案',
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

async function importProjectJson(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
        if (isGenerating) throw new Error('请先停止当前生成，再导入项目。');
        if (file.size > 20 * 1024 * 1024) throw new Error('项目文件超过 20 MB，无法导入。');

        const imported = normalizeProject(JSON.parse(await file.text()));
        if (!imported) throw new Error('这不是有效的 A.U.T.O 创作台项目文件，或文件版本不受支持。');

        flushPendingProjectEdits();
        const existingIds = new Set(projectLibrary.projects.map(item => item.id));
        if (existingIds.has(imported.id)) imported.id = createDefaultProject().id;

        // 同名项目作为独立副本导入，不覆盖项目库里已有的内容。
        const existingNames = new Set(projectLibrary.projects.map(item => item.name));
        const baseName = imported.name || '导入的项目';
        let candidate = baseName;
        let suffix = 1;
        while (existingNames.has(candidate)) {
            candidate = `${baseName}（导入${suffix > 1 ? ` ${suffix}` : ''}）`;
            suffix += 1;
        }
        imported.name = candidate;
        imported.updatedAt = new Date().toISOString();
        project = imported;
        projectLibrary.projects.push(project);
        projectLibrary.activeProjectId = project.id;
        syncEnvironmentToProject();
        if (artifactPanelExpanded) toggleArtifactPanel(false);
        saveProject();
        renderEnvironmentSelectors();
        renderAll();
        toggleProjectMenu(false);
        notify('success', `已导入并切换到“${project.name}”。`);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 项目导入失败。', error);
        notify('error', error?.message || '项目导入失败，请检查文件内容。');
    } finally {
        input.value = '';
    }
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
    shell.classList.toggle('is-settings-view', name === 'settings');
}

function installMobileLayoutUI() {
    if (!shell.querySelector('#acs-mobile-scrim')) {
        const scrim = document.createElement('button');
        scrim.id = 'acs-mobile-scrim';
        scrim.className = 'acs-mobile-scrim';
        scrim.type = 'button';
        scrim.setAttribute('aria-label', '关闭侧栏');
        shell.querySelector('.acs-window').append(scrim);
    }

    if (!shell.querySelector('#acs-mobile-rail-toggle')) {
        const railHead = document.createElement('div');
        railHead.className = 'acs-mobile-rail-head';
        railHead.innerHTML = `
            <div class="acs-mobile-rail-heading">
                <span>Station map</span>
                <strong>创作流程 · 29 站</strong>
            </div>
            <button id="acs-mobile-rail-toggle" class="acs-mobile-rail-toggle" type="button" aria-expanded="false" title="展开完整步骤">
                <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                <span class="acs-mobile-rail-current">${String(project?.currentStep || 1).padStart(2, '0')}</span>
                <span class="acs-visually-hidden">展开完整步骤</span>
            </button>
        `;
        shell.querySelector('.acs-rail')?.prepend(railHead);
    }
}

function setMobilePanel(panel = null) {
    if (!shell) return;
    const flowOpen = panel === 'flow';
    const inspectorOpen = panel === 'inspector';
    const inspector = shell.querySelector('.acs-inspector');
    const inspectorButton = shell.querySelector('#acs-inspector-toggle');
    const flowButton = shell.querySelector('#acs-mobile-rail-toggle');

    shell.classList.toggle('is-mobile-flow-open', flowOpen);
    shell.classList.toggle('is-mobile-panel-open', flowOpen || inspectorOpen);
    if (!flowOpen) toggleProjectMenu(false);
    inspector?.classList.toggle('is-mobile-open', inspectorOpen);
    inspectorButton?.setAttribute('aria-expanded', String(inspectorOpen));
    if (inspectorButton) inspectorButton.title = inspectorOpen ? '关闭产物与设置' : '打开产物与设置';

    if (flowButton) {
        flowButton.setAttribute('aria-expanded', String(flowOpen));
        flowButton.title = flowOpen ? '收起完整步骤' : '展开完整步骤';
        const icon = flowButton.querySelector('i');
        if (icon) icon.className = flowOpen ? 'fa-solid fa-chevron-left' : 'fa-solid fa-list-check';
        const label = flowButton.querySelector('.acs-visually-hidden');
        if (label) label.textContent = flowOpen ? '收起完整步骤' : '展开完整步骤';
    }
}

function toggleMobileFlow() {
    if (!shell.classList.contains('acs-mobile-layout')) return;
    setMobilePanel(shell.classList.contains('is-mobile-flow-open') ? null : 'flow');
}

function toggleMobileInspector() {
    if (shell.classList.contains('acs-mobile-layout')) {
        const opened = !shell.querySelector('.acs-inspector').classList.contains('is-mobile-open');
        setMobilePanel(opened ? 'inspector' : null);
        return;
    }
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
        resourceDrawerOpen: shell.querySelector('#acs-resource-drawer')?.classList.contains('is-open') || false,
        mobileFlowOpen: shell.classList.contains('is-mobile-flow-open'),
        mobileInspectorOpen: inspector?.classList.contains('is-mobile-open') || false,
        artifactPanelExpanded,
        stepRailScrollTop: shell.querySelector('#acs-step-rail')?.scrollTop || 0,
        conversationScrollTop: shell.querySelector('.acs-conversation')?.scrollTop || 0,
        inspectorScrollTop: inspector?.scrollTop || 0,
    };
}

function setTourMobileInspector(open) {
    if (shell.classList.contains('acs-mobile-layout')) {
        setMobilePanel(open ? 'inspector' : null);
        return;
    }
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
    if (previous.inspectorTab === 'settings' && previous.resourceDrawerOpen) toggleResourceDrawer(true);
    if (shell.classList.contains('acs-mobile-layout')) {
        setMobilePanel(previous.mobileFlowOpen ? 'flow' : (previous.mobileInspectorOpen ? 'inspector' : null));
    } else {
        setTourMobileInspector(previous.mobileInspectorOpen);
    }
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

function ensureTourFlowVisible() {
    if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);
    else setTourMobileInspector(false);
}

function applyTourScene(step) {
    closePromptPreview();
    closeStyledSelects();
    if (step.scene !== 'projects') toggleProjectMenu(false);
    if (step.scene !== 'resource-drawer') toggleResourceDrawer(false);

    switch (step.scene) {
        case 'resources':
            ensureTourInspectorVisible();
            switchInspectorTab('settings');
            shell.querySelector('.acs-inspector').scrollTop = shell.querySelector('.acs-resource-import-card')?.offsetTop || 0;
            break;
        case 'resource-drawer':
            ensureTourInspectorVisible();
            switchInspectorTab('settings');
            toggleResourceDrawer(true);
            break;
        case 'projects':
            ensureTourFlowVisible();
            toggleProjectMenu(true);
            break;
        case 'brief':
            setTourMobileInspector(false);
            project.ui.overviewCollapsed = false;
            renderOverviewState();
            break;
        case 'route':
            ensureTourFlowVisible();
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
        case 'output':
            ensureTourFlowVisible();
            switchInspectorTab('structure');
            project.currentStep = 24;
            project.ui.overviewCollapsed = true;
            project.ui.collapsedPhases = PHASES.filter(phase => phase.id !== 'production').map(phase => phase.id);
            renderStepRail();
            renderCurrentStep();
            renderOverviewState();
            break;
        case 'autotask':
            ensureTourFlowVisible();
            switchInspectorTab('structure');
            project.currentStep = 25;
            project.ui.overviewCollapsed = true;
            project.ui.collapsedPhases = PHASES.filter(phase => phase.id !== 'autotask').map(phase => phase.id);
            renderStepRail();
            renderCurrentStep();
            renderOverviewState();
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

function syncMobileTourContent(card) {
    const actionBar = card?.querySelector('.acs-tour-actions');
    if (!card || !actionBar) return;
    const content = card.querySelector('#acs-tour-content');
    if (content) {
        // 早期测试版曾动态包裹引导内容；统一还原，避免手机浏览器在重排后丢失点击或滚动。
        while (content.firstChild) card.insertBefore(content.firstChild, actionBar);
        content.remove();
    }
}

function positionTourStep() {
    if (!tourActive || !shell?.isConnected) return;
    const card = shell.querySelector('#acs-tour-card');
    if (!card) return;
    if (shell.classList.contains('acs-mobile-layout')) {
        // 手机端不做聚光与跟随定位，避免将引导卡片推到可视区域外。
        card.style.removeProperty('left');
        card.style.removeProperty('top');
        return;
    }
    const step = TOUR_STEPS[tourStepIndex];
    const target = currentTourTarget(step);
    const spotlight = shell.querySelector('#acs-tour-spotlight');
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
    syncMobileTourContent(card);
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

    if (shell.classList.contains('acs-mobile-layout')) card.scrollTop = 0;

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
    const overlay = shell.querySelector('#acs-tour-overlay');
    try {
        flushPendingProjectEdits();
        tourRestoreState = captureTourWorkspace();
        // 手机端先收起抽屉，避免引导浮层被残留的侧栏状态干扰。
        if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);
        if (artifactPanelExpanded) toggleArtifactPanel(false);
        toggleProjectMenu(false);
        closeStyledSelects();
        tourStepIndex = 0;
        tourActive = true;
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        shell.classList.add('is-touring');
        renderTourStep();
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 打开新手引导失败', error);
        tourActive = false;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        shell.classList.remove('is-touring');
        restoreTourWorkspace();
        notify('error', `新手引导打开失败：${error?.message || error}`);
    }
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
    updateStudioViewportScale();
    if (!tourActive) return;
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    tourAnimationFrame = hostWindow.requestAnimationFrame(() => {
        positionTourStep();
        tourAnimationFrame = null;
    });
}

function installStepHelpUI() {
    const title = shell.querySelector('#acs-step-title');
    if (!title || shell.querySelector('#acs-step-help')) return;

    const titleLine = document.createElement('div');
    titleLine.className = 'acs-step-title-line';
    title.parentNode.insertBefore(titleLine, title);
    titleLine.append(title);

    const button = document.createElement('button');
    button.id = 'acs-step-help';
    button.className = 'acs-step-help-button';
    button.type = 'button';
    button.title = '查看当前步骤说明';
    button.setAttribute('aria-label', '查看当前步骤说明');
    button.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';
    titleLine.append(button);

    const clearButton = document.createElement('button');
    clearButton.id = 'acs-clear-step';
    clearButton.className = 'acs-clear-step-button';
    clearButton.type = 'button';
    clearButton.disabled = true;
    clearButton.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>清空对话</span>';
    shell.querySelector('.acs-stage-heading-actions').prepend(clearButton);

    const overlay = document.createElement('div');
    overlay.id = 'acs-step-help-overlay';
    overlay.className = 'acs-step-help-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="acs-step-help-dialog" role="dialog" aria-modal="true" aria-labelledby="acs-step-help-title">
        <header class="acs-step-help-head">
          <div>
            <p id="acs-step-help-kicker" class="acs-step-help-kicker"></p>
            <h2 id="acs-step-help-title"></h2>
            <small id="acs-step-help-stage"></small>
          </div>
          <button class="acs-step-help-close" type="button" data-step-help-close title="关闭说明" aria-label="关闭说明">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="acs-step-help-body">
          <p id="acs-step-help-purpose" class="acs-step-help-lead"></p>
          <section class="acs-step-help-section"><span>建议怎么做</span><p id="acs-step-help-workflow"></p></section>
          <section class="acs-step-help-section"><span>本步最终产物</span><p id="acs-step-help-deliverable"></p></section>
          <section class="acs-step-help-section is-caution"><span>教程提醒</span><p id="acs-step-help-caution"></p></section>
        </div>
      </section>`;
    shell.append(overlay);
}

function openStepHelp() {
    const step = STEPS[project.currentStep - 1];
    const note = STEP_TUTORIAL_NOTES[project.currentStep - 1];
    const overlay = shell.querySelector('#acs-step-help-overlay');
    if (!step || !note || !overlay) return;
    // 说明窗口在手机端独占当前视图，先关闭步骤／产物抽屉。
    if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);
    shell.querySelector('#acs-step-help-kicker').textContent = `STEP ${String(step.number).padStart(2, '0')} / ${STEPS.length}`;
    shell.querySelector('#acs-step-help-title').textContent = step.name;
    shell.querySelector('#acs-step-help-stage').textContent = `${note.stage} · ${step.goal}`;
    shell.querySelector('#acs-step-help-purpose').textContent = note.purpose;
    shell.querySelector('#acs-step-help-workflow').textContent = note.workflow;
    shell.querySelector('#acs-step-help-deliverable').textContent = note.deliverable;
    shell.querySelector('#acs-step-help-caution').textContent = note.caution;
    overlay.querySelector('.acs-step-help-dialog')?.scrollTo({ top: 0, behavior: 'auto' });
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('[data-step-help-close]')?.focus({ preventScroll: true });
}

function closeStepHelp() {
    const overlay = shell?.querySelector('#acs-step-help-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    shell.querySelector('#acs-step-help')?.focus({ preventScroll: true });
}

function installSettingsCollapsibles() {
    const settingsPanel = shell.querySelector('[data-acs-panel="settings"]');
    const connection = settingsPanel?.querySelector('.acs-connection-section');
    if (!settingsPanel || !connection || settingsPanel.querySelector('[data-settings-fold="connection"]')) return;

    const connectionHeading = connection.querySelector('.acs-settings-heading');
    const connectionBody = document.createElement('div');
    connectionBody.id = 'acs-connection-fold-body';
    connectionBody.className = 'acs-settings-fold-body';
    for (const child of [...connection.children]) {
        if (child !== connectionHeading) connectionBody.append(child);
    }
    const connectionToggle = document.createElement('button');
    connectionToggle.type = 'button';
    connectionToggle.className = 'acs-settings-fold-toggle';
    connectionToggle.dataset.settingsFold = 'connection';
    connectionToggle.setAttribute('aria-expanded', 'true');
    connectionToggle.setAttribute('aria-controls', connectionBody.id);
    const headingCopy = connectionHeading?.querySelector('div');
    const summary = connectionHeading?.querySelector('#acs-connection-summary');
    connectionToggle.innerHTML = '<span><strong>模型连接</strong><small>决定创作台从哪里调用 AI</small></span><span class="acs-settings-fold-meta"></span>';
    const meta = connectionToggle.querySelector('.acs-settings-fold-meta');
    if (summary) meta.append(summary);
    meta.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>');
    headingCopy?.remove();
    connectionHeading?.remove();
    connection.classList.add('acs-settings-fold');
    connection.append(connectionToggle, connectionBody);

    const flowLabel = settingsPanel.querySelector('.acs-settings-section-label');
    const flowFields = flowLabel?.nextElementSibling;
    if (flowLabel && flowFields?.classList.contains('acs-field-stack')) {
        const flow = document.createElement('section');
        flow.className = 'acs-settings-fold';
        const flowBody = document.createElement('div');
        flowBody.id = 'acs-workflow-fold-body';
        flowBody.className = 'acs-settings-fold-body';
        flowBody.append(flowFields);
        const flowToggle = document.createElement('button');
        flowToggle.type = 'button';
        flowToggle.className = 'acs-settings-fold-toggle';
        flowToggle.dataset.settingsFold = 'workflow';
        flowToggle.setAttribute('aria-expanded', 'true');
        flowToggle.setAttribute('aria-controls', flowBody.id);
        flowToggle.innerHTML = '<span><strong>创作流程</strong><small>管理预设、正则与生成偏好</small></span><span class="acs-settings-fold-meta"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>';
        flowLabel.replaceWith(flow);
        flow.append(flowToggle, flowBody);
    }

    settingsPanel.addEventListener('click', event => {
        const toggle = event.target.closest('[data-settings-fold]');
        if (!toggle) return;
        const body = shell.querySelector(`#${toggle.getAttribute('aria-controls')}`);
        const expanded = toggle.getAttribute('aria-expanded') !== 'false';
        toggle.setAttribute('aria-expanded', String(!expanded));
        if (body) body.hidden = expanded;
    });
}

function restoreResourceDockPosition() {
    const dock = shell.querySelector('#acs-resource-dock-tab');
    const windowElement = shell.querySelector('.acs-window');
    if (!dock || !windowElement) return;
    const stored = localStorage.getItem(RESOURCE_DOCK_POSITION_KEY);
    if (stored === null) return;
    const ratio = Number(stored);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) return;
    const minimumTop = 80;
    const available = Math.max(0, windowElement.clientHeight - dock.offsetHeight - minimumTop - 8);
    dock.style.top = `${minimumTop + available * ratio}px`;
}

function installResourceDockDrag() {
    const dock = shell.querySelector('#acs-resource-dock-tab');
    const windowElement = shell.querySelector('.acs-window');
    if (!dock || !windowElement || dock.dataset.dragReady) return;
    dock.dataset.dragReady = 'true';
    restoreResourceDockPosition();
    dock.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        const startY = event.clientY;
        const startTop = dock.offsetTop;
        resourceDockDragged = false;
        dock.classList.add('is-dragging');
        dock.setPointerCapture(event.pointerId);
        const move = moveEvent => {
            const delta = moveEvent.clientY - startY;
            if (Math.abs(delta) > 4) resourceDockDragged = true;
            const minimumTop = 80;
            const maxTop = Math.max(minimumTop, windowElement.clientHeight - dock.offsetHeight - 8);
            const nextTop = Math.max(minimumTop, Math.min(maxTop, startTop + delta));
            dock.style.top = `${nextTop}px`;
        };
        const finish = finishEvent => {
            dock.removeEventListener('pointermove', move);
            dock.removeEventListener('pointerup', finish);
            dock.removeEventListener('pointercancel', finish);
            dock.classList.remove('is-dragging');
            if (dock.hasPointerCapture(finishEvent.pointerId)) dock.releasePointerCapture(finishEvent.pointerId);
            const minimumTop = 80;
            const available = Math.max(1, windowElement.clientHeight - dock.offsetHeight - minimumTop - 8);
            const ratio = Math.max(0, Math.min(1, (dock.offsetTop - minimumTop) / available));
            localStorage.setItem(RESOURCE_DOCK_POSITION_KEY, String(ratio));
        };
        dock.addEventListener('pointermove', move);
        dock.addEventListener('pointerup', finish);
        dock.addEventListener('pointercancel', finish);
    });
}

function installResourceManagerUI() {
    const presetCard = shell.querySelector('#acs-preset-lock');
    if (!presetCard || shell.querySelector('#acs-resource-drawer')) return;
    const briefCount = shell.querySelector('#acs-brief-panel .acs-section-label span:last-child');
    if (briefCount) briefCount.textContent = `贯穿全部 ${STEPS.length} 个阶段`;
    const publishNote = shell.querySelector('#acs-publish-note');
    if (publishNote) publishNote.textContent = `建议至少完成 Step 1、Step 5 与 Step ${STEPS.length} 后发布。`;
    const generationHint = shell.querySelector('#acs-generation-hint');
    if (generationHint) generationHint.textContent = '将使用创作台独立预设、独立正则与当前步骤';
    presetCard.querySelector('.acs-fixed-resource-icon i').className = 'fa-solid fa-file-import';
    presetCard.querySelector('.acs-fixed-resource-copy > span').textContent = '创作台独立预设';
    const presetImport = document.createElement('button');
    presetImport.id = 'acs-import-preset-button';
    presetImport.className = 'acs-button acs-button-compact';
    presetImport.type = 'button';
    presetImport.innerHTML = '<i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i> 导入 / 替换预设';
    presetImport.style.gridColumn = '1 / -1';
    presetCard.append(presetImport);

    const worldbookSelect = shell.querySelector('#acs-worldbook-select');
    if (worldbookSelect?.closest('label')) worldbookSelect.closest('label').hidden = true;

    const regexCard = document.createElement('div');
    regexCard.className = 'acs-resource-import-card';
    regexCard.innerHTML = `
      <div class="acs-resource-import-head"><strong>创作台独立正则</strong><small id="acs-regex-summary">尚未导入</small></div>
      <p class="acs-security-note" style="margin:0">只处理创作台对话；不会读取 SillyTavern 的全局、预设或角色正则。</p>
      <div class="acs-resource-import-actions">
        <button id="acs-import-regex-button" class="acs-button acs-button-compact" type="button"><i class="fa-solid fa-file-arrow-up"></i> 导入 / 替换</button>
        <button id="acs-open-resource-drawer-inline" class="acs-button acs-button-compact" type="button"><i class="fa-solid fa-sliders"></i> 管理条目</button>
      </div>`;
    presetCard.after(regexCard);

    const presetInput = document.createElement('input');
    presetInput.id = 'acs-import-preset-file';
    presetInput.type = 'file';
    presetInput.accept = 'application/json,.json';
    presetInput.hidden = true;
    const regexInput = presetInput.cloneNode();
    regexInput.id = 'acs-import-regex-file';
    shell.append(presetInput, regexInput);

    const dock = document.createElement('button');
    dock.id = 'acs-resource-dock-tab';
    dock.className = 'acs-resource-dock-tab';
    dock.type = 'button';
    dock.textContent = '预设 / 正则';
    dock.title = '管理独立预设与正则条目';
    shell.querySelector('.acs-window').append(dock);
    installResourceDockDrag();

    const drawer = document.createElement('aside');
    drawer.id = 'acs-resource-drawer';
    drawer.className = 'acs-resource-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <header class="acs-resource-drawer-head"><div><p>LOCAL RESOURCES</p><h2>预设与正则条目</h2></div><button class="acs-resource-drawer-close" type="button" data-resource-drawer-close aria-label="关闭"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="acs-resource-drawer-tabs"><button class="acs-resource-drawer-tab is-active" type="button" data-resource-kind="prompts">预设条目</button><button class="acs-resource-drawer-tab" type="button" data-resource-kind="regexes">正则条目</button></div>
      <div id="acs-resource-list" class="acs-resource-list"></div>`;
    const drawerScrim = document.createElement('button');
    drawerScrim.id = 'acs-resource-drawer-scrim';
    drawerScrim.className = 'acs-resource-drawer-scrim';
    drawerScrim.type = 'button';
    drawerScrim.hidden = true;
    drawerScrim.setAttribute('aria-label', '关闭预设与正则条目侧栏');
    shell.querySelector('.acs-window').append(drawerScrim, drawer);

    const editor = document.createElement('div');
    editor.id = 'acs-resource-editor-overlay';
    editor.className = 'acs-resource-editor-overlay';
    editor.hidden = true;
    editor.setAttribute('aria-hidden', 'true');
    editor.innerHTML = `
      <section class="acs-resource-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="acs-resource-editor-title">
        <header class="acs-resource-editor-head">
          <div><p>PRESET ENTRY</p><h2 id="acs-resource-editor-title">编辑预设条目</h2></div>
          <button class="acs-resource-editor-close" type="button" data-resource-editor-close aria-label="关闭编辑窗口"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="acs-resource-editor-body">
          <textarea id="acs-resource-editor-content" spellcheck="false" aria-label="预设条目内容"></textarea>
        </div>
        <footer class="acs-resource-editor-actions">
          <button class="acs-button" type="button" data-resource-editor-close>取消</button>
          <button id="acs-save-resource-entry" class="acs-button acs-button-publish" type="button"><i class="fa-solid fa-floppy-disk"></i>保存条目</button>
        </footer>
      </section>`;
    shell.append(editor);

    const updateOverlay = document.createElement('div');
    updateOverlay.id = 'acs-update-notes-overlay';
    updateOverlay.className = 'acs-update-notes-overlay';
    updateOverlay.hidden = true;
    updateOverlay.setAttribute('aria-hidden', 'true');
    updateOverlay.innerHTML = `
      <section class="acs-update-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="acs-update-notes-title">
        <header class="acs-update-notes-head">
          <div><p>UPDATE MANIFEST</p><h2 id="acs-update-notes-title">本次更新内容</h2><span id="acs-update-notes-summary" class="acs-update-notes-summary"></span></div>
          <button class="acs-update-notes-close" type="button" data-update-result="false" aria-label="暂不更新"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div id="acs-update-notes-list" class="acs-update-notes-list"></div>
        <footer class="acs-update-notes-actions">
          <button class="acs-button" type="button" data-update-result="false">暂不更新</button>
          <button class="acs-button acs-button-publish" type="button" data-update-result="true"><i class="fa-solid fa-arrow-up-right-dots"></i>立即更新</button>
        </footer>
      </section>`;
    shell.append(updateOverlay);
    installSettingsCollapsibles();
}

function toggleResourceDrawer(force) {
    const drawer = shell.querySelector('#acs-resource-drawer');
    const open = typeof force === 'boolean' ? force : !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    const scrim = shell.querySelector('#acs-resource-drawer-scrim');
    if (scrim) scrim.hidden = !open;
    if (open) renderResourceDrawer();
}

function renderResourceDrawer(kind = shell?.querySelector('.acs-resource-drawer-tab.is-active')?.dataset.resourceKind || 'prompts') {
    if (!shell?.querySelector('#acs-resource-list')) return;
    for (const tab of shell.querySelectorAll('.acs-resource-drawer-tab')) tab.classList.toggle('is-active', tab.dataset.resourceKind === kind);
    const list = shell.querySelector('#acs-resource-list');
    list.replaceChildren();
    const items = kind === 'prompts'
        ? (studioResources.preset?.prompts || []).filter(prompt => !ALL_PRESET_STEP_PROMPT_IDS.has(prompt.id) && !PLACEHOLDER_IDS.has(prompt.id))
        : studioResources.regexes;
    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'acs-resource-empty';
        empty.textContent = kind === 'prompts' ? '导入 A.U.T.O 预设后，这里会显示步骤之外的预设条目。' : '导入所需正则后，可以在这里逐项启用或停用。';
        list.append(empty);
        return;
    }
    for (const item of items) {
        const row = document.createElement('div');
        row.className = 'acs-resource-item';
        if (kind === 'prompts') {
            row.classList.add('is-editable');
            row.classList.toggle('is-empty', !item.content.trim());
            row.dataset.presetEntryId = item.id;
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `查看并编辑预设条目：${item.name}`);
        }
        const copy = document.createElement('div');
        copy.className = 'acs-resource-item-copy';
        const name = document.createElement('strong');
        name.textContent = kind === 'prompts' ? item.name : item.scriptName;
        const meta = document.createElement('small');
        meta.textContent = kind === 'prompts'
            ? (item.content.trim()
                ? `${String(item.role || 'system').toUpperCase()} · ≈${estimateTokenCount(item.content)} tokens`
                : `${String(item.role || 'system').toUpperCase()} · 空条目`)
            : `${item.findRegex || '无查找表达式'}`;
        copy.append(name, meta);
        const label = document.createElement('label');
        label.className = 'acs-resource-switch';
        label.addEventListener('click', event => event.stopPropagation());
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = kind === 'prompts' ? item.enabled !== false : !item.disabled;
        input.addEventListener('change', async () => {
            if (kind === 'prompts') {
                item.enabled = input.checked;
                await writeResourceRecord('preset', studioResources.preset);
            } else {
                item.disabled = !input.checked;
                await writeResourceRecord('regexes', studioResources.regexes);
                // 正则开关也立即作用于已经生成的对话预览。
                renderCurrentStep();
            }
        });
        label.append(input, document.createElement('span'));
        row.append(copy, label);
        list.append(row);
    }
}

function openResourceEditor(promptId) {
    const prompt = (studioResources.preset?.prompts || []).find(item => String(item.id) === String(promptId));
    const overlay = shell?.querySelector('#acs-resource-editor-overlay');
    if (!prompt || !overlay) return;
    resourceEditorPrompt = prompt;
    overlay.querySelector('#acs-resource-editor-title').textContent = prompt.name || '未命名预设条目';
    overlay.querySelector('#acs-resource-editor-content').value = prompt.content || '';
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('#acs-resource-editor-content')?.focus({ preventScroll: true });
}

function closeResourceEditor() {
    const overlay = shell?.querySelector('#acs-resource-editor-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    resourceEditorPrompt = null;
}

async function saveResourceEditor() {
    if (!resourceEditorPrompt) return;
    const content = shell.querySelector('#acs-resource-editor-content').value;
    resourceEditorPrompt.content = content;
    await writeResourceRecord('preset', studioResources.preset);
    closeResourceEditor();
    renderResourceDrawer('prompts');
    renderCurrentStep();
    notify('success', '预设条目已保存。');
}

async function importPresetFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
        if (file.size > 20 * 1024 * 1024) throw new Error('预设文件超过 20 MB。');
        const rawPreset = JSON.parse(await file.text());
        const preset = normalizeImportedPreset(rawPreset, file.name);
        const embeddedRegexSource = rawPreset?.extensions?.regex_scripts;
        const embeddedRegexes = Array.isArray(embeddedRegexSource) && embeddedRegexSource.length
            ? normalizeImportedRegexes(embeddedRegexSource)
            : null;
        await writeResourceRecord('preset', preset);
        // SoliUmbra 等工具写入预设 JSON 的内置正则随预设一起同步；
        // 没有内置正则的预设则不覆盖用户此前单独导入的正则。
        if (embeddedRegexes) await writeResourceRecord('regexes', embeddedRegexes);
        studioResources.preset = preset;
        if (embeddedRegexes) studioResources.regexes = embeddedRegexes;
        if (!connectionSettings.modelParametersCustomized) {
            connectionSettings.modelParameters = presetDefaultModelParameters(preset);
            saveConnectionSettings();
        }
        environment.presetName = preset.name;
        renderEnvironmentSelectors();
        renderResourceDrawer('prompts');
        renderCurrentStep();
        const regexCopy = embeddedRegexes ? `，并同步导入 ${embeddedRegexes.length} 条内置正则` : '';
        notify('success', `已导入“${preset.name}”，识别到 ${STEPS.length} 个创作步骤${regexCopy}。`);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 预设导入失败', error);
        notify('error', `预设导入失败：${error?.message || error}`);
    } finally {
        input.value = '';
    }
}

async function importRegexFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
        if (file.size > 20 * 1024 * 1024) throw new Error('正则文件超过 20 MB。');
        const regexes = normalizeImportedRegexes(JSON.parse(await file.text()));
        await writeResourceRecord('regexes', regexes);
        studioResources.regexes = regexes;
        renderEnvironmentSelectors();
        renderResourceDrawer('regexes');
        notify('success', `已导入 ${regexes.length} 条独立正则。`);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 正则导入失败', error);
        notify('error', `正则导入失败：${error?.message || error}`);
    } finally {
        input.value = '';
    }
}

function bindStudioEvents() {
    for (const close of shell.querySelectorAll('[data-acs-close]')) close.addEventListener('click', closeStudio);
    shell.addEventListener('pointerdown', event => {
        const drawer = shell.querySelector('#acs-resource-drawer');
        if (!drawer?.classList.contains('is-open')) return;
        // 编辑窗口覆盖在条目列表之上时，列表保持展开，方便保存后继续切换条目。
        if (!shell.querySelector('#acs-resource-editor-overlay')?.hidden) return;
        if (event.target.closest('#acs-resource-drawer, #acs-resource-dock-tab, #acs-open-resource-drawer-inline')) return;
        toggleResourceDrawer(false);
    });
    shell.querySelector('#acs-step-rail').addEventListener('click', event => {
        const phaseToggle = event.target.closest('[data-phase-toggle]');
        if (phaseToggle) {
            togglePhase(phaseToggle.dataset.phaseToggle);
            return;
        }
        const button = event.target.closest('[data-step]');
        if (button) {
            selectStep(Number(button.dataset.step));
            if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);
        }
    });
    shell.querySelector('#acs-toggle-overview').addEventListener('click', toggleOverview);
    const stageHeading = shell.querySelector('.acs-stage-heading');
    stageHeading.setAttribute('role', 'button');
    stageHeading.setAttribute('tabindex', '0');
    stageHeading.setAttribute('aria-controls', 'acs-brief-panel');
    stageHeading.addEventListener('click', event => {
        if (!event.target.closest('button')) toggleOverview();
    });
    stageHeading.addEventListener('keydown', event => {
        if (event.target !== stageHeading || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        toggleOverview();
    });
    shell.querySelector('#acs-turns').addEventListener('click', event => {
        const retry = event.target.closest('[data-retry-turn]');
        if (retry) retryLatestUserInput(Number(retry.dataset.retryTurn));
    });
    shell.querySelector('#acs-latest-turn-top').addEventListener('click', () => scrollToLatestTurn('top'));
    shell.querySelector('#acs-latest-turn-bottom').addEventListener('click', () => scrollToLatestTurn('bottom'));
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
    shell.querySelector('#acs-confirm-delivery').addEventListener('click', confirmProjectDelivery);
    for (const close of shell.querySelectorAll('[data-delivery-close]')) close.addEventListener('click', closeDeliveryDialog);
    for (const preset of shell.querySelectorAll('[data-delivery-select]')) {
        preset.addEventListener('click', () => selectDeliveryPreset(preset.dataset.deliverySelect));
    }
    shell.querySelector('#acs-delivery-overlay').addEventListener('click', event => {
        if (event.target === event.currentTarget) closeDeliveryDialog();
    });
    shell.querySelector('#acs-confirm-overlay').addEventListener('click', event => {
        const result = event.target.closest('[data-confirm-result]');
        if (result) closeStudioConfirm(result.dataset.confirmResult === 'true');
        else if (event.target === event.currentTarget) closeStudioConfirm(false);
    });
    shell.querySelector('#acs-confirm-overlay').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeStudioConfirm(false);
    });
    shell.querySelector('#acs-download-dossier').addEventListener('click', downloadDossier);
    shell.querySelector('#acs-save-project').addEventListener('click', exportProjectJson);
    shell.querySelector('#acs-import-project-button').addEventListener('click', () => {
        shell.querySelector('#acs-import-project').click();
    });
    shell.querySelector('#acs-import-project').addEventListener('change', importProjectJson);
    shell.querySelector('#acs-check-update').addEventListener('click', checkForUpdatesManually);
    shell.querySelector('#acs-tour-launch').addEventListener('click', startTour);
    shell.querySelector('#acs-tour-skip').addEventListener('click', () => closeTour(false));
    shell.querySelector('#acs-tour-previous').addEventListener('click', () => moveTour(-1));
    shell.querySelector('#acs-tour-next').addEventListener('click', () => moveTour(1));
    shell.querySelector('#acs-tour-overlay').addEventListener('keydown', handleTourKeydown);
    shell.querySelector('#acs-step-help').addEventListener('click', openStepHelp);
    shell.querySelector('#acs-clear-step').addEventListener('click', clearCurrentStepConversation);
    shell.querySelector('#acs-step-help-overlay').addEventListener('click', event => {
        if (event.target === event.currentTarget) closeStepHelp();
    });
    shell.querySelector('#acs-step-help-overlay').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeStepHelp();
    });
    shell.querySelector('[data-step-help-close]').addEventListener('click', closeStepHelp);
    shell.querySelector('#acs-import-preset-button').addEventListener('click', () => shell.querySelector('#acs-import-preset-file').click());
    shell.querySelector('#acs-import-regex-button').addEventListener('click', () => shell.querySelector('#acs-import-regex-file').click());
    shell.querySelector('#acs-import-preset-file').addEventListener('change', importPresetFile);
    shell.querySelector('#acs-import-regex-file').addEventListener('change', importRegexFile);
    shell.querySelector('#acs-resource-dock-tab').addEventListener('click', event => {
        if (resourceDockDragged) {
            event.preventDefault();
            resourceDockDragged = false;
            return;
        }
        toggleResourceDrawer();
    });
    shell.querySelector('#acs-open-resource-drawer-inline').addEventListener('click', () => toggleResourceDrawer(true));
    shell.querySelector('[data-resource-drawer-close]').addEventListener('click', () => toggleResourceDrawer(false));
    shell.querySelector('#acs-resource-drawer-scrim').addEventListener('click', () => toggleResourceDrawer(false));
    for (const tab of shell.querySelectorAll('.acs-resource-drawer-tab')) tab.addEventListener('click', () => renderResourceDrawer(tab.dataset.resourceKind));
    shell.querySelector('#acs-resource-list').addEventListener('click', event => {
        const row = event.target.closest('[data-preset-entry-id]');
        if (row && !event.target.closest('.acs-resource-switch')) openResourceEditor(row.dataset.presetEntryId);
    });
    shell.querySelector('#acs-resource-list').addEventListener('keydown', event => {
        const row = event.target.closest('[data-preset-entry-id]');
        if (row && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openResourceEditor(row.dataset.presetEntryId);
        }
    });
    shell.querySelector('#acs-resource-editor-overlay').addEventListener('click', event => {
        if (event.target === event.currentTarget || event.target.closest('[data-resource-editor-close]')) closeResourceEditor();
    });
    shell.querySelector('#acs-resource-editor-overlay').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeResourceEditor();
    });
    shell.querySelector('#acs-save-resource-entry').addEventListener('click', () => { void saveResourceEditor(); });
    shell.querySelector('#acs-update-notes-overlay').addEventListener('click', event => {
        const result = event.target.closest('[data-update-result]');
        if (result) closeUpdateNotes(result.dataset.updateResult === 'true');
    });
    shell.querySelector('#acs-update-notes-overlay').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeUpdateNotes(false);
    });
    shell.querySelector('#acs-mobile-rail-toggle').addEventListener('click', toggleMobileFlow);
    shell.querySelector('#acs-inspector-toggle').addEventListener('click', toggleMobileInspector);
    shell.querySelector('#acs-mobile-scrim').addEventListener('click', () => setMobilePanel(null));
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
            if (shell.classList.contains('acs-mobile-layout')) setMobilePanel(null);
            return;
        }
        if (event.target.closest('#acs-project-menu-new')) newProject();
    });
    shell.addEventListener('click', event => {
        if (!event.target.closest('.acs-project-identity')) toggleProjectMenu(false);
        if (!event.target.closest('.acs-styled-select')) closeStyledSelects();
        if (!event.target.closest('.acs-model-combobox')) toggleCustomModelOptions(false);
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
        const summary = event.target.closest('summary');
        if (summary?.parentElement?.classList.contains('acs-artifact')) {
            // 明确接管展开行为，避免独立滚动容器中浏览器原生 details 点击失效。
            event.preventDefault();
            toggleArtifactDetails(summary);
            return;
        }
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
        if (copyButton) {
            copyArtifact(copyButton);
            return;
        }
        const deleteButton = event.target.closest('[data-delete-artifact]');
        if (deleteButton) deleteArtifact(deleteButton);
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
        connectionSettings.apiKey = customApiKey;
        saveConnectionSettings();
    });
    shell.querySelector('#acs-custom-model').addEventListener('input', event => {
        connectionSettings.model = event.target.value;
        saveConnectionSettings();
        shell.querySelector('#acs-connection-summary').textContent = event.target.value.trim() || '等待配置';
        if (shell.querySelector('.acs-model-combobox')?.classList.contains('is-open')) {
            renderCustomModelOptions(event.target.value);
        }
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

// 创作台为固定全屏层；直接锁定根节点，避免宿主页面横向溢出露出滚动条。
function setStudioPageScrollLock(locked) {
    const targets = [document.documentElement, document.body];
    if (locked) {
        if (!studioScrollLockState) {
            studioScrollLockState = targets.map(target => ({
                target,
                overflow: target.style.getPropertyValue('overflow'),
                overflowPriority: target.style.getPropertyPriority('overflow'),
                overflowX: target.style.getPropertyValue('overflow-x'),
                overflowXPriority: target.style.getPropertyPriority('overflow-x'),
                overflowY: target.style.getPropertyValue('overflow-y'),
                overflowYPriority: target.style.getPropertyPriority('overflow-y'),
            }));
        }
        for (const target of targets) {
            target.classList.add('acs-no-scroll');
            target.style.setProperty('overflow', 'hidden', 'important');
            target.style.setProperty('overflow-x', 'hidden', 'important');
            target.style.setProperty('overflow-y', 'hidden', 'important');
        }
        return;
    }

    for (const target of targets) target.classList.remove('acs-no-scroll');
    for (const state of studioScrollLockState || []) {
        state.target.style.setProperty('overflow', state.overflow, state.overflowPriority);
        state.target.style.setProperty('overflow-x', state.overflowX, state.overflowXPriority);
        state.target.style.setProperty('overflow-y', state.overflowY, state.overflowYPriority);
    }
    studioScrollLockState = null;
}

function ensureStudioStyle() {
    if (document.querySelector(`#${SCRIPT_STYLE_ID}`)) return;
    const style = document.createElement('style');
    style.id = SCRIPT_STYLE_ID;
    style.textContent = `${STUDIO_CSS}\n${HTML_PREVIEW_CSS}\n${OUTPUT_MODE_CSS}\n${MODEL_PICKER_CSS}\n${CONVERSATION_NAV_CSS}\n${PROJECT_LIBRARY_CSS}\n${ARTIFACT_HISTORY_CSS}\n${PROMPT_INSPECTOR_CSS}\n${INTERACTIVE_TOUR_CSS}\n${STEP_HELP_CSS}\n${RESOURCE_MANAGER_CSS}\n${DELIVERY_DIALOG_CSS}\n${CONFIRM_DIALOG_CSS}\n${MOBILE_ADAPTATION_CSS}\n${COMPACT_STAGE_HEADER_CSS}\n${CONNECTION_PROFILE_CSS}`;
    document.head.append(style);
}

async function ensureStudioLoaded() {
    if (shell?.isConnected) return;

    const existing = document.querySelector('#auto-card-studio');
    if (existing && existing.dataset.acsRuntime !== SCRIPT_RUNTIME_MARK) {
        // 删除旧插件留在当前页面中的隐藏界面，脚本版随后接管。
        existing.remove();
        document.querySelector('#auto-card-studio-launch')?.remove();
        setStudioPageScrollLock(false);
    }

    ensureStudioStyle();
    const container = document.createElement('div');
    container.innerHTML = STUDIO_HTML;
    shell = container.querySelector('#auto-card-studio');
    shell.dataset.acsRuntime = SCRIPT_RUNTIME_MARK;
    document.body.append(shell);
    installStepHelpUI();
    installResourceManagerUI();
    installProjectLibraryUI();
    installStudioToolsUI();
    installConversationNavigation();
    installDeliveryUI();
    installMobileLayoutUI();
    installConnectionProfileUI();
    installStyledSelects();
    installCustomModelPicker();
    updateStudioViewportScale();
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
        setStudioPageScrollLock(true);
        updateStudioViewportScale();
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
        setStudioPageScrollLock(true);
        updateStudioViewportScale();
        renderAll();
        const initialFocus = project.ui.overviewCollapsed
            ? shell.querySelector('#acs-user-input')
            : shell.querySelector('#acs-project-brief');
        initialFocus.focus();
        hostWindow.setTimeout(() => { void maybeOfferAutomaticUpdate(); }, 0);
    } catch (error) {
        console.error('[A.U.T.O Card Studio] 打开失败', error);
        showStudioRuntimeError(error);
        notify('error', `无法打开创作台：${error?.message || error}`);
    }
}

function requestOpenStudio() {
    if (!studioOpenPromise) {
        studioOpenPromise = openStudio().finally(() => {
            studioOpenPromise = null;
        });
    }
    return studioOpenPromise;
}

function closeStudio() {
    if (!shell || isGenerating) {
        if (isGenerating) notify('warning', '请先停止当前生成，再关闭创作台。');
        return;
    }
    if (tourActive) closeTour(false);
    closePromptPreview();
    closeStepHelp();
    closeResourceEditor();
    closeUpdateNotes(false);
    toggleResourceDrawer(false);
    if (artifactPanelExpanded) toggleArtifactPanel(false);
    toggleProjectMenu(false);
    closeStyledSelects();
    toggleCustomModelOptions(false);
    setMobilePanel(null);
    shell.classList.remove('is-open');
    shell.setAttribute('aria-hidden', 'true');
    setStudioPageScrollLock(false);
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
    if (shell.querySelector('.acs-model-combobox.is-open')) {
        toggleCustomModelOptions(false);
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
    if (shell.classList.contains('is-mobile-panel-open')) {
        setMobilePanel(null);
        return;
    }
    closeStudio();
}

function cleanupScriptRuntime() {
    document.removeEventListener('keydown', handleHostKeydown);
    hostWindow.removeEventListener('resize', handleTourResize);
    hostWindow.visualViewport?.removeEventListener('resize', handleTourResize);
    if (launcherInstallTimer) hostWindow.clearInterval(launcherInstallTimer);
    if (projectMenuCloseTimer) hostWindow.clearTimeout(projectMenuCloseTimer);
    if (updateFeedbackTimer) hostWindow.clearTimeout(updateFeedbackTimer);
    if (tourAnimationFrame) hostWindow.cancelAnimationFrame(tourAnimationFrame);
    if (tourSceneTimer) hostWindow.clearTimeout(tourSceneTimer);
    document.querySelector('#auto-card-studio-wand-launcher')?.remove();
    setStudioPageScrollLock(false);
    if (shell?.dataset.acsRuntime === SCRIPT_RUNTIME_MARK) shell.remove();
    document.querySelector(`#${SCRIPT_STYLE_ID}`)?.remove();
    shell = null;
}

const TOOLBAR_LAUNCHER_NAME = '🔨';
const LEGACY_TOOLBAR_LAUNCHER_NAME = '打开 A.U.T.O 创作台';
const OPEN_HANDLER_KEY = '__autoCardStudioOpenHandler';

function migrateToolbarLauncherName() {
    try {
        const buttons = getScriptButtons();
        const migrated = [];
        for (const button of buttons) {
            const next = button.name === LEGACY_TOOLBAR_LAUNCHER_NAME
                ? { ...button, name: TOOLBAR_LAUNCHER_NAME }
                : button;
            if (!migrated.some(item => item.name === next.name)) migrated.push(next);
        }
        if (!migrated.some(button => button.name === TOOLBAR_LAUNCHER_NAME)) {
            migrated.push({ name: TOOLBAR_LAUNCHER_NAME, visible: true });
        }
        replaceScriptButtons(migrated);
    } catch (error) {
        // 兼容尚未提供按钮配置接口的旧版酒馆助手。
        console.warn('[A.U.T.O Card Studio] 工具栏按钮名称迁移失败', error);
        appendInexistentScriptButtons([{ name: TOOLBAR_LAUNCHER_NAME, visible: true }]);
    }
}

function installToolbarLauncher() {
    const buttons = Array.from(document.querySelectorAll('.qr--button'));
    const button = buttons.find(item =>
        item.dataset.autoCardStudioLauncher === 'true'
        || item.textContent?.trim() === TOOLBAR_LAUNCHER_NAME
        || item.textContent?.trim() === LEGACY_TOOLBAR_LAUNCHER_NAME,
    );
    if (!button) return false;

    button.dataset.autoCardStudioLauncher = 'true';
    button.title = '打开 A.U.T.O 角色卡创作台';
    button.setAttribute('aria-label', '打开 A.U.T.O 角色卡创作台');
    if (button.dataset.autoCardStudioDirectBound !== 'true') {
        button.dataset.autoCardStudioDirectBound = 'true';
        button.addEventListener('click', () => hostWindow[OPEN_HANDLER_KEY]?.());
    }
    // 按钮配置本身就是图标字符；这里不再等脚本加载后替换文字内容。
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
        item.addEventListener('click', () => hostWindow[OPEN_HANDLER_KEY]?.());
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

function studioVersionLabel() {
    if (!TEST_BRANCH_UPDATE_MODE) return `v${AUTO_CARD_STUDIO_VERSION}`;
    const pinnedRevision = String(localStorage.getItem(TEST_BRANCH_PIN_KEY) || '').trim();
    const revisionLabel = /^[0-9a-f]{40}$/i.test(pinnedRevision) ? ` · ${pinnedRevision.slice(0, 7)}` : '';
    return `v${AUTO_CARD_STUDIO_VERSION} · ${TEST_BRANCH_BUILD_LABEL}${revisionLabel}`;
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

async function fetchUpdateManifest(ref) {
    const response = await hostWindow.fetch(UPDATE_NOTES_URL_BY_REF(ref), { cache: 'no-store' });
    if (!response.ok) throw new Error(`更新说明请求失败：HTTP ${response.status}`);
    const manifest = await response.json();
    if (!manifest || typeof manifest !== 'object') throw new Error('更新说明格式无效');
    return manifest;
}

function normalizeManifestEntry(entry, fallbackLabel) {
    return {
        label: String(entry?.label || entry?.version || fallbackLabel),
        title: String(entry?.title || '版本更新'),
        changes: Array.isArray(entry?.changes) ? entry.changes.map(String).filter(Boolean) : [],
    };
}

async function collectTestUpdateEntries(currentRevision, targetRevision) {
    try {
        const manifest = await fetchUpdateManifest(targetRevision);
        const builds = Array.isArray(manifest.testBuilds) ? manifest.testBuilds : [];
        const currentIndex = builds.findIndex(entry => entry?.label === TEST_BRANCH_BUILD_LABEL);
        const selected = currentIndex >= 0 ? builds.slice(currentIndex + 1) : builds.slice(-1);
        if (selected.length) return selected.map(entry => normalizeManifestEntry(entry, targetRevision.slice(0, 7)));
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 测试版更新说明读取失败，尝试读取提交记录。', error);
    }

    if (/^[0-9a-f]{40}$/i.test(currentRevision) && /^[0-9a-f]{40}$/i.test(targetRevision)) {
        try {
            const response = await hostWindow.fetch(TEST_BRANCH_COMPARE_URL(currentRevision, targetRevision), {
                cache: 'no-store',
                headers: { Accept: 'application/vnd.github+json' },
            });
            if (response.ok) {
                const commits = (await response.json())?.commits || [];
                return commits.map(commit => {
                    const lines = String(commit?.commit?.message || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
                    return {
                        label: `测试构建 ${String(commit?.sha || '').slice(0, 7)}`,
                        title: lines[0] || '测试版更新',
                        changes: lines.slice(1),
                    };
                });
            }
        } catch (error) {
            console.warn('[A.U.T.O Card Studio] 测试分支提交记录读取失败。', error);
        }
    }
    return [];
}

async function collectPublishedUpdateEntries(latestVersion) {
    try {
        const manifest = await fetchUpdateManifest(`auto-card-studio-v${latestVersion}`);
        const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
        return releases
            .filter(entry => /^\d+\.\d+\.\d+$/.test(String(entry?.version || '')))
            .filter(entry => compareVersions(entry.version, AUTO_CARD_STUDIO_VERSION) > 0 && compareVersions(entry.version, latestVersion) <= 0)
            .sort((left, right) => compareVersions(left.version, right.version))
            .map(entry => normalizeManifestEntry(entry, `v${entry.version}`));
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 正式版更新说明读取失败。', error);
        return [];
    }
}

async function collectInstalledReleaseEntry(version) {
    try {
        const manifest = await fetchUpdateManifest(`auto-card-studio-v${version}`);
        const entry = (Array.isArray(manifest.releases) ? manifest.releases : [])
            .find(item => String(item?.version || '') === version);
        return entry ? [normalizeManifestEntry(entry, `v${version}`)] : [];
    } catch (error) {
        console.warn('[A.U.T.O Card Studio] 更新完成公告读取失败。', error);
        return [];
    }
}

async function showInstalledUpdateNotes(version) {
    if (version !== AUTO_CARD_STUDIO_VERSION) return;
    await requestOpenStudio();
    const entries = await collectInstalledReleaseEntry(version);
    await showUpdateNotes({
        currentLabel: `v${version}`,
        targetLabel: '已安装',
        entries,
        completed: true,
    });
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
            button.title = `检查更新（当前 ${studioVersionLabel()}）`;
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
        if (TEST_BRANCH_UPDATE_MODE) {
            // 先读取分支最新提交，再加载不可变的提交地址，彻底绕开分支 CDN 缓存。
            const branchResponse = await hostWindow.fetch(TEST_BRANCH_API_URL, {
                cache: 'no-store',
                headers: { Accept: 'application/vnd.github+json' },
            });
            if (!branchResponse.ok) throw new Error(`测试分支检查失败：HTTP ${branchResponse.status}`);
            const revision = String((await branchResponse.json())?.commit?.sha || '').trim();
            if (!/^[0-9a-f]{40}$/i.test(revision)) throw new Error('测试分支返回的提交编号无效');

            const scriptResponse = await hostWindow.fetch(TEST_SCRIPT_URL_BY_REF(revision), { cache: 'no-store' });
            if (!scriptResponse.ok) throw new Error(`测试脚本尚未就绪：HTTP ${scriptResponse.status}`);
            if (localStorage.getItem(TEST_BRANCH_PIN_KEY) === revision) {
                showUpdateFeedback(`已是测试版最新构建 ${revision.slice(0, 7)}`, 'current');
                notify('success', `当前已是测试版最新构建 ${revision.slice(0, 7)}。`);
                return;
            }

            const currentRevision = String(localStorage.getItem(TEST_BRANCH_PIN_KEY) || '').trim();
            const entries = await collectTestUpdateEntries(currentRevision, revision);
            const confirmed = await showUpdateNotes({
                currentLabel: studioVersionLabel(),
                targetLabel: `测试构建 ${revision.slice(0, 7)}`,
                entries,
            });
            if (!confirmed) {
                showUpdateFeedback('已暂缓本次更新', 'current');
                return;
            }

            localStorage.setItem(TEST_BRANCH_PIN_KEY, revision);
            hostWindow.sessionStorage.setItem(TEST_BRANCH_UPDATE_KEY, revision);
            showUpdateFeedback(`正在载入测试构建 ${revision.slice(0, 7)}…`, 'checking', 0);
            notify('info', `正在载入测试版 ${revision.slice(0, 7)}。`);
            hostWindow.setTimeout(() => hostWindow.location.reload(), 650);
            return;
        }

        // 手动检查明确绕过六小时缓存，保证用户看到远端最新结果。
        const latestVersion = await getLatestPublishedVersion(true);
        if (compareVersions(latestVersion, AUTO_CARD_STUDIO_VERSION) <= 0) {
            showUpdateFeedback(`已是最新版 v${AUTO_CARD_STUDIO_VERSION}`, 'current');
            notify('success', `当前已是最新版 v${AUTO_CARD_STUDIO_VERSION}。`);
            return;
        }

        const scriptResponse = await hostWindow.fetch(VERSIONED_SCRIPT_URL(latestVersion), { cache: 'no-store' });
        if (!scriptResponse.ok) throw new Error(`新版脚本尚未就绪：HTTP ${scriptResponse.status}`);
        const entries = await collectPublishedUpdateEntries(latestVersion);
        const confirmed = await showUpdateNotes({
            currentLabel: `v${AUTO_CARD_STUDIO_VERSION}`,
            targetLabel: `v${latestVersion}`,
            entries,
        });
        if (!confirmed) {
            showUpdateFeedback('已暂缓本次更新', 'current');
            return;
        }
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

async function maybeOfferAutomaticUpdate() {
    if (!shell?.classList.contains('is-open')) return;
    try {
        // 复用脚本加载时已经启动的后台扫描，避免打开创作台时重复等待网络请求。
        if (backgroundUpdatePromise) await backgroundUpdatePromise;
        if (pendingAutomaticUpdate) {
            pendingAutomaticUpdate = null;
            await checkForUpdatesManually();
        }
    } catch (error) {
        // 自动检查失败不打断创作；用户仍可通过顶部按钮手动检查。
        console.warn('[A.U.T.O Card Studio] 自动更新检查失败。', error);
    }
}

async function scanForUpdatesInBackground() {
    if (automaticUpdateChecked) return pendingAutomaticUpdate;
    automaticUpdateChecked = true;
    try {
        if (TEST_BRANCH_UPDATE_MODE) {
            const response = await hostWindow.fetch(TEST_BRANCH_API_URL, {
                cache: 'no-store',
                headers: { Accept: 'application/vnd.github+json' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const revision = String((await response.json())?.commit?.sha || '').trim();
            if (!/^[0-9a-f]{40}$/i.test(revision)) throw new Error('测试分支返回的提交编号无效');
            const loadedRevision = String(localStorage.getItem(TEST_BRANCH_PIN_KEY) || '').trim();
            if (revision !== loadedRevision) pendingAutomaticUpdate = { mode: 'test', revision };
        } else {
            // 每次脚本加载都绕过上一次会话缓存，真正向版本目录查询一次。
            const latestVersion = await getLatestPublishedVersion(true);
            if (compareVersions(latestVersion, AUTO_CARD_STUDIO_VERSION) > 0) {
                pendingAutomaticUpdate = { mode: 'release', version: latestVersion };
            }
        }

        if (pendingAutomaticUpdate) {
            const button = shell?.querySelector('#acs-check-update');
            if (button) {
                button.classList.add('is-current');
                button.title = '发现新版本，点击查看更新内容';
                button.setAttribute('aria-label', '发现新版本，点击查看更新内容');
            }
        }
        return pendingAutomaticUpdate;
    } catch (error) {
        // 后台扫描静默失败，不显示红色提示，也不影响创作台加载和手动检查。
        console.warn('[A.U.T.O Card Studio] 后台版本扫描失败。', error);
        return null;
    }
}

function startStudioRuntime() {
    hostWindow[OPEN_HANDLER_KEY] = requestOpenStudio;
    document.addEventListener('keydown', handleHostKeydown);
    hostWindow.addEventListener('resize', handleTourResize);
    hostWindow.visualViewport?.addEventListener('resize', handleTourResize);
    migrateToolbarLauncherName();
    eventOn(getButtonEvent(TOOLBAR_LAUNCHER_NAME), requestOpenStudio);
    // 首次升级时旧按钮可能已经渲染并持有旧事件，保留一次兼容绑定。
    eventOn(getButtonEvent(LEGACY_TOOLBAR_LAUNCHER_NAME), requestOpenStudio);
    installStudioLaunchers();
    // 不阻塞脚本入口与创作台启动；每次载入脚本都独立扫描一次最新版。
    backgroundUpdatePromise = new Promise(resolve => {
        hostWindow.setTimeout(() => resolve(scanForUpdatesInBackground()), 0);
    });
    window.addEventListener('pagehide', cleanupScriptRuntime, { once: true });
    const installedUpdateVersion = String(hostWindow.sessionStorage.getItem(UPDATE_REOPEN_KEY) || '').trim();
    if (installedUpdateVersion) {
        hostWindow.sessionStorage.removeItem(UPDATE_REOPEN_KEY);
        // 正式版更新完成后首次打开也展示一次公告，避免刷新后用户看不到本次变化。
        hostWindow.setTimeout(() => { void showInstalledUpdateNotes(installedUpdateVersion); }, 0);
    }
}

async function startStudioWithAutoUpdate() {
    if (TEST_BRANCH_UPDATE_MODE) {
        const requestedRevision = String(
            hostWindow.sessionStorage.getItem(TEST_BRANCH_UPDATE_KEY)
            || localStorage.getItem(TEST_BRANCH_PIN_KEY)
            || '',
        ).trim();
        hostWindow.sessionStorage.removeItem(TEST_BRANCH_UPDATE_KEY);
        if (/^[0-9a-f]{40}$/i.test(requestedRevision) && !String(import.meta.url).includes(`@${requestedRevision}/`)) {
            try {
                await import(TEST_SCRIPT_URL_BY_REF(requestedRevision));
                return;
            } catch (error) {
                console.warn('[A.U.T.O Card Studio] 测试分支更新加载失败，继续使用当前脚本。', error);
            }
        }
        // 测试版只跟随测试分支，不参与正式版自动更新。
        startStudioRuntime();
        return;
    }

    // 正式版在创作台打开后再检查；发现更新时先展示完整更新内容，由用户确认后加载。
    startStudioRuntime();
}

void startStudioWithAutoUpdate();
