# dsh-session-rename

让 AI 能重命名自己会话的 DSH 插件。

## 它做什么

新增一个模型可调用的工具 `session_rename`：

| 参数 | 类型 | 说明 |
|---|---|---|
| `title` | string（必填） | 新标题：一行短语，用用户的语言说明这个会话在做什么 |

工具内部调用宿主已挂载的 `sessionTitle` 服务：

```js
ctx.sessionTitle.rename(exec.agent.session, title)
```

这与 Web UI 改名对话框走的是**同一条路**（`dsh-api-session-controller` 的 `rename` 内部同样只调它），因此：

- 标题经归一化（去控制字符、压空白、按 UTF-8 字节截断）后落成一条 `session/title` 事件，来源为 `user`；
- 该标题**钉住**：DSH 自动标题生成对这个会话停止，后续用户消息不再触发自动重命名；
- GUI 标题通过会话投影/事件流更新，不需要额外通知。

## 为什么需要它

DSH 本身具备重命名会话的能力，但**没有暴露成 AI 可调用的工具**：

- `dsh-tool-cordis` 只有只读 Inspect（`cordis_inspect_list` / `cordis_inspect_query`），不能当业务服务调；
- 改名入口只有 GUI 对话框；
- 命令行没有对应命令。

所以在本插件之前，AI 无法自行改名，只能由用户在界面上改。本插件补上的就是这个缺口。

## 作用域

只改**当前会话**（工具名与参数都不接受会话 id）。想扩展到"可改任意会话"只需加一个可选 `sessionId` 参数，并改用 `ctx.sessions.get(id)` 取活会话。

## 安装

由 DSH 的插件管理流程安装，不要手写 profile 的 `package.json` / `cordis.patch.yml`：

```
plugin_manager { action: "install_bundle", target: "<本目录绝对路径>" }
```

插件是纯 Host 插件，**零依赖、零构建**：`index.js` 不 import 任何包，直接注册符合 `ToolDefinition` 契约的普通对象，因此不存在依赖解析失败的风险。

## 依赖

`inject = ["tools", "sessionTitle"]`。若某部署没挂载 `sessionTitle`，插件保持未激活（不抛错），工具不出现。

## 卸载 / 回滚

```
plugin_manager { action: "remove_bundle", target: "dsh-session-rename" }
```

移除后工具即消失，会话标题不受影响（已写入的 `session/title` 事件仍在日志里）。

## 自检

```
node selftest.mjs
```

离线验证工具定义形状与全部错误路径，不需要运行时。
