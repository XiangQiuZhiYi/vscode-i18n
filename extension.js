const vscode = require("vscode");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const parseVue = require("@vue/compiler-sfc");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const fs = require("fs");
const path = require("path");

class I18nManager {
    constructor(context) {
        this.context = context;
        this.extractI18nData = [];
        this.langI18nData = [];
        this.originalLangI18nData = [];
        this.langFilePath = ""; // 用于存储语言文件路径
        this.extractFilePath = ""; // 用于存储提取文件路径
        this.initCommands(context);
    }

    initCommands(context) {
        const extractCommand = vscode.commands.registerCommand(
            "vscode-i18n.extractI18n",
            async () => {
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
                if (!fs.existsSync(langFilePath)) {
                    langFilePath = false;
                }
                this.extractI18nData = this.extractI18nFromFile(filePath);

                // 如果存在语言文件，则读取其中的数据
                if (langFilePath) {
                    this.langI18nData =
                        this.extractDataFromLangFile(langFilePath);
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
     * 读取并解析语言文件，提取其中的中英文数据
     * @param {string} langFilePath 语言文件路径
     * @returns {Array} 包含中英文数据的数组
     */
    extractDataFromLangFile(langFilePath) {
        if (!langFilePath || !fs.existsSync(langFilePath)) {
            return [];
        }

        try {
            // 读取文件内容
            const fileContent = fs.readFileSync(langFilePath, "utf-8");

            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });

            // 初始化 cn 和 en 对象
            const cnObj = {};
            const enObj = {};

            // 使用 @babel/traverse 遍历 AST
            traverse(ast, {
                VariableDeclarator(path) {
                    // 查找 cn 和 en 变量声明
                    if (path.node.id.name === "cn") {
                        // 提取 cn 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            path.node.init.properties.forEach((prop) => {
                                if (
                                    prop.key &&
                                    prop.value &&
                                    prop.value.type === "StringLiteral"
                                ) {
                                    cnObj[prop.key.name || prop.key.value] =
                                        prop.value.value;
                                }
                            });
                        }
                    } else if (path.node.id.name === "en") {
                        // 提取 en 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            path.node.init.properties.forEach((prop) => {
                                if (
                                    prop.key &&
                                    prop.value &&
                                    prop.value.type === "StringLiteral"
                                ) {
                                    enObj[prop.key.name || prop.key.value] =
                                        prop.value.value;
                                }
                            });
                        }
                    }
                },
            });
            // 合并数据
            const result = [];
            for (const key in cnObj) {
                result.push({
                    key: key,
                    value: cnObj[key],
                    filePath: langFilePath,
                    zh: cnObj[key] || "",
                    en: enObj[key] || "",
                });
            }
            for (const key in enObj) {
                if (result.findIndex((item) => item.key === key) === -1) {
                    result.push({
                        key: key,
                        value: cnObj[key],
                        filePath: langFilePath,
                        zh: cnObj[key] || "",
                        en: enObj[key] || "",
                    });
                }
            }

            return result;
        } catch (error) {
            vscode.window.showErrorMessage(
                `解析语言文件失败: ${error.message}`
            );
            return [];
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
    saveLangData(panel) {
        if (!this.langFilePath) {
            vscode.window.showErrorMessage("未指定语言文件路径");
            return;
        }
        try {
            // 读取原始文件内容
            const fileContent = fs.readFileSync(this.langFilePath, "utf-8");

            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });

            const result = this.compareLangArrays(
                this.originalLangI18nData,
                this.langI18nData
            );
            // 使用 @babel/traverse 遍历 AST，找到并更新 cn 和 en 对象
            traverse(ast, {
                VariableDeclarator(path) {
                    // 查找 cn 和 en 变量声明
                    if (path.node.id.name === "cn") {
                        // 更新 cn 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            const properties = path.node.init.properties;

                            result.push.forEach((item) => {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.zh)
                                    )
                                );
                            });
                            result.zhEdit.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    console.log(index, item.zh);

                                    properties[index].value.value = item.zh;
                                }
                            });
                            result.delete.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties.splice(index, 1);
                                }
                            });

                            console.log(properties);
                        }
                    } else if (path.node.id.name === "en") {
                        // 更新 en 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            const properties = path.node.init.properties;

                            result.push.forEach((item) => {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.en)
                                    )
                                );
                            });
                            result.zhEdit.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties[index].value.value = item.en;
                                }
                            });
                            result.delete.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties.splice(index, 1);
                                }
                            });
                        }
                    }
                },
            });
            console.log(ast);

            // 使用 @babel/generator 生成更新后的代码
            const updatedCode = generate(ast, {
                retainLines: false, // 不保持原始行号，使用格式化选项
                compact: false, // 不压缩代码
                concise: false, // 不使用简洁格式
                jsescOption: {
                    minimal: true, // 避免将中文转换为 Unicode 编码
                },
                indent: {
                    // 设置缩进
                    style: "  ", // 使用两个空格缩进
                    base: 0, // 基础缩进为0
                },
                comments: true, // 保留注释
            }).code;

            // 将更新后的代码写回文件
            fs.writeFileSync(this.langFilePath, updatedCode, "utf-8");

            vscode.window.showInformationMessage("语言文件保存成功");

            this.refreshData(panel);
        } catch (error) {
            vscode.window.showErrorMessage(
                `保存语言文件失败: ${error.message}`
            );
        }
    }

    /**
     * 刷新数据 - 重新读取提取文件和语言文件的数据
     */
    refreshData(panel) {
        try {
            // 重新读取提取文件的数据
            if (this.extractFilePath && fs.existsSync(this.extractFilePath)) {
                this.extractI18nData = this.extractI18nFromFile(
                    this.extractFilePath
                );
            }

            // 重新读取语言文件的数据
            if (this.langFilePath && fs.existsSync(this.langFilePath)) {
                this.langI18nData = this.extractDataFromLangFile(
                    this.langFilePath
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
                        this.saveLangData(panel);
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

    extractI18nFromFile(filePath) {
        try {
            const ext = path.extname(filePath);
            let ast;
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const i18nEntries = [];

            if (ext === ".vue") {
                const { descriptor } = parseVue.parse(fileContent);
                if (descriptor.template) {
                    const templateContent = descriptor.template.content;
                    const tCallRegex = /\$t\(['"]([^'"]+)['"]\)/g;
                    let match;
                    while (
                        (match = tCallRegex.exec(templateContent)) !== null
                    ) {
                        const key = match[1];
                        i18nEntries.push({
                            key,
                            value: key,
                            filePath: filePath,
                            zh: "",
                            en: "",
                        });
                    }
                }
                if (descriptor.script) {
                    const scriptContent =
                        descriptor.script?.content ||
                        descriptor.scriptSetup?.content ||
                        "";
                    ast = parser.parse(scriptContent, {
                        sourceType: "module",
                        plugins: ["jsx", "typescript"],
                        allowUndeclaredExports: true,
                    });
                }
            } else {
                ast = parser.parse(fileContent, {
                    sourceType: "module",
                    plugins: [
                        "jsx",
                        "typescript",
                        "decorators-legacy", // 或 "decorators" 根据您的装饰器语法版本
                        "classProperties", // 如果使用类属性
                        "objectRestSpread", // 如果使用对象展开
                    ],
                    tokens: true, // 可选：保留token信息
                    ranges: true, // 可选：保留范围信息
                });
            }
            if (ast) {
                traverse(ast, {
                    CallExpression(path) {
                        if (
                            path.node.callee.type === "Identifier" &&
                            path.node.callee.name === "$t"
                        ) {
                            if (
                                path.node.arguments.length > 0 &&
                                path.node.arguments[0].type === "StringLiteral"
                            ) {
                                const key = path.node.arguments[0].value;
                                i18nEntries.push({
                                    key,
                                    value: key,
                                    filePath: filePath,
                                    zh: "",
                                    en: "",
                                });
                            }
                        } else if (
                            path.node.callee.type === "MemberExpression" &&
                            path.node.callee.property.name === "$t"
                        ) {
                            const key = path.node.arguments[0].value;
                            i18nEntries.push({
                                key,
                                value: key,
                                filePath: filePath,
                                zh: "",
                                en: "",
                            });
                        }
                    },
                });
            }
            return i18nEntries;
        } catch (error) {
            vscode.window.showErrorMessage(`解析文件失败: ${error.message}`);
            return [];
        }
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
