const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");

function getDataForLang(langFilePath, type) {
    switch (type) {
        case "sis":
            return sis(langFilePath);
        case "myth":
            return myth(langFilePath);
        default:
            return [];
    }
}

function sis(langFilePath) {
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
        vscode.window.showErrorMessage(`解析语言文件失败: ${error.message}`);
        return [];
    }
}

function myth(filePath) {
    const dir = path.dirname(filePath);
    let langFilePathCn = path.join(dir, "lang.cn.js");
    let langFilePathEn = path.join(dir, "lang.en.js");
    console.log("langFilePathCn", langFilePathCn, langFilePathEn);
    
    const cnObj = {};
    const enObj = {};
    try {

        if (langFilePathCn && fs.existsSync(langFilePathCn)) {
            const fileContent = fs.readFileSync(langFilePathCn, "utf-8");

            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });

            // 使用 @babel/traverse 遍历 AST
            traverse(ast, {
                VariableDeclarator(path) {
                    // 查找 cn 和 en 变量声明
                    if (path.node.id.name === "$lang") {
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
                    }
                },
            });
        }

        if (langFilePathEn && fs.existsSync(langFilePathEn)) {
            const fileContent = fs.readFileSync(langFilePathEn, "utf-8");

            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });

            // 使用 @babel/traverse 遍历 AST
            traverse(ast, {
                VariableDeclarator(path) {
                    if (path.node.id.name === "$lang") {
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
        }

        // 合并数据
        const result = [];
        for (const key in cnObj) {
            result.push({
                key: key,
                value: cnObj[key],
                filePath: langFilePathCn,
                zh: cnObj[key] || "",
                en: enObj[key] || "",
            });
        }
        for (const key in enObj) {
            if (result.findIndex((item) => item.key === key) === -1) {
                result.push({
                    key: key,
                    value: cnObj[key],
                    filePath: langFilePathEn,
                    zh: cnObj[key] || "",
                    en: enObj[key] || "",
                });
            }
        }
        return result;
    } catch (error) {
        vscode.window.showErrorMessage(`解析语言文件失败: ${error.message}`);
        return [];
    }
}

module.exports = { getDataForLang };
