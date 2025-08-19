const vscode = require("vscode");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const fs = require("fs");
const path = require("path");

const { getDataForUse } = require("./utils/getDataForUse.js");
const { getDataForLang } = require("./utils/getDataForLang.js");
const { saveDataForLang } = require("./utils/saveDataForLang.js");

class I18nManager {
    constructor(context) {
        this.context = context;
        this.extractI18nData = [];
        this.langI18nData = [];
        this.originalLangI18nData = [];
        this.langFilePath = ""; // 用于存储语言文件路径
        this.extractFilePath = ""; // 用于存储提取文件路径
        this.handleType = "";
        this.initCommands(context);
    }

    initCommands(context) {
        const extractCommand = vscode.commands.registerCommand(
            "vscode-i18n.extractI18n",
            async () => {
                // 添加前置选项
                const options = ["sis", "myth"];
                const selectedOption = await vscode.window.showQuickPick(
                    options,
                    {
                        placeHolder: "请选择执行路径",
                    }
                );
                if (!selectedOption) {
                    return; // 用户取消选择
                }
                this.handleType = selectedOption;

                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage(
                        "请打开一个文件后再尝试提取 i18n 文案。"
                    );
                    return;
                }
                const filePath = editor.document.uri.fsPath;
                const dir = path.dirname(filePath);
                let langFilePath = path.join(dir, "lang.ts");
                this.extractI18nData = getDataForUse(filePath, this.handleType);
                // 如果存在语言文件，则读取其中的数据
                if (langFilePath) {
                    this.langI18nData = getDataForLang(
                        langFilePath,
                        this.handleType
                    );
                    // 原始数据存储
                    this.originalLangI18nData = JSON.parse(
                        JSON.stringify(this.langI18nData)
                    );
                }
                // 不默认合并数据，而是将两种数据独立传递给 Webview
                this.openI18nManagerWebview(filePath, langFilePath);
            }
        );

        const openWebviewCommand = vscode.commands.registerCommand(
            "vscode-i18n.openI18nManager",
            () => {
                this.openI18nManagerWebview();
            }
        );

