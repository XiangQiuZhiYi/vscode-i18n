const vscode = require("vscode");
const parser = require("@babel/parser");
const parseVue = require("@vue/compiler-sfc");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");

function getDataForUse(filePath, type) {
    switch (type) {
        case "sis":
            return sis(filePath);
        case "myth":
            return myth(filePath);
        default:
            return [];
    }
}

function sis(filePath) {
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
                while ((match = tCallRegex.exec(templateContent)) !== null) {
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

function myth(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const regex = /\$lang\[['"`](.*?)['"`]\]/g;

        const matches = [];
        let match;
        while ((match = regex.exec(fileContent)) !== null) {
            matches.push({
                key: match[1],
                value: match[1],
                filePath: filePath,
                zh: "",
                en: "",
            });
        }
        return matches;
        
    } catch (error) {
        vscode.window.showErrorMessage(`解析文件失败: ${error.message}`);
        return [];
    }
}

module.exports = { getDataForUse };
