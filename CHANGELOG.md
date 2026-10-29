# 更新记录（dsh-session-rename）

> 查「现在怎么用」看 `README.md`；本文件只记版本之间的差异。新增版本写在本文件顶部。
> 1.0.0 之前的开发过程不逐条回溯，需要时翻 git 历史。

---

## v1.0.1（2026-10-29：声明宿主 DSH 版本要求）

`package.json` 补 `engines.dsh = ">=0.2.0-rc.1"`，与 `dsh-werewolf-dealer` 同款口径。

- **为什么**：插件市场的「宿主要求」读 manifest 的 `engines.dsh`（没有再读 `dsh.engines.dsh`，都没有才回落 `@deepseek-ai/*` peer 范围）。不声明时市场行只能显示「未声明宿主要求」，安装预检也没有东西可判断。
- **影响面**：只改包元数据 —— `index.js`、`cordis.patch.yml`、`locale/` 与 `selftest.mjs` 零改动，`session_rename` 的注册、参数与全部错误路径与 1.0.0 一致。
- **兼容性**：`>=0.2.0-rc.1` 覆盖 DSH 0.2.x 全线（含 `0.2.2-alpha.*` 这类预发布版本，市场/安装预检按 `includePrerelease` 口径判定）。

## v1.0.0（首次发布）

新增模型可调用的 `session_rename` 工具：内部调用宿主已挂载的 `sessionTitle.rename()`，与 Web UI 改名对话框同一条路径；标题归一化后落成 `session/title` 事件并钉住，自动标题生成对该会话停止。纯 Host 插件、零依赖、零构建。