        context.subscriptions.push(extractCommand);
        context.subscriptions.push(openWebviewCommand);
    }

    async editEntry(key, panel) {
        // Find the entry with the matching key
        const entry = this.extractI18nData.find((item) => item.key === key);

        if (!entry) {
            vscode.window.showErrorMessage(`未找到 key 为 "${key}" 的条目`);
            return;
        }

        // Show input boxes for editing the Chinese and English values
        const zhValue = await vscode.window.showInputBox({
            prompt: `编辑 "${key}" 的中文值`,
            value: entry.zh,
            placeHolder: "请输入中文值",
        });

        if (zhValue === undefined) {
            // User cancelled the input
            return;
        }

        const enValue = await vscode.window.showInputBox({
            prompt: `编辑 "${key}" 的英文值`,
            value: entry.en,
            placeHolder: "请输入英文值",
        });

        if (enValue === undefined) {
            // User cancelled the input
            return;
        }

        // Update the entry with the new values
        entry.zh = zhValue;
        entry.en = enValue;
        // Also update the value field for backward compatibility
        entry.value = zhValue;

        // Transform extractI18nData to match the new table structure
        const tableEntries = this.extractI18nData.map((item) => ({
            key: item.key,
            zh: item.zh,
            en: item.en,
        }));

        // Send the updated data to the webview
        panel.webview.postMessage({
            command: "updateEntries",
            entries: tableEntries,
        });

        vscode.window.showInformationMessage(`已更新 "${key}" 的值`);
    }

    /**
     * 删除条目
     * @param {Object} message 要删除的条目的键
     * @param {Object} panel Webview panel 对象
     */
    deleteEntry(message, panel) {
        const { key, type } = message;
        try {
            if (type === "use") {
                this.extractI18nData = this.extractI18nData.filter(
                    (item) => item.key !== key
                );
                // 发送更新后的数据到 Webview
                panel.webview.postMessage({
                    command: "updateEntries",
                    entries: this.extractI18nData,
                    langData: this.langI18nData,
                });
            } else {
                this.langI18nData = this.langI18nData.filter(
                    (item) => item.key !== key
                );
                panel.webview.postMessage({
                    command: "updateEntries",
                    entries: this.extractI18nData,
                    langData: this.langI18nData,
                });
                panel.webview.postMessage({
                    command: "updateLangEntries",
                    langData: this.langI18nData,
                });
            }

            vscode.window.showInformationMessage(
                `已删除 key 为 "${key}" 的条目`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`删除条目失败: ${error.message}`);
        }
    }

    /**
     * 从 input 编辑条目
     * @param {string} key 要编辑的条目的键
     * @param {string} value 新的值
     * @param {string} lang 语言 (zh 或 en)
     * @param {Object} panel Webview panel 对象
     */
    editEntryFromInput(key, value, lang, panel) {
        try {
            // 更新 langI18nData
            const langEntry = this.langI18nData.find(
                (item) => item.key === key
            );
            if (langEntry) {
                if (lang === "zh") {
                    langEntry.zh = value;
                } else if (lang === "en") {
                    langEntry.en = value;
                }
            }

            // 发送更新后的数据到 Webview
            panel.webview.postMessage({
                command: "updateEntries",
                entries: this.extractI18nData,
                langData: this.langI18nData,
            });

            panel.webview.postMessage({
                command: "updateLangEntries",
                langData: this.langI18nData,
            });

            // 不显示信息消息，因为这是自动编辑
        } catch (error) {
            vscode.window.showErrorMessage(
                `从 input 编辑条目失败: ${error.message}`
            );
        }
    }

    /**
     * 合并语言文件数据与当前 extractI18nData
     * @param {Object} panel Webview panel 对象
     */
    mergeLangData(panel) {
        const langData = JSON.parse(JSON.stringify(this.langI18nData));
        this.extractI18nData.forEach((item) => {
            const index = langData.findIndex((e) => {
                if (e.key === item.key) {
                    e.value = item.value;
                    return true;
                }
                return false;
            });
            if (index === -1) {
                langData.push({
                    ...item,
                    zh: item.value,
                    en: item.value + "_en",
                });
            }
        });
        this.langI18nData = langData;
        this.extractI18nData = [];
        panel.webview.postMessage({
            command: "updateEntries",
            entries: this.extractI18nData,
            langData: this.langI18nData,
        });
        panel.webview.postMessage({
            command: "updateLangEntries",
            langData,
        });
        vscode.window.showInformationMessage("数据合并完成");
    }

    compareLangArrays(a, b) {
        const result = {
            push: [],
            zhEdit: [],
            enEdit: [],
            delete: [],
        };

        // 创建键集合
        const aKeys = new Set(a.map((item) => item.key));
        const bKeys = new Set(b.map((item) => item.key));

        // 创建快速查找的映射
        const aMap = new Map(a.map((item) => [item.key, item]));
        const bMap = new Map(b.map((item) => [item.key, item]));

        // 找出需要push的项（在b但不在a）
        for (const key of bKeys) {
            if (!aKeys.has(key)) {
                result.push.push(bMap.get(key));
            }
        }

        // 找出需要delete的项（在a但不在b）
        for (const key of aKeys) {
            if (!bKeys.has(key)) {
                result.delete.push(aMap.get(key));
            }
        }

        // 找出共同key但值不同的项
        const commonKeys = new Set([...aKeys].filter((key) => bKeys.has(key)));
        for (const key of commonKeys) {
            const aItem = aMap.get(key);
            const bItem = bMap.get(key);

            if (aItem.zh !== bItem.zh) {
                result.zhEdit.push(bItem);
            }
            if (aItem.en !== bItem.en) {
                result.enEdit.push(bItem);
            }
        }
        return result;
    }

    /**
     * 将 langI18nData 写回到语言文件中
     */
    handleSave(panel) {
        const result = this.compareLangArrays(
            this.originalLangI18nData,
            this.langI18nData
        );
        const bol = saveDataForLang({
            result,
            type: this.handleType,
            langFilePath: this.langFilePath,
        });

        if (bol) {
            this.refreshData(panel);
        }
    }

    /**
     * 刷新数据 - 重新读取提取文件和语言文件的数据
     */
    refreshData(panel) {
        try {
            // 重新读取提取文件的数据
            if (this.extractFilePath && fs.existsSync(this.extractFilePath)) {
                this.extractI18nData = getDataForUse(
                    this.extractFilePath,
                    this.handleType
                );
            }

            // 重新读取语言文件的数据
            if (this.langFilePath && fs.existsSync(this.langFilePath)) {
                this.langI18nData = getDataForLang(
                    this.langFilePath,
                    this.handleType
                );
                this.originalLangI18nData = JSON.parse(
                    JSON.stringify(this.langI18nData)
                );
            }
            // 发送更新后的数据到 Webview
            panel.webview.postMessage({
                command: "updateEntries",
                entries: this.extractI18nData,
                langData: this.langI18nData,
            });

            panel.webview.postMessage({
                command: "updateLangEntries",
                langData: this.langI18nData,
                merge: false,
            });

            vscode.window.showInformationMessage("数据刷新成功");
        } catch (error) {
            vscode.window.showErrorMessage(`刷新数据失败: ${error.message}`);
        }
    }

    /**
     * 在文件内容中替换对象
     * @param {string} fileContent 文件内容
     * @param {Object} node AST 节点
     * @param {string} newObject 新对象的字符串表示
     * @returns {string} 更新后的文件内容
     */
    replaceObjectInFile(fileContent, node, newObject) {
        // 计算节点在文件中的位置
        const start = node.init.start;
        const end = node.init.end;

        // 替换节点对应的内容
        return (
            fileContent.substring(0, start) +
            newObject +
            fileContent.substring(end)
        );
    }

    openI18nManagerWebview(extractPath = "", langFilePath = "") {
        // Store the file paths
        this.extractFilePath = extractPath;
        this.langFilePath = langFilePath;
        // Create and show a webview panel
        const panel = vscode.window.createWebviewPanel(
            "i18nManager", // Identifies the type of the webview. Used internally
            "i18n 管理器", // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in
            {
                enableScripts: true, // Enable scripts in the webview
                retainContextWhenHidden: true, // Keep the context when hidden
            }
        );

        // Read the HTML content from file
        const htmlPath = path.join(
            this.context.extensionPath,
            "resources",
            "i18n-manager.html"
        );
        let htmlContent = fs.readFileSync(htmlPath, "utf-8");

        // Set the webview's initial html content
        panel.webview.html = htmlContent;
        // Send the initial data to the webview
        panel.webview.postMessage({
            command: "updateEntries",
            entries: this.extractI18nData,
            langData: this.langI18nData,
        });

        panel.webview.postMessage({
            command: "updateExtractPath",
            extractPath,
        });
        panel.webview.postMessage({
            command: "updateLangPath",
            langFilePath,
        });

        // Send langI18nData to the webview
        panel.webview.postMessage({
            command: "updateLangEntries",
            langData: this.langI18nData,
        });

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case "refresh":
                        // Refresh functionality
                        this.refreshData(panel);
                        return;
                    case "add":
                        // Add functionality - for now just show an info message
                        vscode.window.showInformationMessage("添加功能待实现");
                        return;
                    case "edit":
                        // Edit functionality
                        this.editEntry(message.key, panel);
                        return;
                    case "delete":
                        // Delete functionality
                        this.deleteEntry(message, panel);
                        return;
                    case "merge":
                        this.mergeLangData(panel);
                        return;
                    case "switchLangPath":
                        vscode.window.showInformationMessage(
                            "更换文件指向功能待实现"
                        );
                        return;
                    case "save":
                        this.handleSave(panel);
                        return;
                    case "editFromInput":
                        // Edit functionality from input
                        this.editEntryFromInput(
                            message.key,
                            message.value,
                            message.lang,
                            panel
                        );
                        return;
                    case "log":
                        console.log(message.data);
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }
}

function activate(context) {
    // Create the I18nManager instance
    const i18nManager = new I18nManager(context);

    // Store the instance in the context for later use
    context.i18nManager = i18nManager;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
